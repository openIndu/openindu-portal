import { useEffect } from "react";
import { SITE_ORIGIN } from "@/lib/siteOrigin";

/** Path segment → human-readable name for BreadcrumbList generation. */
const BREADCRUMB_NAMES: Record<string, string> = {
  "motion-control": "AI+运动控制",
  studio: "openIndu-studio 平台",
  vision: "AI+视觉",
  station: "openIndu-station",
  "iiot-platform": "AI+工业互联网平台",
  infrastructure: "AI+基础设施",
  resources: "下载中心",
  documents: "文档资料",
  software: "软件工具",
  privacy: "隐私声明",
  legal: "法律声明",
  cookies: "关于 Cookies",
  "legal-center": "法律与隐私",
};

const BREADCRUMB_NAMES_EN: Record<string, string> = {
  "motion-control": "AI + Motion Control",
  studio: "openIndu-studio",
  vision: "AI + Vision",
  station: "openIndu-station",
  "iiot-platform": "Industrial IoT Platform",
  infrastructure: "AI Infrastructure",
  resources: "Downloads",
  documents: "Documents",
  software: "Software",
};

function buildBreadcrumbList(pathname: string, origin: string, isEnglish: boolean) {
  const segments = pathname.split("/").filter(Boolean);
  if (isEnglish && segments[0] === "en") segments.shift();
  if (segments.length === 0) {
    // Home page — no breadcrumb needed, but return empty list
    return [];
  }

  const items: Array<{ name: string; item: string }> = [
    { name: isEnglish ? "Home" : "首页", item: origin + (isEnglish ? "/en/" : "/") },
  ];

  let accumulated = isEnglish ? "/en" : "";
  for (const seg of segments) {
    accumulated += "/" + seg;
    const name = (isEnglish ? BREADCRUMB_NAMES_EN : BREADCRUMB_NAMES)[seg] || seg;
    items.push({ name, item: origin + accumulated + "/" });
  }

  return items;
}

interface StructuredDataProps {
  /** Page-level: title (for WebPage schema). Falls back to document.title. */
  pageTitle?: string;
  /** Page-level: description (for WebPage schema). */
  pageDescription?: string;
  /** Page-level: canonical path (for WebPage schema url). */
  pagePath?: string;
}

/**
 * Injects site-level (Organization + WebSite) and page-level
 * (BreadcrumbList + WebPage) JSON-LD structured data.
 *
 * Site-level schemas are injected once and persist across navigations.
 * Page-level schemas are re-injected when pathname changes.
 */
export function StructuredData({ pageTitle, pageDescription, pagePath }: StructuredDataProps = {}) {
  useEffect(() => {
    let script: HTMLScriptElement | undefined;
    const timer = window.setTimeout(() => {
      const origin = SITE_ORIGIN;
      const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      const url = canonical?.href || `${origin}${window.location.pathname}`;
      const pathname = new URL(url).pathname;
      const isEnglish = document.documentElement.lang.startsWith("en");
      const metaDescription = document.head.querySelector<HTMLMetaElement>(
        'meta[name="description"]',
      )?.content;

      // --- Site-level schemas (persistent) ---
      const sitePayload = [
        {
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "openIndu Community",
          alternateName: "openIndu",
          url: origin,
          sameAs: ["https://github.com/openIndu"],
          logo: `${origin}/assets/logo-512.png`,
          description: isEnglish
            ? "An open smart manufacturing ecosystem built through the forum, open engineering tools, and verifiable projects."
            : "面向工业自动化与非标设备的开源智能制造工业生态，通过论坛、开源工程工具和可验证项目推动协作。",
        },
        {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "openIndu Community",
          url: origin,
          potentialAction: {
            "@type": "SearchAction",
            target: `${origin}/resources?keyword={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        },
      ];

      // --- Page-level schemas ---
      const breadcrumb = buildBreadcrumbList(pathname, origin, isEnglish);

      const pagePayload: Record<string, unknown>[] = [];

      if (breadcrumb.length > 0) {
        pagePayload.push({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: breadcrumb.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
            item: item.item,
          })),
        });
      }

      pagePayload.push({
        "@context": "https://schema.org",
        "@type": "WebPage",
        name: pageTitle || document.title,
        description:
          pageDescription ||
          metaDescription ||
          (isEnglish
            ? "openIndu Community — Open Smart Manufacturing Ecosystem"
            : "openIndu Community — 开源智能制造工业生态"),
        url,
        isPartOf: {
          "@type": "WebSite",
          name: "openIndu Community",
          url: origin,
        },
        about: {
          "@type": "Thing",
          name: isEnglish
            ? "Smart Manufacturing and Industrial Automation"
            : "智能制造与工业自动化",
        },
      });

      // --- Inject ---
      const allPayload = [...sitePayload, ...pagePayload];

      // --- Inject ---
      // A noindex page (the 404 page) describes no real page: keep only the site-level schemas.
      const noindex = document.head
        .querySelector<HTMLMetaElement>('meta[name="robots"]')
        ?.content.includes("noindex");
      const allPayload = noindex ? sitePayload : [...sitePayload, ...pagePayload];

      // Remove any previous openIndu JSON-LD scripts to avoid duplicates
      document.head.querySelectorAll("script[data-openindu-jsonld]").forEach((el) => el.remove());

      script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute("data-openindu-jsonld", "1");
      script.textContent = JSON.stringify(allPayload);
      document.head.appendChild(script);

      script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute("data-openindu-jsonld", "1");
      script.textContent = JSON.stringify(allPayload);
      document.head.appendChild(script);
    }, 0);

    return () => {
      window.clearTimeout(timer);
      script?.parentElement?.removeChild(script);
    };
  }, [pageTitle, pageDescription, pagePath]);

  return null;
}
