import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { CookieConsent as Preference } from "@/lib/cookieConsent";
import { saveCookieConsent } from "@/lib/cookieConsent";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

export const OPEN_COOKIE_SETTINGS_EVENT = "openindu:open-cookie-settings";

// Published on <html> while the bar is shown; src/styles/index.css keeps that much room at the page bottom.
export const COOKIE_BANNER_HEIGHT_VAR = "--cookie-banner-height";

type Props = {
  preference: Preference | null;
  onChange: (preference: Preference) => void;
};

export function CookieConsent({ preference, onChange }: Props) {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const [analytics, setAnalytics] = useState(preference?.analytics ?? false);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const bannerRef = useRef<HTMLElement | null>(null);
  const bannerVisible = !preference;

  // Before paint, so the room is reserved in the same frame the bar appears.
  useLayoutEffect(() => {
    const banner = bannerRef.current;
    if (!bannerVisible || !banner) return;
    const root = document.documentElement;
    const publish = () =>
      root.style.setProperty(COOKIE_BANNER_HEIGHT_VAR, `${banner.offsetHeight}px`);
    publish();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(publish);
    observer?.observe(banner);
    window.addEventListener("resize", publish);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", publish);
      root.style.removeProperty(COOKIE_BANNER_HEIGHT_VAR);
    };
  }, [bannerVisible]);

  useEffect(() => {
    const openSettings = () => {
      restoreFocusRef.current = document.activeElement as HTMLElement | null;
      setAnalytics(preference?.analytics ?? false);
      setOpen(true);
    };
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, openSettings);
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, openSettings);
  }, [preference]);

  const choose = (allowAnalytics: boolean) => {
    const saved = saveCookieConsent(allowAnalytics);
    if (saved) onChange(saved);
  };

  const setDialogOpen = (next: boolean) => {
    setOpen(next);
    if (!next) requestAnimationFrame(() => restoreFocusRef.current?.focus());
  };

  return (
    <>
      {/* z-30: under the mobile menu (z-40), the header and the settings dialog (z-50). */}
      {bannerVisible && (
        <section
          ref={bannerRef}
          aria-label={t("cookieConsent.title")}
          aria-live="polite"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-sky-200 bg-white/95 shadow-[0_-8px_24px_rgba(15,23,42,0.12)] backdrop-blur supports-[backdrop-filter]:bg-white/90"
          data-testid="cookie-consent-banner"
        >
          <div className="mx-auto flex max-h-[45vh] max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:gap-8 lg:px-8">
            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto">
              <h2 className="text-base font-semibold leading-6 tracking-tight text-gray-950">
                {t("cookieConsent.title")}
              </h2>
              <p className="mt-0.5 text-sm leading-5 text-gray-700">
                {t("cookieConsent.description")}{" "}
                <Link
                  className="font-medium text-sky-700 underline underline-offset-4"
                  to="/cookies"
                >
                  {t("cookieConsent.cookiesLink")}
                </Link>
              </p>
            </div>
            <div className="flex shrink-0 flex-row flex-wrap gap-2" data-testid="cookie-actions">
              <button
                className="min-h-11 rounded-full bg-sky-700 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-sky-800"
                data-testid="cookie-accept"
                onClick={() => choose(true)}
              >
                {t("cookieConsent.accept")}
              </button>
              <button
                className="min-h-11 rounded-full border border-sky-700 px-4 py-1.5 text-sm font-medium text-sky-800 transition-colors hover:bg-sky-50"
                data-testid="cookie-reject"
                onClick={() => choose(false)}
              >
                {t("cookieConsent.reject")}
              </button>
              <button
                className="min-h-11 rounded-full border border-sky-700 px-4 py-1.5 text-sm font-medium text-sky-800 transition-colors hover:bg-sky-50"
                data-testid="cookie-manage"
                onClick={(event) => {
                  restoreFocusRef.current = event.currentTarget;
                  setOpen(true);
                }}
              >
                {t("cookieConsent.manage")}
              </button>
            </div>
          </div>
        </section>
      )}

      <AlertDialog open={open} onOpenChange={setDialogOpen}>
        <AlertDialogContent data-testid="cookie-settings-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{t("cookieConsent.manageTitle")}</AlertDialogTitle>
            <AlertDialogDescription>{t("cookieConsent.manageDescription")}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3">
            <label className="flex min-h-11 items-center justify-between rounded-lg border p-3">
              <span>{t("cookieConsent.necessary")}</span>
              <input aria-label={t("cookieConsent.necessary")} checked disabled type="checkbox" />
            </label>
            <label className="flex min-h-11 items-center justify-between rounded-lg border p-3">
              <span>{t("cookieConsent.analytics")}</span>
              <input
                aria-label={t("cookieConsent.analytics")}
                checked={analytics}
                data-testid="cookie-analytics"
                onChange={(event) => setAnalytics(event.target.checked)}
                type="checkbox"
              />
            </label>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cookieConsent.cancel")}</AlertDialogCancel>
            <AlertDialogAction data-testid="cookie-save" onClick={() => choose(analytics)}>
              {t("cookieConsent.save")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
