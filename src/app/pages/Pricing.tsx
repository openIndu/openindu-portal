import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, CheckCircle, Github, Cloud, Server } from "lucide-react";
import { SEO } from "../components/SEO";

const optionKeys = [
  { key: "onPremises", icon: Server, href: "mailto:info@openindu.com", featured: false },
  { key: "edge", icon: Cloud, href: "mailto:info@openindu.com", featured: true },
  { key: "cloud", icon: Github, href: "mailto:info@openindu.com", featured: false },
] as const;

export function Pricing() {
  const { t } = useTranslation("pricing");

  const options = optionKeys.map((o) => ({
    ...o,
    name: t(`options.${o.key}.name`),
    description: t(`options.${o.key}.description`),
    features: t(`options.${o.key}.features`, { returnObjects: true }) as string[],
    price: t(`options.${o.key}.price`),
    cta: t(`options.${o.key}.cta`),
  }));

  const openSourceItems = t("license.openSourceItems", { returnObjects: true }) as string[];
  const enterpriseItems = t("license.enterpriseItems", { returnObjects: true }) as string[];

  return (
    <div>
      <SEO title={t("seo.title")} description={t("seo.description")} canonicalPath="/pricing" />

      {/* Hero */}
      <section className="bg-gradient-to-b from-sky-50 via-white to-white pt-16 sm:pt-24 pb-10 sm:pb-14">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6 leading-tight text-gray-900 [word-break:keep-all]">
              {t("hero.title")}
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
              {t("hero.subtitle")}
            </p>
          </div>
        </div>
      </section>

      {/* Deployment Options */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {options.map((option) => (
              <div
                key={option.key}
                className={`relative flex flex-col rounded-xl border-2 p-8 transition-all ${
                  option.featured ? "border-[#0B72B5]" : "border-gray-200 hover:border-[#0B72B5]"
                }`}
              >
                {option.featured && (
                  <div className="absolute top-4 right-4 bg-[#0B72B5] text-white px-3 py-1 rounded-full text-xs font-semibold">
                    {t("recommended")}
                  </div>
                )}
                <div className="w-12 h-12 rounded-lg bg-sky-50 flex items-center justify-center mb-4">
                  <option.icon className="w-6 h-6 text-[#0B72B5]" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{option.name}</h3>
                <p className="text-sm text-gray-600 mb-6 leading-relaxed">{option.description}</p>
                <ul className="space-y-3 mb-8 grow">
                  {option.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                <p className="text-sm font-semibold text-gray-900 mb-4">
                  {t("priceLabel")}：{option.price}
                </p>
                <a
                  href={option.href}
                  className="block w-full px-4 py-3 min-h-[44px] bg-[#0B72B5] text-white rounded-lg hover:bg-[#085A90] text-center transition-colors"
                >
                  {option.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* License & Support */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            {t("license.heading")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg p-8 border border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {t("license.openSourceTitle")}
              </h3>
              <ul className="space-y-3 text-sm text-gray-700">
                {openSourceItems.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-white rounded-lg p-8 border-2 border-[#0B72B5]">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                {t("license.enterpriseTitle")}
              </h3>
              <ul className="space-y-3 text-sm text-gray-700">
                {enterpriseItems.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 bg-[#085A90] text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-6">{t("cta.heading")}</h2>
          <p className="text-lg text-white/90 mb-8">{t("cta.description")}</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:info@openindu.com"
              className="inline-flex items-center justify-center px-8 py-3 min-h-[44px] bg-white text-[#085A90] rounded-lg hover:bg-sky-50 transition-colors font-medium"
            >
              {t("cta.contact")}
              <ArrowRight className="ml-2 h-5 w-5" />
            </a>
            <Link
              to="/use-cases"
              className="inline-flex items-center justify-center px-8 py-3 min-h-[44px] border-2 border-white text-white rounded-lg hover:bg-white/10 transition-colors font-medium"
            >
              {t("cta.useCases")}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Pricing;
