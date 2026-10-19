import { useEffect, type ReactNode } from "react";
import { detectLocale, stripLocalePrefix } from "@/i18n/locale";

/**
 * On the EN locale, legal pages are not translated — redirect to the ZH
 * version via a real browser navigation (cross-basename boundary).  On the
 * ZH locale this is a transparent pass-through.
 */
export function ZhOnlyGuard({ children }: { children: ReactNode }) {
  // Computed during render, not in the effect: returning the children first
  // painted the full Chinese page for the frame before the redirect fired, so
  // an EN visitor saw a flash of Chinese legal text on the way out.
  const leaving = typeof window !== "undefined" && detectLocale() === "en";

  useEffect(() => {
    if (leaving) {
      window.location.replace(stripLocalePrefix(window.location.pathname));
    }
  }, [leaving]);

  if (leaving) return null;
  return <>{children}</>;
}
