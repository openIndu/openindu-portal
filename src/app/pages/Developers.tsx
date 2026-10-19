import { useTranslation } from "react-i18next";
import { ArrowRight, BookOpen, Rocket, Code, Users, GitBranch } from "lucide-react";
import { SEO } from "../components/SEO";

const GH = "https://github.com/openIndu";
const COMMUNITY = `${GH}/community`;
// CONTRIBUTING lives in the community repo — openIndu-portal is not public.
const CONTRIBUTING = `${COMMUNITY}/blob/main/CONTRIBUTING.md`;

const quickStartKeys = [
  { num: 1, link: GH },
  { num: 2, link: COMMUNITY },
  { num: 3, link: null },
  { num: 4, link: CONTRIBUTING },
] as const;

const resourceKeys = [
  { key: "architecture", icon: BookOpen, href: GH },
  { key: "api", icon: Code, href: GH },
  { key: "setup", icon: GitBranch, href: GH },
  { key: "contributing", icon: Users, href: CONTRIBUTING },
] as const;

const projectKeys = [
  { key: "studio", name: "openIndu-studio", href: GH },
  { key: "platform", name: "openIndu-platform", href: GH },
  { key: "station", name: "openIndu-station", href: GH },
] as const;

export function Developers() {
  const { t } = useTranslation("developers");

  return (
    <div>
      <SEO title={t("seo.title")} description={t("seo.description")} canonicalPath="/developers" />

      {/* Hero */}
      <section className="bg-gradient-to-b from-sky-50 via-white to-white pt-16 sm:pt-24 pb-10 sm:pb-14">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-sky-50 border border-sky-200 text-[#0B72B5] rounded-full text-sm font-semibold mb-5">
              <Code className="w-4 h-4" />
              {t("hero.badge")}
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              {t("hero.title")}
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
              {t("hero.subtitle")}
            </p>
          </div>
        </div>
      </section>

      {/* Quick Start */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            {t("quickStart.heading")}
          </h2>
          <div className="space-y-4">
            {quickStartKeys.map((step) => (
              <div key={step.num} className="flex gap-6">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-[#0B72B5] text-white font-bold">
                    {step.num}
                  </div>
                </div>
                <div className="flex-grow pt-1">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {t(`quickStart.step${step.num}Title`)}
                  </h3>
                  <p className="text-gray-600 mt-1">{t(`quickStart.step${step.num}Desc`)}</p>
                  {step.link && (
                    <a
                      href={step.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0B72B5] hover:text-[#085A90] inline-flex min-h-[44px] items-center gap-1"
                    >
                      {t("quickStart.learnMore")} <ArrowRight className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Resources */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            {t("resources.heading")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {resourceKeys.map((resource) => (
              <a
                key={resource.key}
                href={resource.href}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-sky-50 text-[#0B72B5] flex items-center justify-center flex-shrink-0">
                    <resource.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-grow">
                    <h3 className="font-semibold text-gray-900">
                      {t(`resources.${resource.key}Title`)}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      {t(`resources.${resource.key}Desc`)}
                    </p>
                    <span className="text-[#0B72B5] text-sm mt-2 inline-flex items-center gap-1">
                      {t("resources.view")} <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Three Core Projects */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">
            {t("projects.heading")}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {projectKeys.map((project) => (
              <div
                key={project.key}
                className="rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow"
              >
                <h3 className="font-semibold text-gray-900 mb-2">{project.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{t(`projects.${project.key}Desc`)}</p>
                <a
                  href={project.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#0B72B5] hover:text-[#085A90] text-sm inline-flex min-h-[44px] items-center gap-1"
                >
                  {t("projects.explore")} <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contribution Path */}
      <section className="py-16 sm:py-20 bg-[#085A90] text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <Rocket className="w-16 h-16 mx-auto mb-6" />
          <h2 className="text-3xl font-bold mb-6">{t("cta.heading")}</h2>
          <p className="text-lg text-white/90 mb-8 max-w-2xl mx-auto">{t("cta.description")}</p>
          <a
            href={GH}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-8 py-4 bg-white text-[#085A90] rounded-lg hover:bg-sky-50 transition-colors font-medium"
          >
            {t("cta.button")}
            <ArrowRight className="ml-2 w-5 h-5" />
          </a>
        </div>
      </section>
    </div>
  );
}

export default Developers;
