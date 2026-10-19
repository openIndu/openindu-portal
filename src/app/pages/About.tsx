import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, CheckCircle, Users, Zap, Globe, Code } from "lucide-react";
import { SEO } from "../components/SEO";

const domainKeys = [
  { key: "industrialControl", icon: Code },
  { key: "automation", icon: Zap },
  { key: "process", icon: Globe },
] as const;

export function About() {
  const { t } = useTranslation("about");

  const domainProducts = domainKeys.map((d) => ({
    ...d,
    domain: t(`domains.${d.key}.domain`),
    description: t(`domains.${d.key}.description`),
    product: t(`domains.${d.key}.product`),
  }));

  return (
    <div>
      <SEO title={t("seo.title")} description={t("seo.description")} canonicalPath="/about" />

      {/* Hero */}
      <section className="bg-gradient-to-b from-sky-50 via-white to-white pt-16 sm:pt-24 pb-10 sm:pb-14">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              {t("hero.title")}
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              {t("hero.subtitle")}
            </p>
          </div>
        </div>
      </section>

      {/* Problem & Mission */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">{t("problem.heading")}</h2>
              <p className="text-lg text-gray-600 mb-4 leading-relaxed">{t("problem.intro")}</p>
              <ul className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <li key={n} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-sky-700 flex-shrink-0 mt-1" />
                    <span className="text-gray-700">
                      <strong>{t(`problem.item${n}Label`)}:</strong> {t(`problem.item${n}`)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">{t("solution.heading")}</h2>
              <p className="text-lg text-gray-600 mb-4 leading-relaxed">{t("solution.intro")}</p>
              <ul className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <li key={n} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-sky-700 flex-shrink-0 mt-1" />
                    <span className="text-gray-700">{t(`solution.item${n}`)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Domain to Product Mapping */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t("domains.heading")}</h2>
            <p className="text-gray-600">{t("domains.subheading")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {domainProducts.map((item) => (
              <div
                key={item.key}
                className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-semibold text-gray-900">{item.domain}</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">{item.description}</p>
                <div className="bg-sky-50 p-3 rounded border border-sky-200">
                  <p className="text-xs font-semibold text-sky-800 uppercase tracking-wide">
                    {t("domains.productLabel")}
                  </p>
                  <p className="text-sm font-medium text-[#0B72B5] mt-1">{item.product}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Values */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            {t("principles.heading")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: Code, key: "openSource" },
              { icon: Globe, key: "endToEnd" },
              { icon: Users, key: "community" },
            ].map(({ icon: Icon, key }) => (
              <div key={key} className="text-center">
                <Icon className="w-12 h-12 text-sky-700 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t(`principles.${key}Title`)}
                </h3>
                <p className="text-gray-600">{t(`principles.${key}Desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 bg-[#085A90] text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-6">{t("cta.heading")}</h2>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/motion-control/studio"
              className="inline-flex items-center justify-center px-8 py-3 bg-white text-[#085A90] rounded-lg hover:bg-sky-50 transition-colors font-medium"
            >
              {t("cta.studio")}
              <ArrowRight className="ml-2 w-4 h-4" />
            </Link>
            <a
              href="https://github.com/openIndu"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-8 py-3 border-2 border-white text-white rounded-lg hover:bg-white/10 transition-colors font-medium"
            >
              {t("cta.github")}
              <ArrowRight className="ml-2 w-4 h-4" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

export default About;
