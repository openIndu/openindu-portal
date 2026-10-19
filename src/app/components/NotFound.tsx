import { Link } from "react-router";
import { Home } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SEO } from "./SEO";

export function NotFound() {
  const { t } = useTranslation("common");
  return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <SEO title={t("notFound.seoTitle")} description={t("notFound.description")} noindex />
      <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <p className="mb-2 text-6xl font-bold text-gray-300">404</p>
        <h1 className="mb-3 text-2xl font-semibold text-gray-900">{t("notFound.title")}</h1>
        <p className="mb-6 text-gray-600">{t("notFound.description")}</p>
        <Link
          to="/"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-sky-700 px-6 py-3 font-medium text-white transition-colors hover:bg-sky-800"
        >
          <Home className="h-5 w-5" />
          {t("notFound.home")}
        </Link>
      </div>
    </div>
  );
}
