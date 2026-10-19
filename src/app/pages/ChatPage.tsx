import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  FileText,
  Loader2,
  MessageCircle,
  Plus,
  Send,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import { useAuth } from "@/store/auth";
import { SEO } from "../components/SEO";
import {
  chatApi,
  chatSessionApi,
  getApiErrorMessage,
  memberApplicationApi,
  tagsApi,
  type ChatMode,
  type ChatSession,
  type ChatSource,
  type MemberApplicationStatus,
  type ResourceTag,
} from "@/api";

interface Msg {
  id?: number;
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  mode?: ChatMode;
  feedback?: number | null;
  error?: boolean;
}

const EXAMPLE_PROMPTS = [
  "S7-1200 怎么配置 Modbus TCP？",
  "三菱 FX3U 怎么做串口通信？",
  "欧姆龙 NJ 系列支持哪些现场总线？",
  "变频器过流报警如何排查？",
];

const STREAMING_HINTS = ["正在检索知识库…", "AI 正在整理答案…"];

const MARKDOWN_COMPONENTS: Partial<Components> = {
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sky-700 underline hover:text-sky-800"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="list-disc space-y-1 pl-5 my-1.5">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal space-y-1 pl-5 my-1.5">{children}</ol>,
  li: ({ children }) => <li className="text-sm leading-relaxed">{children}</li>,
  p: ({ children }) => (
    <p className="my-1.5 text-sm leading-relaxed first:mt-0 last:mb-0">{children}</p>
  ),
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  code: ({ className, children, ...props }: any) => {
    const isBlock = props.node?.tagName === "pre" || (className ?? "").startsWith("language-");
    if (isBlock) return <code className={className}>{children}</code>;
    return <code className="rounded bg-gray-200 px-1 py-0.5 text-xs text-red-700">{children}</code>;
  },
  pre: ({ children }) => (
    <pre className="my-2 overflow-x-auto rounded-lg bg-gray-800 p-3 text-xs leading-relaxed text-gray-100">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-1.5 border-l-3 border-sky-400 pl-3 text-sm italic text-gray-600">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="my-2 overflow-x-auto">
      <table className="min-w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-gray-300 bg-gray-100 px-2 py-1 text-left font-semibold">
      {children}
    </th>
  ),
  td: ({ children }) => <td className="border border-gray-300 px-2 py-1">{children}</td>,
  hr: () => <hr className="my-2 border-gray-200" />,
  h1: ({ children }) => <h1 className="my-2 text-base font-bold">{children}</h1>,
  h2: ({ children }) => <h2 className="my-1.5 text-sm font-bold">{children}</h2>,
  h3: ({ children }) => <h3 className="my-1 text-sm font-semibold">{children}</h3>,
  h4: ({ children }) => <h4 className="my-1 text-sm font-medium">{children}</h4>,
  h5: ({ children }) => <h5 className="my-1 text-sm font-medium">{children}</h5>,
  h6: ({ children }) => <h6 className="my-1 text-sm font-medium">{children}</h6>,
};

