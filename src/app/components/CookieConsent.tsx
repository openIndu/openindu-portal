import { useEffect, useRef, useState } from "react";
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

type Props = {
  preference: Preference | null;
  onChange: (preference: Preference) => void;
};

export function CookieConsent({ preference, onChange }: Props) {
  const { t } = useTranslation("common");
  const [open, setOpen] = useState(false);
  const [analytics, setAnalytics] = useState(preference?.analytics ?? false);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

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
      {!preference && (
        <section
          aria-label={t("cookieConsent.title")}
          aria-live="polite"
          className="fixed bottom-4 left-4 z-[60] max-h-[45vh] w-[calc(100%-2rem)] max-w-[380px] overflow-y-auto rounded-2xl border border-sky-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.16)]"
          data-testid="cookie-consent-banner"
        >
          <div className="grid gap-2 p-3">
            <div>
              <h2 className="text-lg font-semibold leading-6 tracking-tight text-gray-950">
                {t("cookieConsent.title")}
              </h2>
              <p className="mt-1 text-sm leading-5 text-gray-700">
                {t("cookieConsent.description")}{" "}
                <Link
                  className="font-medium text-sky-700 underline underline-offset-4"
                  to="/cookies"
                >
                  {t("cookieConsent.cookiesLink")}
                </Link>
              </p>
            </div>
            <div className="flex flex-row flex-wrap gap-1.5" data-testid="cookie-actions">
              <button
                className="min-h-11 rounded-full bg-sky-700 px-2.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-sky-800"
                data-testid="cookie-accept"
                onClick={() => choose(true)}
              >
                {t("cookieConsent.accept")}
              </button>
              <button
                className="min-h-11 rounded-full border border-sky-700 px-2.5 py-1.5 text-sm font-medium text-sky-800 transition-colors hover:bg-sky-50"
                data-testid="cookie-reject"
                onClick={() => choose(false)}
              >
                {t("cookieConsent.reject")}
              </button>
              <button
                className="min-h-11 rounded-full border border-sky-700 px-2.5 py-1.5 text-sm font-medium text-sky-800 transition-colors hover:bg-sky-50"
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
