import { useTranslation } from "react-i18next";
import { Cpu, CheckCircle, Layers, Code2, ExternalLink } from "lucide-react";
import { SEO } from "../components/SEO";

const featureKeys = [
  { key: "plc", icon: Cpu },
  { key: "hostDev", icon: Code2 },
  { key: "motionCard", icon: Layers },
] as const;

const FORUM = "https://forum.openindu.com";

/**
 * "支持主流品牌PLC" was an unbacked claim. Each brand now carries the two guides
 * actually published in the forum's 自动化 category — a selection guide and a
 * validation guide — so the claim is checkable. Topic IDs verified against
 * /c/automation/6.json; see scripts/list-forum-topics.mjs.
 */
const plcBrandKeys = [
  { key: "siemens", selection: 24, validation: 26 },
  { key: "mitsubishi", selection: 43, validation: 45 },
  { key: "omron", selection: 47, validation: 48 },
  { key: "keyence", selection: 51, validation: 52 },
  { key: "inovance", selection: 39, validation: 40 },
] as const;
const motionCardBrandKeys = ["leadshine", "googol", "advantech", "adlink", "zmotion"] as const;
const industryKeys = ["display", "newEnergy", "medical"] as const;

export function MotionControl() {
  const { t } = useTranslation("motion-control");

  const plcBrands = plcBrandKeys.map((brand) => ({
    ...brand,
    name: t(`plcBrands.${brand.key}.name`),
    desc: t(`plcBrands.${brand.key}.desc`),
  }));

  const motionCardBrands = motionCardBrandKeys.map((key) => ({
    key,
    name: t(`motionCardBrands.${key}.name`),
    desc: t(`motionCardBrands.${key}.desc`),
  }));

  const industries = industryKeys.map((key) => ({
    key,
    name: t(`industries.${key}.name`),
    applications: t(`industries.${key}.applications`, { returnObjects: true }) as string[],
    tech: t(`industries.${key}.tech`),
  }));

  const csharpItems = t("hostDevSection.csharp.items", { returnObjects: true }) as string[];
  const cppItems = t("hostDevSection.cpp.items", { returnObjects: true }) as string[];

  return (
    <div>
      <SEO
        title={t("seo.title")}
        description={t("seo.description")}
        keywords={t("seo.keywords")}
        canonicalPath="/motion-control"
      />
      {/* Hero */}
      <section className="bg-gradient-to-b from-sky-50 via-white to-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-12 h-12 bg-[#0B72B5] text-white rounded-lg">
              <Cpu className="w-7 h-7" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">{t("hero.title")}</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mb-6">{t("hero.description")}</p>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-4 py-2 bg-sky-50 text-[#0B72B5] rounded-lg">
              <CheckCircle className="w-5 h-5" />
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
                className="p-6 border border-gray-200 rounded-xl hover:border-[#0B72B5] hover:shadow-lg transition-all"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-sky-50 text-[#0B72B5] rounded-lg mb-4">
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
          <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">
            {t("plcBrands.heading")}
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            {t("plcBrands.subheading")}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-6">
            {plcBrands.map((brand) => (
              <div
                key={brand.key}
                className="flex flex-col bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-[#0B72B5] transition-all"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-[#0B72B5] text-white rounded-lg mb-3 font-bold text-lg">
                  {brand.name.charAt(0)}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{brand.name}</h3>
                <p className="text-sm text-gray-600 mb-4 grow">{brand.desc}</p>
                <div className="flex flex-col gap-1 border-t border-gray-100 pt-3">
                  <a
                    href={`${FORUM}/t/topic/${brand.selection}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-[#0B72B5] hover:text-[#085A90]"
                  >
                    {t("plcBrands.selectionLabel")}
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  </a>
                  <a
                    href={`${FORUM}/t/topic/${brand.validation}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-[#0B72B5] hover:text-[#085A90]"
                  >
                    {t("plcBrands.validationLabel")}
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  </a>
                </div>
              </div>
            ))}
          </div>
          <div className="text-center mb-16">
            <p className="text-sm text-gray-600">{t("plcBrands.guidesNote")}</p>
            <a
              href={`${FORUM}/c/automation/6`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-medium text-[#0B72B5] hover:text-[#085A90] underline underline-offset-2"
            >
              {t("plcBrands.guidesLink")}
              <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            </a>
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">
            {t("motionCardBrands.heading")}
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            {t("motionCardBrands.subheading")}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {motionCardBrands.map((brand) => (
              <div
                key={brand.key}
                className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:border-[#0B72B5] transition-all"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-[#0E86D4] text-white rounded-lg mb-3 font-bold text-lg">
                  {brand.name.charAt(0)}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{brand.name}</h3>
                <p className="text-sm text-gray-600">{brand.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Technology Stack */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">
            {t("industries.heading")}
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            {t("industries.subheading")}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
            {industries.map((industry, index) => (
              <div
                key={industry.key}
                className="bg-gradient-to-br from-white to-gray-50 p-8 rounded-xl border border-gray-200 hover:border-[#0B72B5] hover:shadow-xl transition-all"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-12 h-12 bg-[#0B72B5] text-white rounded-lg font-bold text-xl">
                    {index + 1}
                  </div>
                  <h3 className="text-2xl font-semibold text-gray-900">{industry.name}</h3>
                </div>
                <ul className="space-y-3 mb-4">
                  {industry.applications.map((app) => (
                    <li key={app} className="flex items-start gap-2 text-gray-700">
                      <span className="text-[#0B72B5] mt-1">•</span>
                      <span>{app}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-500 mb-1">{t("industries.coreTechLabel")}</p>
                  <p className="text-sm text-gray-700 font-medium">{industry.tech}</p>
                </div>
              </div>
            ))}
          </div>

          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            {t("hostDevSection.heading")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-sky-50 p-8 rounded-xl border border-sky-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-12 h-12 bg-sky-700 text-white rounded-lg">
                  <Code2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {t("hostDevSection.csharp.title")}
                </h3>
              </div>
              <ul className="space-y-3 text-gray-700">
                {csharpItems.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-sky-700 mt-1">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-slate-50 p-8 rounded-xl border border-slate-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex items-center justify-center w-12 h-12 bg-slate-700 text-white rounded-lg">
                  <Code2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {t("hostDevSection.cpp.title")}
                </h3>
              </div>
              <ul className="space-y-3 text-gray-700">
                {cppItems.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-slate-700 mt-1">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-[#085A90] text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <CheckCircle className="w-12 h-12" />
          </div>
          <h2 className="text-3xl font-bold mb-4">{t("cta.heading")}</h2>
          <p className="text-xl mb-8 text-white/90">{t("cta.description")}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:contact@openindu.com"
              className="inline-flex items-center justify-center px-8 py-4 bg-white text-[#085A90] rounded-lg hover:bg-sky-50 transition-colors font-medium"
            >
              {t("cta.contact")}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
