import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { detectLocale, basenameFor, type Locale } from "./locale";

interface LocaleContextValue {
  locale: Locale;
  basename: string;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: "zh",
  basename: "/",
});

/**
 * Provide locale context to the tree below.
 * Must be rendered inside the i18next provider scope (after i18n init).
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const value = useMemo(() => {
    const locale = detectLocale();
    return { locale, basename: basenameFor(locale) };
  }, []);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

/**
 * Returns the current locale, basename, and translation function.
 * Convenience hook — equivalent to useLocale() + useTranslation().
 */
export function useLocale(): LocaleContextValue & {
  t: ReturnType<typeof useTranslation>["t"];
} {
  const ctx = useContext(LocaleContext);
  const { t } = useTranslation();
  return { ...ctx, t };
}
