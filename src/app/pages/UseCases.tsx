import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, CheckCircle } from "lucide-react";
import { SEO } from "../components/SEO";

// Industries and stage names follow the community research baseline
// (panel / semiconductor / new energy). The former "工程指标" figures
// ("良率提升 15-20%", "键合成功率 99.8%" …) were not sourced from anything
// and the research material is explicitly marked "公开资料整理；非量产配方",
// so each case now states which stage of the chain openIndu touches
// instead of quoting invented numbers.
const caseKeys = ["panel", "semiconductor", "newEnergy"] as const;

// Each solution slot has its own tint so the four layers stay distinguishable
// at a glance; the label text itself lives in the locale files.
const solutionSlots = [
  { field: "hardware", label: "labels.hardware", box: "bg-sky-50 border-sky-700" },
  { field: "vision", label: "labels.vision", box: "bg-green-50 border-green-600" },
  { field: "data", label: "labels.data", box: "bg-cyan-50 border-cyan-600" },
  { field: "craftsmanship", label: "labels.craftsmanship", box: "bg-amber-50 border-amber-600" },
] as const;

export function UseCases() {
  const { t } = useTranslation("use-cases");

  const useCases = caseKeys.map((key) => ({
    key,
    industry: t(`cases.${key}.industry`),
    problem: t(`cases.${key}.problem`),
    solution: {
      hardware: t(`cases.${key}.hardware`),
      vision: t(`cases.${key}.vision`),
      data: t(`cases.${key}.data`),
      craftsmanship: t(`cases.${key}.craftsmanship`),
    },
    stages: t(`cases.${key}.stages`, { returnObjects: true }) as string[],
    whyWorks: t(`cases.${key}.whyWorks`),
  }));

  const whyEffective = t("whyEffective.items", { returnObjects: true }) as {
    title: string;
    description: string;
  }[];

  return (
    <div>
      <SEO title={t("seo.title")} description={t("seo.description")} canonicalPath="/use-cases" />

      {/* Hero */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              {t("hero.title")}
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
              {t("hero.subtitle")}
            </p>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-12">
            {useCases.map((useCase, idx) => (
              <div
                key={useCase.key}
                className="bg-white border-l-4 border-sky-700 rounded-lg p-6 sm:p-8 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
                    {idx + 1}. {useCase.industry}
                  </h2>
                  <p className="text-gray-600">{t("labels.solutionSubtitle")}</p>
                </div>

                {/* Problem */}
                <div className="mb-8">
                  <h3 className="font-semibold text-lg text-gray-900 mb-3">
                    {t("labels.challenge")}
                  </h3>
                  <p className="text-gray-700 leading-relaxed">{useCase.problem}</p>
                </div>

                {/* Solution */}
                <div className="mb-8">
                  <h3 className="font-semibold text-lg text-gray-900 mb-4">
                    {t("labels.solution")}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {solutionSlots.map((slot) => (
                      <div key={slot.field} className={`${slot.box} border-l-4 p-4 rounded`}>
                        <p className="font-medium text-gray-900 mb-2">{t(slot.label)}</p>
                        <p className="text-gray-700 text-sm">{useCase.solution[slot.field]}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* End-to-end chain */}
                <div className="mb-8">
                  <h3 className="font-semibold text-lg text-gray-900 mb-3">{t("labels.chain")}</h3>
                  <div className="flex flex-wrap gap-3">
                    {useCase.stages.map((stage) => (
                      <div
                        key={stage}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-sky-100 text-[#0B72B5] rounded-full text-sm font-medium"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {stage}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Why It Works */}
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    <strong>{t("labels.whyWorks")}</strong> {useCase.whyWorks}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Effective */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t("whyEffective.heading")}</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">{t("whyEffective.subheading")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {whyEffective.map((item) => (
              <div key={item.title} className="bg-white p-6 rounded-lg border border-gray-200">
                <h3 className="font-semibold text-lg text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-700 text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Next Steps */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            {t("nextSteps.heading")}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
            {[1, 2, 3].map((n) => (
              <div key={n} className="text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#0B72B5] text-white font-bold text-lg mb-4">
                  {n}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{t(`nextSteps.step${n}Title`)}</h3>
                <p className="text-gray-600 text-sm">{t(`nextSteps.step${n}Desc`)}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
            <Link
              to="/architecture"
              className="inline-flex items-center justify-center px-8 py-4 bg-[#0B72B5] text-white rounded-lg hover:bg-[#085A90] transition-colors font-medium"
            >
              {t("nextSteps.ctaArchitecture")}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <Link
              to="/craftsmanship"
              className="inline-flex items-center justify-center px-8 py-4 border-2 border-[#0B72B5] text-[#0B72B5] rounded-lg hover:bg-sky-50 transition-colors font-medium"
            >
              {t("nextSteps.ctaCraftsmanship")}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <a
              href="https://github.com/openIndu"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              {t("nextSteps.ctaStudio")}
              <ArrowRight className="ml-2 h-5 w-5" />
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

export default UseCases;
