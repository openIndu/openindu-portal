import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { chatApi, STORAGE_KEYS } from "@/api";

function response(body: string | null, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    body:
      body === null
        ? null
        : new ReadableStream({
            start(controller) {
              controller.enqueue(new TextEncoder().encode(body));
              controller.close();
            },
          }),
    json: async () => JSON.parse(body ?? "null"),
  } as Response;
}

const variants = [
  {
    name: "single question",
    call: (handlers: Parameters<typeof chatApi.stream>[1]) =>
      chatApi.stream({ message: "hello" }, handlers),
    path: "/chat",
  },
  {
    name: "saved session",
    call: (handlers: Parameters<typeof chatApi.stream>[1]) =>
      chatApi.streamSession(7, "hello", handlers),
    path: "/chat/sessions/7/stream",
  },
];

describe.each(variants)("chat stream: $name", ({ call, path }) => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it("sends the request and delivers split SSE frames in order", async () => {
    localStorage.setItem(STORAGE_KEYS.token, "access");
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        response(
          'event: sources\ndata: [{"document_name":"manual.pdf","page":2}]\n\n' +
            'event: mode\ndata: {"mode":"grounded"}\n\n' +
            'event: delta\ndata: {"text":"Hello"}\n\n' +
            'event: done\ndata: {"finish_reason":"stop"}\n\n',
        ),
      );
    vi.stubGlobal("fetch", fetchMock);
    const onSources = vi.fn();
    const onMode = vi.fn();
    const onDelta = vi.fn();
    const onDone = vi.fn();
    await call({ onSources, onMode, onDelta, onDone, filters: { brand: "Siemens" } });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(fetchMock.mock.calls[0][0]).toBe(`/api/v1${path}`);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer access");
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).message).toBe("hello");
    expect(onSources).toHaveBeenCalledWith([{ document_name: "manual.pdf", page: 2 }]);
    expect(onMode).toHaveBeenCalledWith("grounded");
    expect(onDelta).toHaveBeenCalledWith("Hello");
    expect(onDone).toHaveBeenCalledWith({ finish_reason: "stop" });
  });

  it("reports a network failure without throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    const onError = vi.fn();
    await expect(call({ onError })).resolves.toBeUndefined();
    expect(onError).toHaveBeenCalledOnce();
  });

  it.each([401, 403, 429, 500])("reports HTTP %i without reading a stream", async (status) => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response('{"detail":"server detail"}', status)),
    );
    const onError = vi.fn();
    await call({ onError });
    expect(onError).toHaveBeenCalledOnce();
    if (status === 500) expect(onError).toHaveBeenCalledWith("server detail");
    else expect(onError.mock.calls[0][0]).not.toBe("server detail");
  });

  it("handles a successful response with no body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response(null)));
    const onError = vi.fn();
    await call({ onError });
    expect(onError).toHaveBeenCalledOnce();
  });

  it("ignores malformed frames and reports an SSE error", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          response(
            "event: delta\ndata: {bad}\n\n" +
              "event: sources\ndata: {bad}\n\n" +
              "event: mode\ndata: {bad}\n\n" +
              "event: done\ndata: {bad}\n\n" +
              "event: error\ndata: {bad}\n\n",
          ),
        ),
    );
    const onDelta = vi.fn();
    const onDone = vi.fn();
    const onError = vi.fn();
    await call({ onDelta, onDone, onError });
    expect(onDelta).not.toHaveBeenCalled();
    expect(onDone).toHaveBeenCalledWith({});
    expect(onError).toHaveBeenCalledOnce();
  });

  it("accepts fallback mode and empty delta, and uses the default error detail", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          response(
            'event: mode\ndata: {"mode":"fallback"}\n\n' +
              'event: mode\ndata: {"mode":"unknown"}\n\n' +
              "event: delta\ndata: {}\n\n" +
              "event: error\ndata: {}\n\n",
          ),
        ),
    );
    const onMode = vi.fn();
    const onDelta = vi.fn();
    const onError = vi.fn();
    await call({ onMode, onDelta, onError });
    expect(onMode).toHaveBeenCalledExactlyOnceWith("fallback");
    expect(onDelta).toHaveBeenCalledExactlyOnceWith("");
    expect(onError).toHaveBeenCalledOnce();
  });

  it("reports interrupted streams but ignores an intentional abort", async () => {
    for (const name of ["NetworkError", "AbortError"]) {
      const body = {
        getReader: () => ({
          read: async () => {
            throw { name };
          },
        }),
      };
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, body }));
      const onError = vi.fn();
      await call({ onError });
      expect(onError).toHaveBeenCalledTimes(name === "AbortError" ? 0 : 1);
    }
  });

  it("uses a JSON message and a default message for other HTTP failures", async () => {
    const onError = vi.fn();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response('{"message":"backend message"}', 503)),
    );
    await call({ onError });
    expect(onError).toHaveBeenCalledWith("backend message");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response("not json", 503)));
    await call({ onError });
    expect(onError).toHaveBeenCalledTimes(2);
  });

  it("retries a 401 with the token refreshed by another tab", async () => {
    localStorage.setItem(STORAGE_KEYS.token, "expired");
    localStorage.setItem(STORAGE_KEYS.refreshToken, "refresh-token");
    const locks = {
      request: vi.fn(async (_name: string, callback: () => Promise<string>) => {
        localStorage.setItem(STORAGE_KEYS.token, "new-access");
        return callback();
      }),
    };
    Object.defineProperty(navigator, "locks", { configurable: true, value: locks });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(null, 401))
      .mockResolvedValueOnce(response('event: delta\ndata: {"text":"recovered"}\n\n'));
    vi.stubGlobal("fetch", fetchMock);
    const onDelta = vi.fn();
    try {
      await call({ onDelta });
      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe("Bearer new-access");
      expect(onDelta).toHaveBeenCalledWith("recovered");
    } finally {
      delete (navigator as unknown as { locks?: unknown }).locks;
    }
  });
});
