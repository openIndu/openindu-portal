import { useTranslation } from "react-i18next";
import { Eye, Camera, Scan, Target, Clock } from "lucide-react";
import { SEO } from "../components/SEO";

const featureKeys = [
  { key: "defect", icon: Camera },
  { key: "measurement", icon: Scan },
  { key: "recognition", icon: Target },
] as const;

const useCaseKeys = [
  "surfaceDefect",
  "dimension",
  "ocr",
  "assembly",
  "color",
  "robotGuide",
] as const;

const techStackKeys = [
  { key: "capture", color: "bg-green-600" },
  { key: "preprocess", color: "bg-teal-600" },
  { key: "aiAlgorithm", color: "bg-cyan-600" },
  { key: "output", color: "bg-green-500" },
] as const;

const advantageKeys = ["accuracy", "speed", "learning", "deployment"] as const;

export function Vision() {
  const { t } = useTranslation("vision");

  return (
    <div>
      <SEO
        title={t("seo.title")}
        description={t("seo.description")}
        keywords={t("seo.keywords")}
        canonicalPath="/vision"
      />
      {/* Hero */}
      <section className="bg-gradient-to-br from-green-50 via-teal-50 to-cyan-50 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-12 h-12 bg-green-600 text-white rounded-lg">
              <Eye className="w-7 h-7" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">{t("hero.title")}</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mb-6">{t("hero.description")}</p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg">
              <Clock className="w-5 h-5" />
              <span className="font-medium">{t("hero.badge")}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            {t("features.heading")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {featureKeys.map((feature) => (
              <div
                key={feature.key}
                className="p-6 border border-gray-200 rounded-xl hover:border-green-600 hover:shadow-lg transition-all"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-green-100 text-green-800 rounded-lg mb-4">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t(`features.${feature.key}.title`)}
                </h3>
                <p className="text-sm text-gray-600">{t(`features.${feature.key}.description`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            {t("useCases.heading")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {useCaseKeys.map((key, index) => (
              <div key={key} className="bg-white p-8 rounded-xl shadow-sm">
                <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-teal-600 text-white rounded-lg flex items-center justify-center mb-4 text-xl font-bold">
                  {index + 1}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {t(`useCases.${key}.title`)}
                </h3>
                <p className="text-gray-600 mb-4">{t(`useCases.${key}.description`)}</p>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-500">{t("useCases.industryLabel")}</p>
                  <p className="text-sm text-gray-700 font-medium">
                    {t(`useCases.${key}.industries`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            {t("techStack.heading")}
          </h2>
          <div className="max-w-4xl mx-auto">
            <div className="bg-gradient-to-br from-green-50 to-teal-50 p-8 rounded-xl border border-green-200">
              <div className="space-y-6">
                {techStackKeys.map((item, index) => (
                  <div key={item.key} className="flex items-center gap-4">
                    <div
                      className={`flex-shrink-0 w-12 h-12 ${item.color} text-white rounded-lg flex items-center justify-center font-bold`}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-1">
                        {t(`techStack.${item.key}.title`)}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {t(`techStack.${item.key}.description`)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Advantages */}
      <section className="py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            {t("advantages.heading")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {advantageKeys.map((key) => (
              <div key={key} className="flex items-start gap-4">
                <div className="flex-shrink-0 w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                  ✓
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    {t(`advantages.${key}.title`)}
                  </h4>
                  <p className="text-gray-600 text-sm">{t(`advantages.${key}.description`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-gradient-to-r from-green-700 to-teal-700 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Clock className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-bold mb-4">{t("cta.heading")}</h2>
          <p className="text-xl mb-8 text-white/90">{t("cta.description")}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:contact@openindu.com"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-green-700 rounded-lg hover:bg-green-50 transition-colors font-medium"
            >
              {t("cta.contact")}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
