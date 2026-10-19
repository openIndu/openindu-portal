import { describe, it, expect, beforeEach } from "vitest";
import { detectLocale, basenameFor, stripLocalePrefix, alternatePath } from "@/i18n/locale";

function setPathname(pathname: string) {
  Object.defineProperty(window, "location", {
    value: { ...window.location, pathname },
    writable: true,
  });
}

describe("detectLocale", () => {
  it('returns "en" for /en (exact)', () => {
    setPathname("/en");
    expect(detectLocale()).toBe("en");
  });

  it('returns "en" for /en/ with trailing content', () => {
    setPathname("/en/vision");
    expect(detectLocale()).toBe("en");
  });

  it('returns "zh" for root /', () => {
    setPathname("/");
    expect(detectLocale()).toBe("zh");
  });

  it('returns "zh" for a non-en path', () => {
    setPathname("/vision");
    expect(detectLocale()).toBe("zh");
  });

  it("does NOT match /enigma as en", () => {
    setPathname("/enigma");
    expect(detectLocale()).toBe("zh");
  });

  it("does NOT match /energy as en", () => {
    setPathname("/energy");
    expect(detectLocale()).toBe("zh");
  });
});

describe("basenameFor", () => {
  it('returns "/en" for "en"', () => {
    expect(basenameFor("en")).toBe("/en");
  });

  it('returns "/" for "zh"', () => {
    expect(basenameFor("zh")).toBe("/");
  });
});

describe("stripLocalePrefix", () => {
  it("strips /en/ prefix", () => {
    expect(stripLocalePrefix("/en/vision")).toBe("/vision");
  });

  it("turns /en into /", () => {
    expect(stripLocalePrefix("/en")).toBe("/");
  });

  it("passes through non-en paths", () => {
    expect(stripLocalePrefix("/vision")).toBe("/vision");
  });

  it("passes through root", () => {
    expect(stripLocalePrefix("/")).toBe("/");
  });

  it("preserves nested sub-paths after /en/", () => {
    expect(stripLocalePrefix("/en/motion-control/studio")).toBe("/motion-control/studio");
  });
});

describe("alternatePath", () => {
  beforeEach(() => {
    setPathname("/");
  });

  it("maps ZH → EN for localized page", () => {
    expect(alternatePath("/vision", "en", true)).toBe("/en/vision");
  });

  it("maps EN → ZH for localized page", () => {
    expect(alternatePath("/en/vision", "zh", true)).toBe("/vision");
  });

  it("falls back to / when EN legal page tries to switch to EN", () => {
    // currentPath = /en/privacy, want to stay in EN, but page is zh-only
    expect(alternatePath("/en/privacy", "en", false)).toBe("/");
  });

  it("maps EN legal → ZH legal when switching to ZH", () => {
    expect(alternatePath("/en/privacy", "zh", false)).toBe("/privacy");
  });

  it("maps ZH legal → ZH legal when switching to ZH (no-op)", () => {
    expect(alternatePath("/privacy", "zh", false)).toBe("/privacy");
  });
});
