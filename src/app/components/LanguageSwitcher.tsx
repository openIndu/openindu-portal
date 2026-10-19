import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { detectLocale, alternatePath, stripLocalePrefix } from "@/i18n/locale";
import type { Locale } from "@/i18n/locale";

/** Paths whose pages exist only in Chinese. */
const ZH_ONLY = ["/privacy", "/legal", "/cookies", "/legal-center"];

function isLegalPage(pathname: string): boolean {
  const stripped = stripLocalePrefix(pathname);
  return ZH_ONLY.some((p) => stripped === p || stripped.startsWith(p));
}

/** Shared locale/link resolution used by every switcher variant below. */
function useLocaleSwitch() {
  const currentLocale = detectLocale();
  const pathname = window.location.pathname;
  const legal = isLegalPage(pathname);
  const targetLocale: Locale = currentLocale === "en" ? "zh" : "en";

  // On legal pages, EN links go home instead of to a nonexistent EN version.
  const targetPath = legal
    ? targetLocale === "en"
      ? "/"
      : stripLocalePrefix(pathname)
    : alternatePath(pathname, targetLocale, true);

  return { currentLocale, targetLocale, targetPath };
}

/** Color tokens for the two backgrounds this switcher gets dropped onto. */
const VARIANT_STYLES = {
  light: {
    icon: "text-gray-500",
    active: "text-gray-900",
    link: "text-gray-600 hover:text-sky-700",
    sep: "text-gray-300",
  },
  dark: {
    icon: "text-gray-400",
    active: "text-white",
    link: "text-gray-400 hover:text-white",
    sep: "text-gray-600",
  },
} as const;

/**
 * Full language switcher — shows both locale labels side by side.
 * Used in the footer (dark) and the mobile hamburger menu's non-segmented spots.
 * Uses real `<a href>` navigation to cross the basename boundary cleanly.
 */
export function LanguageSwitcher({
  className,
  onNavigate,
  variant = "light",
}: {
  className?: string;
  /** Called after the user clicks a language link — parent can close the mobile menu. */
  onNavigate?: () => void;
  /** "light" for white/light backgrounds (default), "dark" for the dark footer. */
  variant?: "light" | "dark";
}) {
  const { t } = useTranslation("common");
  const { currentLocale, targetPath } = useLocaleSwitch();
  const style = VARIANT_STYLES[variant];

  const labels: Record<Locale, string> = {
    zh: t("language.zh"),
    en: t("language.en"),
  };

  return (
    <nav className={`flex items-center gap-2 ${className ?? ""}`} aria-label={t("language.label")}>
      <Globe className={`h-4 w-4 shrink-0 ${style.icon}`} aria-hidden="true" />
      {currentLocale === "zh" ? (
        <>
          <span
            className={`text-sm font-medium ${style.active} inline-flex items-center py-2 px-1 min-h-[44px] whitespace-nowrap`}
            aria-current="true"
          >
            {labels.zh}
          </span>
          <span className={`select-none ${style.sep}`}>|</span>
          <a
            href={targetPath}
            lang="en"
            className={`text-sm transition-colors ${style.link} inline-flex items-center py-2 px-1 min-h-[44px] whitespace-nowrap`}
            onClick={onNavigate}
          >
            {labels.en}
          </a>
        </>
      ) : (
        <>
          <a
            href={targetPath}
            lang="zh-Hans"
            className={`text-sm transition-colors ${style.link} inline-flex items-center py-2 px-1 min-h-[44px] whitespace-nowrap`}
            onClick={onNavigate}
          >
            {labels.zh}
          </a>
          <span className={`select-none ${style.sep}`}>|</span>
          <span
            className={`text-sm font-medium ${style.active} inline-flex items-center py-2 px-1 min-h-[44px] whitespace-nowrap`}
            aria-current="true"
          >
            {labels.en}
          </span>
        </>
      )}
    </nav>
  );
}

/**
 * Compact single-button toggle for the desktop header's auth row.
 * Shows only the *target* locale (what clicking it switches to) so it
 * stays narrow next to the nav links and the sign-in button.
 */
export function LanguageSwitcherCompact({ className }: { className?: string }) {
  const { t } = useTranslation("common");
  const { targetLocale, targetPath } = useLocaleSwitch();

  const targetLabelShort = t(`language.${targetLocale}Short`);

  return (
    <a
      href={targetPath}
      lang={targetLocale === "en" ? "en" : "zh-Hans"}
      aria-label={t("language.switchTo", { language: t(`language.${targetLocale}`) })}
      className={`inline-flex items-center justify-center gap-1 rounded-full border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:border-sky-200 hover:text-sky-700 min-w-[44px] min-h-[44px] ${className ?? ""}`}
    >
      <Globe className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      {targetLabelShort}
    </a>
  );
}

/**
 * Segmented-control variant for the mobile hamburger menu.
 * Full-width horizontal pill: two equal halves, active side highlighted.
 */
export function LanguageSwitcherMobile({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation("common");
  const { currentLocale, targetPath } = useLocaleSwitch();

  return (
    <nav className="flex rounded-lg bg-gray-100 p-0.5" aria-label={t("language.label")}>
      {(["zh", "en"] as Locale[]).map((locale) => {
        const isActive = locale === currentLocale;
        const href = isActive ? undefined : targetPath;
        const label = t(`language.${locale}`);

        const inner = (
          <span
            className={`block w-full rounded-md px-3 py-2 text-center text-sm font-medium transition-colors ${
              isActive ? "bg-white text-gray-900 shadow-sm" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {label}
          </span>
        );

        return isActive ? (
          <span key={locale} className="flex-1" aria-current="true">
            {inner}
          </span>
        ) : (
          <a
            key={locale}
            href={href!}
            lang={locale === "en" ? "en" : "zh-Hans"}
            className="flex-1"
            onClick={onNavigate}
          >
            {inner}
          </a>
        );
      })}
    </nav>
  );
}
