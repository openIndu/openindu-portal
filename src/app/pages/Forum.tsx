import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  MessageCircle,
  Code,
  Cpu,
  Lightbulb,
  Building2,
  LifeBuoy,
  MessageSquare,
} from "lucide-react";
import { SEO } from "../components/SEO";

export function Forum() {
  const { t } = useTranslation("common");

  const categoryKeys = [
    {
      key: "industrialControl",
      icon: Code,
      href: "https://forum.openindu.com/c/industrial-control/5",
    },
    { key: "automation", icon: Cpu, href: "https://forum.openindu.com/c/automation/6" },
    { key: "process", icon: Lightbulb, href: "https://forum.openindu.com/c/process/7" },
    { key: "insights", icon: Building2, href: "https://forum.openindu.com/c/9" },
    { key: "help", icon: LifeBuoy, href: "https://forum.openindu.com/c/community/8" },
    { key: "feedback", icon: MessageSquare, href: "https://forum.openindu.com/c/feedback/2" },
  ] as const;

  const categories = categoryKeys.map((c) => ({
    ...c,
    title: t(`forumPage.${c.key}.title`),
    description: t(`forumPage.${c.key}.description`),
    topics: t(`forumPage.${c.key}.topics`, { returnObjects: true }) as string[],
  }));

  return (
    <div>
      <SEO
        title={`${t("nav.forum")} | openIndu Community`}
        description={t("forumPage.seoDescription")}
        canonicalPath="/forum"
      />

      {/* Hero Section */}
      <section className="bg-gradient-to-b from-sky-50 via-white to-white py-16 sm:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 bg-sky-100 text-sky-800 rounded-full text-xs sm:text-sm font-semibold mb-5">
              <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {t("forumPage.badge")}
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
              {t("nav.forum")}
            </h1>
            <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              {t("forumPage.subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://forum.openindu.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-8 py-4 bg-sky-700 text-white rounded-lg hover:bg-[#085A90] transition-colors font-medium"
              >
                {t("forumPage.enterForum")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
              <a
                href="https://github.com/openIndu/community"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-8 py-4 bg-white text-gray-900 border-2 border-gray-200 rounded-lg hover:border-sky-700 hover:text-sky-700 transition-colors font-medium"
              >
                {t("forumPage.communityRepo")}
                <ArrowRight className="ml-2 h-5 w-5" />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-16 sm:py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              {t("forumPage.categoriesHeading")}
            </h2>
            <p className="text-base sm:text-lg text-gray-600">
              {t("forumPage.categoriesSubheading")}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {categories.map((category) => (
              <a
                key={category.key}
                href={category.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-white rounded-xl p-6 sm:p-8 shadow-sm border border-gray-100 hover:shadow-lg hover:border-sky-200 transition-all"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-sky-100 text-sky-700">
                    <category.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-900">
                    {category.title}
                  </h3>
                </div>
                <p className="text-gray-600 mb-4 leading-relaxed">{category.description}</p>
                <div className="border-t border-gray-100 pt-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-3">
                    {t("forumPage.hotTopics")}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {category.topics.map((topic) => (
                      <span
                        key={topic}
                        className="inline-block px-3 py-1 bg-sky-50 text-sky-800 rounded-full text-sm"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 bg-[#085A90] text-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-6">{t("forumPage.ctaHeading")}</h2>
          <p className="text-lg sm:text-xl mb-8 text-white/90 max-w-2xl mx-auto">
            {t("forumPage.ctaDescription")}
          </p>
          <a
            href="https://forum.openindu.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-8 py-4 bg-white text-[#085A90] rounded-lg hover:bg-sky-50 transition-colors font-medium"
          >
            {t("forumPage.ctaButton")}
          </a>
        </div>
      </section>
    </div>
  );
}

export default Forum;
