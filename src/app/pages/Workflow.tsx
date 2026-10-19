import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  Bot,
  Cpu,
  FileSpreadsheet,
  ListChecks,
  MonitorCog,
  Workflow as WorkflowIcon,
  Zap,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { SEO } from "../components/SEO";
import { Card, CardContent } from "../components/ui/card";

const stepKeys = [
  { key: "electrical", icon: Zap },
  { key: "circuit", icon: WorkflowIcon },
  { key: "bom", icon: FileSpreadsheet },
  { key: "io", icon: ListChecks },
  { key: "plc", icon: Cpu },
  { key: "hmi", icon: MonitorCog },
] as const;

export function Workflow() {
  const { t } = useTranslation("studio");
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  function toggleStep(index: number) {
    setExpandedStep((current) => (current === index ? null : index));
  }

  const steps = stepKeys.map((step) => ({
    ...step,
    title: t(`steps.${step.key}.title`),
    description: t(`steps.${step.key}.description`),
    deliverables: t(`steps.${step.key}.deliverables`, { returnObjects: true }) as string[],
  }));

  const artifactItems = t("artifactChain.items", { returnObjects: true }) as string[];

  return (
    <section className="bg-gradient-to-br from-slate-50 via-white to-sky-50 px-4 py-12 sm:px-6 lg:px-8">
      <SEO
        title={t("seo.title")}
        description={t("seo.description")}
        keywords={t("seo.keywords")}
        canonicalPath="/motion-control/studio"
      />
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-sky-100 px-4 py-2 text-sm font-semibold text-sky-800">
            <Bot className="h-4 w-4" />
            {t("hero.badge")}
          </div>
          <h1 className="text-4xl font-bold text-gray-900">{t("hero.title")}</h1>
          <p className="mx-auto mt-4 max-w-3xl text-lg text-gray-600">{t("hero.subtitle")}</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          {steps.map((step, index) => {
            const isExpanded = expandedStep === index;
            return (
              <Card
                key={step.key}
                className="cursor-pointer border-sky-100 bg-white/90 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                onClick={() => toggleStep(index)}
              >
                <CardContent className="p-6">
                  <div className="flex gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#0B72B5] to-cyan-600 text-white shadow-md">
                      <step.icon className="h-7 w-7" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-2 flex items-center gap-3">
                        <span className="rounded-full bg-sky-50 px-3 py-1 text-sm font-semibold text-sky-800">
                          {t("stepLabel")} {index + 1}
                        </span>
                        {index < steps.length - 1 && (
                          <ArrowRight className="hidden h-4 w-4 text-gray-400 sm:block" />
                        )}
                        <div className="ml-auto shrink-0">
                          {isExpanded ? (
                            <ChevronUp className="h-5 w-5 text-sky-700" />
                          ) : (
                            <ChevronDown className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                      <h2 className="mb-2 text-xl font-semibold text-gray-900">{step.title}</h2>
                      {isExpanded ? (
                        <div className="space-y-4">
                          <p className="leading-relaxed text-gray-600">{step.description}</p>
                          <div>
                            <p className="mb-2 text-sm font-semibold text-gray-900">
                              {t("deliverablesLabel")}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              {step.deliverables.map((item) => (
                                <span
                                  key={item}
                                  className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-800"
                                >
                                  {item}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <p className="leading-relaxed text-gray-500 text-sm">{step.description}</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-sky-100 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-2xl font-semibold text-gray-900">
              {t("artifactChain.heading")}
            </h2>
            <p className="mb-4 text-gray-600">{t("artifactChain.description")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {artifactItems.map((item) => (
                <div
                  key={item}
                  className="rounded-xl bg-sky-50 px-4 py-3 text-sm font-medium text-sky-800"
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-sky-100 bg-white p-6 shadow-sm">
            <h2 className="mb-3 text-2xl font-semibold text-gray-900">{t("roadmap.heading")}</h2>
            <p className="text-gray-600">{t("roadmap.description")}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
