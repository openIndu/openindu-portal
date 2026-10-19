import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { SEO } from "@/app/components/SEO";

function setPathname(pathname: string) {
  Object.defineProperty(window, "location", {
    value: {
      ...window.location,
      pathname,
      origin: "https://www.openindu.com",
    },
    writable: true,
  });
}

/** Reset head state between tests so meta/link don't leak. */
function resetHead() {
  document.head
    .querySelectorAll('meta, link[rel="canonical"], link[rel="alternate"][hreflang]')
    .forEach((el) => el.remove());
  document.title = "";
  document.documentElement.lang = "";
}

describe("SEO — hreflang & locale", () => {
  describe("on EN pages (localized: true)", () => {
    it("sets <html lang> to en", () => {
      setPathname("/en/vision");
      resetHead();
      render(
        <SEO
          title="AI + Machine Vision"
          description="Industrial machine vision platform."
          canonicalPath="/vision"
          localized
        />,
      );
      expect(document.documentElement.lang).toBe("en");
    });

    it("sets og:locale to en_US", () => {
      setPathname("/en/vision");
      resetHead();
      render(
        <SEO
          title="AI + Machine Vision"
          description="Industrial machine vision platform."
          canonicalPath="/vision"
          localized
        />,
      );
      const meta = document.head.querySelector<HTMLMetaElement>('meta[property="og:locale"]');
      expect(meta?.content).toBe("en_US");
    });

    it("prefixes canonical with /en", () => {
      setPathname("/en/vision");
      resetHead();
      render(
        <SEO
          title="AI + Machine Vision"
          description="Industrial machine vision platform."
          canonicalPath="/vision"
          localized
        />,
      );
      const link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      expect(link?.href).toBe("https://www.openindu.com/en/vision/");
    });

    it("emits hreflang alternates for zh-Hans, en, and x-default", () => {
      setPathname("/en/vision");
      resetHead();
      render(
        <SEO
          title="AI + Machine Vision"
          description="Industrial machine vision platform."
          canonicalPath="/vision"
          localized
        />,
      );
      const alternates = document.head.querySelectorAll<HTMLLinkElement>(
        'link[rel="alternate"][hreflang]',
      );
      expect(alternates).toHaveLength(3);
      const tags = Array.from(alternates).map((a) => ({
        hreflang: a.getAttribute("hreflang"),
        href: a.getAttribute("href"),
      }));
      expect(tags).toContainEqual({
        hreflang: "zh-Hans",
        href: "https://www.openindu.com/vision/",
      });
      expect(tags).toContainEqual({
        hreflang: "en",
        href: "https://www.openindu.com/en/vision/",
      });
      expect(tags).toContainEqual({
        hreflang: "x-default",
        href: "https://www.openindu.com/vision/",
      });
    });
  });

  describe("on ZH pages (localized: true)", () => {
    it("sets <html lang> to zh-CN", () => {
      setPathname("/vision");
      resetHead();
      render(
        <SEO title="AI+视觉" description="工业机器视觉平台。" canonicalPath="/vision" localized />,
      );
      expect(document.documentElement.lang).toBe("zh-CN");
    });

    it("sets og:locale to zh_CN", () => {
      setPathname("/vision");
      resetHead();
      render(
        <SEO title="AI+视觉" description="工业机器视觉平台。" canonicalPath="/vision" localized />,
      );
      const meta = document.head.querySelector<HTMLMetaElement>('meta[property="og:locale"]');
      expect(meta?.content).toBe("zh_CN");
    });

    it("does NOT prefix canonical", () => {
      setPathname("/vision");
      resetHead();
      render(
        <SEO title="AI+视觉" description="工业机器视觉平台。" canonicalPath="/vision" localized />,
      );
      const link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      expect(link?.href).toBe("https://www.openindu.com/vision/");
    });

    it("emits hreflang alternates", () => {
      setPathname("/vision");
      resetHead();
      render(
        <SEO title="AI+视觉" description="工业机器视觉平台。" canonicalPath="/vision" localized />,
      );
      const alternates = document.head.querySelectorAll<HTMLLinkElement>(
        'link[rel="alternate"][hreflang]',
      );
      expect(alternates).toHaveLength(3);
    });
  });

  describe("on zh-only pages (localized: false)", () => {
    it("emits zero hreflang alternates", () => {
      setPathname("/privacy");
      resetHead();
      render(
        <SEO
          title="隐私声明｜openIndu社区"
          description="隐私声明说明。"
          canonicalPath="/privacy"
          localized={false}
        />,
      );
      const alternates = document.head.querySelectorAll<HTMLLinkElement>(
        'link[rel="alternate"][hreflang]',
      );
      expect(alternates).toHaveLength(0);
    });

    it("keeps canonical as ZH even when accessed via EN path", () => {
      setPathname("/en/privacy");
      resetHead();
      render(
        <SEO
          title="隐私声明｜openIndu社区"
          description="隐私声明说明。"
          canonicalPath="/privacy"
          localized={false}
        />,
      );
      const link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      // localized=false → no /en prefix
      expect(link?.href).toBe("https://www.openindu.com/privacy/");
    });

    it("keeps og:locale as zh_CN regardless of path", () => {
      setPathname("/en/privacy");
      resetHead();
      render(
        <SEO
          title="隐私声明｜openIndu社区"
          description="隐私声明说明。"
          canonicalPath="/privacy"
          localized={false}
        />,
      );
      const meta = document.head.querySelector<HTMLMetaElement>('meta[property="og:locale"]');
      expect(meta?.content).toBe("zh_CN");
    });
  });
});