export default function ChatPage() {
  const { isMember, isAuthenticated } = useAuth();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [streamingPhase, setStreamingPhase] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const [application, setApplication] = useState<MemberApplicationStatus | null | undefined>(
    undefined,
  );
  const [applying, setApplying] = useState(false);

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [msgsLoading, setMsgsLoading] = useState(false);

  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const [filterBrand, setFilterBrand] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [brandOpts, setBrandOpts] = useState<ResourceTag[]>([]);
  const [categoryOpts, setCategoryOpts] = useState<ResourceTag[]>([]);

  function autoSizeTextarea() {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);
  useEffect(() => {
    autoSizeTextarea();
  }, []);
  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    if (!streaming) {
      setStreamingPhase(0);
      return;
    }
    const timer = setInterval(
      () => setStreamingPhase((p) => (p + 1) % STREAMING_HINTS.length),
      2000,
    );
    return () => clearInterval(timer);
  }, [streaming]);

  // Load member application status
  useEffect(() => {
    if (isAuthenticated && !isMember && application === undefined) {
      memberApplicationApi
        .mine()
        .then((v) => setApplication(v ?? null))
        .catch(() => setApplication(null));
    }
  }, [isAuthenticated, isMember, application]);

  // Load brand/category options
  useEffect(() => {
    if (isMember && brandOpts.length === 0) {
      tagsApi
        .list("doc_brand")
        .then(setBrandOpts)
        .catch(() => {});
      tagsApi
        .list("doc_category")
        .then(setCategoryOpts)
        .catch(() => {});
    }
  }, [isMember]);

  // Load sessions
  useEffect(() => {
    if (isMember && sessions.length === 0 && !sessionsLoading) {
      void loadSessions();
    }
  }, [isMember]);

  async function loadSessions() {
    setSessionsLoading(true);
    try {
      const list = await chatSessionApi.list();
      setSessions(list);
      if (list.length > 0) {
        await switchSession(list[0].id, list);
      } else {
        const s = await chatSessionApi.create();
        setSessions([s]);
        setActiveSessionId(s.id);
        setMessages([]);
      }
    } catch {
      /* ignore */
    } finally {
      setSessionsLoading(false);
    }
  }

  async function switchSession(id: number, list?: ChatSession[]) {
    if (streaming) return;
    setActiveSessionId(id);
    setMessages([]);
    setMsgsLoading(true);
    try {
      const raw = await chatSessionApi.messages(id);
      setMessages(
        raw.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          sources: m.sources ?? undefined,
          mode: m.mode ?? undefined,
          feedback: m.feedback ?? null,
        })),
      );
      if (list) setSessions(list);
    } catch {
      setMessages([]);
    } finally {
      setMsgsLoading(false);
    }
  }

  async function handleNewSession() {
    if (streaming) return;
    try {
      const s = await chatSessionApi.create();
      setSessions((prev) => [s, ...prev]);
      setActiveSessionId(s.id);
      setMessages([]);
    } catch {
      /* ignore */
    }
  }

  async function handleDeleteSession() {
    if (!activeSessionId || streaming) return;
    const id = activeSessionId;
    try {
      await chatSessionApi.remove(id);
      const next = sessions.filter((s) => s.id !== id);
      if (next.length === 0) {
        const s = await chatSessionApi.create();
        setSessions([s]);
        setActiveSessionId(s.id);
        setMessages([]);
      } else {
        setSessions(next);
        await switchSession(next[0].id);
      }
    } catch {
      /* ignore */
    }
  }

  function patchLast(fn: (m: Msg) => void) {
    setMessages((prev) => {
      const next = [...prev];
      const last = next[next.length - 1];
      if (last && last.role === "assistant") fn(last);
      return next;
    });
  }

  async function refreshAfterStream(sessionId: number) {
    try {
      const [list, raw] = await Promise.all([
        chatSessionApi.list(),
        chatSessionApi.messages(sessionId),
      ]);
      setSessions(list);
      setMessages(
        raw.map((m) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          sources: m.sources ?? undefined,
          mode: m.mode ?? undefined,
          feedback: m.feedback ?? null,
        })),
      );
    } catch {
      /* ignore */
    }
  }

  async function sendPrompt(q: string) {
    if (!q || streaming || !activeSessionId) return;
    setInput("");
    if (taRef.current) taRef.current.style.height = "auto";
    setMessages((prev) => [
      ...prev,
      { role: "user", content: q },
      { role: "assistant", content: "" },
    ]);
    setStreaming(true);
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    await chatApi.streamSession(activeSessionId, q, {
      signal: ctrl.signal,
      filters:
        filterBrand || filterCategory
          ? { brand: filterBrand || undefined, category: filterCategory || undefined }
          : undefined,
      onSources: (sources) =>
        patchLast((m) => {
          m.sources = sources;
        }),
      onMode: (mode) =>
        patchLast((m) => {
          m.mode = mode;
        }),
      onDelta: (text) =>
        patchLast((m) => {
          m.content += text;
        }),
      onError: (detail) => {
        patchLast((m) => {
          m.content = detail;
          m.error = true;
        });
        // Restore user input so typed content is not lost on error
        setInput(q);
      },
    });
    setStreaming(false);
    abortRef.current = null;
    void refreshAfterStream(activeSessionId);
  }

  function handleSend() {
    return sendPrompt(input.trim());
  }

  async function copyMessage(content: string, idx: number) {
    let ok = false;
    if (navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(content);
        ok = true;
      } catch {
        /* fall through */
      }
    }
    if (!ok) {
      try {
        const ta = document.createElement("textarea");
        ta.value = content;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        /* ignore */
      }
    }
    if (ok) {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    }
  }

  return (
    <div className="mx-auto flex h-[calc(100vh-6rem)] sm:h-[calc(100vh-8rem)] max-w-7xl flex-col px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
      <SEO
        title="智能咨询｜openIndu"
        description="基于 openIndu 知识库的工业自动化智能助手，面向会员开放，支持 PLC、变频器等工控问题问答。"
        canonicalPath="/chat"
        localized={false}
      />
      {/* Header */}
      <div className="mb-4 shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">智能咨询</h1>
        <p className="mt-1 text-sm text-gray-500">
          基于平台知识库的工业自动化智能助手，面向会员开放
        </p>
      </div>

      {!isMember ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
          <MessageCircle className="h-12 w-12 text-sky-500" />
          <p className="text-lg text-gray-600">
            智能咨询面向<strong>会员</strong>开放
          </p>
          {isAuthenticated ? (
            application?.status === "pending" ? (
              <div className="flex items-center gap-1.5 text-sm text-amber-700">
                <AlertTriangle className="h-4 w-4 shrink-0" /> 申请已提交，等待管理员审核
              </div>
            ) : application?.status === "approved" ? (
              <div className="flex items-center gap-1.5 text-sm text-green-700">
                <CheckCircle2 className="h-4 w-4 shrink-0" /> 申请已通过，请重新登录生效
              </div>
            ) : application?.status === "rejected" ? (
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-1.5 text-sm text-red-600">
                  <AlertTriangle className="h-4 w-4 shrink-0" /> 申请已被驳回，可重新提交
                </div>
                <button
                  type="button"
                  disabled={applying}
                  onClick={async () => {
                    setApplying(true);
                    try {
                      setApplication(await memberApplicationApi.apply());
                    } catch (err) {
                      alert(getApiErrorMessage(err, "申请失败"));
                    } finally {
                      setApplying(false);
                    }
                  }}
                  className="flex items-center gap-1.5 rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-[#085A90] disabled:opacity-50"
                >
                  {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : null} 重新申请
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={applying}
                onClick={async () => {
                  setApplying(true);
                  try {
                    setApplication(await memberApplicationApi.apply());
                  } catch (err) {
                    alert(getApiErrorMessage(err, "申请失败"));
                  } finally {
                    setApplying(false);
                  }
                }}
                className="flex items-center gap-1.5 rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-[#085A90] disabled:opacity-50"
              >
                {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : null} 申请成为会员
              </button>
            )
          ) : (
            <Link
              to="/login?redirect=/chat"
              className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-[#085A90]"
            >
              登录 / 注册
            </Link>
          )}
        </div>
      ) : (
        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          {/* Session bar + filters */}
          <div className="shrink-0 border-b border-gray-100 bg-sky-700 px-3 sm:px-4 py-2.5 sm:py-3 text-white rounded-t-2xl">
            <div className="flex items-center gap-1.5 flex-wrap">
              <select
                className="min-w-0 flex-1 truncate rounded-lg bg-sky-800 px-2 py-1.5 text-sm text-white focus:outline-none disabled:opacity-50"
                value={activeSessionId ?? ""}
                disabled={streaming || sessionsLoading}
                onChange={(e) => void switchSession(Number(e.target.value))}
              >
                {sessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                title="新建会话"
                disabled={streaming}
                onClick={() => void handleNewSession()}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-800 text-white hover:bg-[#085A90] disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                type="button"
                title="删除当前会话"
                disabled={streaming || !activeSessionId}
                onClick={() => void handleDeleteSession()}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sky-800 text-white hover:bg-red-600 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            {brandOpts.length > 0 && (
              <div className="mt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:gap-2">
                <select
                  className="min-w-0 flex-1 truncate rounded-lg bg-sky-800 px-2 py-1.5 text-sm text-white focus:outline-none disabled:opacity-50"
                  value={filterBrand}
                  disabled={streaming}
                  onChange={(e) => setFilterBrand(e.target.value)}
                >
                  <option value="">全部品牌</option>
                  {brandOpts.map((b) => (
                    <option key={b.value} value={b.value}>
                      {b.label_zh}
                    </option>
                  ))}
                </select>
                <select
                  className="min-w-0 flex-1 truncate rounded-lg bg-sky-800 px-2 py-1.5 text-sm text-white focus:outline-none disabled:opacity-50"
                  value={filterCategory}
                  disabled={streaming}
                  onChange={(e) => setFilterCategory(e.target.value)}
                >
                  <option value="">全部分类</option>
                  {categoryOpts.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label_zh}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-scroll p-4">
            {(sessionsLoading || msgsLoading) && (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
              </div>
            )}
            {!sessionsLoading && !msgsLoading && messages.length === 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-center text-sm text-gray-400">试着问我：</p>
                {EXAMPLE_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void sendPrompt(prompt)}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-left text-sm text-gray-600 transition-colors hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
            {messages.map((m, i) => {
              async function handleFeedback(value: 1 | -1) {
                if (!m.id || !activeSessionId) return;
                try {
                  await chatSessionApi.feedback(activeSessionId, m.id, value);
                  setMessages((prev) =>
                    prev.map((msg, idx) => (idx === i ? { ...msg, feedback: value } : msg)),
                  );
                } catch {
                  /* ignore */
                }
              }
              return (
                <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
                  {m.role === "assistant" && m.mode === "fallback" && !m.error && (
                    <div className="mb-1 inline-flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-left text-[11px] leading-snug text-amber-700 ring-1 ring-amber-200">
                      <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
                      <span>
                        以下回答<strong>非来自</strong>本平台知识库，由 AI
                        通用知识生成，关键参数请以厂家原版手册为准。
                      </span>
                    </div>
                  )}
                  <div
                    className={`group inline-flex max-w-[92%] sm:max-w-[85%] items-start gap-1 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                  >
                    <div
                      className={`break-words rounded-2xl px-3 py-2 text-left text-sm ${
                        m.role === "user"
                          ? "bg-sky-700 text-white whitespace-pre-wrap"
                          : m.error
                            ? "bg-red-50 text-red-600"
                            : m.mode === "fallback"
                              ? "bg-amber-50 text-gray-800 ring-1 ring-amber-200"
                              : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {m.content ? (
                        m.role === "assistant" && !m.error ? (
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            components={MARKDOWN_COMPONENTS}
                          >
                            {m.content}
                          </ReactMarkdown>
                        ) : (
                          m.content
                        )
                      ) : streaming && i === messages.length - 1 ? (
                        <span className="flex items-center gap-2 text-gray-400">
                          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                          <span className="text-sm">{STREAMING_HINTS[streamingPhase]}</span>
                        </span>
                      ) : (
                        ""
                      )}
                    </div>
                    {m.content && (
                      <>
                        <button
                          type="button"
                          title="复制"
                          onClick={() => void copyMessage(m.content, i)}
                          className="mt-0.5 shrink-0 rounded-md p-1 text-gray-400 transition-colors hover:text-gray-600 invisible group-hover:visible"
                        >
                          {copiedIdx === i ? (
                            <Check className="h-3.5 w-3.5 text-green-500" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                        {m.role === "assistant" && !m.error && m.id && (
                          <>
                            <button
                              type="button"
                              title="有帮助"
                              onClick={() => void handleFeedback(1)}
                              className={`mt-0.5 shrink-0 rounded-md p-1 transition-colors invisible group-hover:visible ${m.feedback === 1 ? "visible text-green-500" : "text-gray-400 hover:text-green-500"}`}
                            >
                              <ThumbsUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              title="无帮助"
                              onClick={() => void handleFeedback(-1)}
                              className={`mt-0.5 shrink-0 rounded-md p-1 transition-colors invisible group-hover:visible ${m.feedback === -1 ? "visible text-red-500" : "text-gray-400 hover:text-red-500"}`}
                            >
                              <ThumbsDown className="h-3.5 w-3.5" />
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-1 space-y-1">
                      <div className="text-xs text-gray-400">来源：</div>
                      {m.sources.map((s, j) => (
                        <div key={j} className="flex items-center gap-1 text-xs text-gray-400">
                          <FileText className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            《{s.document_name}》p.{s.page}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Input area */}
          <div className="shrink-0 border-t border-gray-100 p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={taRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  autoSizeTextarea();
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                rows={2}
                placeholder="输入你的工业问题，可粘贴报错日志 / 程序段… (Enter 发送，Shift+Enter 换行)"
                className="max-h-60 flex-1 resize-none overflow-y-auto break-words rounded-lg border border-gray-200 px-3 py-2 text-sm leading-relaxed focus:border-sky-600 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={streaming || !input.trim()}
                aria-label="发送"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-sky-700 text-white transition hover:bg-[#085A90] disabled:opacity-40"
              >
                {streaming ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </button>
            </div>
            <p className="mt-1.5 text-center text-[11px] text-gray-300">
              答案由 AI 依据知识库生成，仅供参考
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
