import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  Cpu,
  Shield,
  LayoutDashboard,
  Monitor,
  Database,
  Smartphone,
  Users,
  Layers,
  Server,
  CheckCircle,
  Network,
  Zap,
  BarChart3,
} from "lucide-react";
import { productScreenshots, type Screenshot } from "@/assets/product-images";
import { SEO } from "../components/SEO";

const featureKeys = [
  // Subtitles come from i18n: they are prose captions, and leaving them in
  // English put English sentences on every Chinese screenshot card.
  {
    key: "smartLogin",
    icon: Shield,
    iconColor: "text-sky-700",
    iconBg: "bg-sky-100",
    screenshot: productScreenshots.login,
  },
  {
    key: "workbench",
    icon: LayoutDashboard,
    iconColor: "text-cyan-600",
    iconBg: "bg-cyan-100",
    screenshot: productScreenshots.workbench,
  },
  {
    key: "dashboard",
    icon: Monitor,
    iconColor: "text-purple-600",
    iconBg: "bg-purple-100",
    screenshot: productScreenshots.dashboard,
  },
  {
    key: "deviceManagement",
    icon: Database,
    iconColor: "text-green-600",
    iconBg: "bg-green-100",
    screenshot: productScreenshots.deviceMgmt,
  },
  {
    key: "traceability",
    icon: BarChart3,
    iconColor: "text-orange-600",
    iconBg: "bg-orange-100",
    screenshot: productScreenshots.traceability,
  },
  {
    key: "miniProgram",
    icon: Smartphone,
    iconColor: "text-pink-600",
    iconBg: "bg-pink-100",
    screenshot: productScreenshots.miniProgram,
    isTall: true,
  },
] as const;

const advantageKeys = [
  { key: "industryFocus", icon: Cpu },
  { key: "traceability", icon: Network },
  { key: "frontend", icon: LayoutDashboard },
  { key: "deviceCompat", icon: Server },
  { key: "cloudEdge", icon: Layers },
  { key: "community", icon: Users },
] as const;

const techLayerKeys = [
  {
    key: "webFrontend",
    layer: 8,
    badgeBg: "bg-sky-100",
    badgeText: "text-sky-800",
    iconBg: "bg-sky-700",
  },
  // cyan/green/orange/yellow-600 fail WCAG AA for white text (2.9-3.6:1) --
  // bumped one shade to -700; blue/purple/red/indigo-600 already pass.
  {
    key: "backend",
    layer: 7,
    badgeBg: "bg-cyan-100",
    badgeText: "text-cyan-700",
    iconBg: "bg-cyan-700",
  },
  {
    key: "edgeGateway",
    layer: 6,
    badgeBg: "bg-green-100",
    badgeText: "text-green-800",
    iconBg: "bg-green-700",
  },
  {
    key: "dataAcquisition",
    layer: 5,
    badgeBg: "bg-purple-100",
    badgeText: "text-purple-700",
    iconBg: "bg-purple-600",
  },
  {
    key: "businessDb",
    layer: 4,
    badgeBg: "bg-orange-100",
    badgeText: "text-orange-700",
    iconBg: "bg-orange-700",
  },
  {
    key: "timeseriesDb",
    layer: 3,
    badgeBg: "bg-red-100",
    badgeText: "text-red-700",
    iconBg: "bg-red-600",
  },
  {
    key: "cache",
    layer: 2,
    badgeBg: "bg-yellow-100",
    badgeText: "text-yellow-700",
    iconBg: "bg-yellow-700",
  },
  {
    key: "messageBroker",
    layer: 1,
    badgeBg: "bg-indigo-100",
    badgeText: "text-indigo-700",
    iconBg: "bg-indigo-600",
  },
] as const;

const dataFlowColors = [
  "bg-orange-100 text-orange-700",
  "bg-red-100 text-red-700",
  "bg-purple-100 text-purple-700",
  "bg-indigo-100 text-indigo-700",
  "bg-green-100 text-green-800",
  "bg-cyan-100 text-cyan-700",
  "bg-sky-100 text-sky-800",
];

type Feature = {
  key: string;
  icon: typeof Shield;
  iconColor: string;
  iconBg: string;
  screenshot: Screenshot;
  isTall?: boolean;
};

type TFn = ReturnType<typeof useTranslation<"iiot">>["t"];

function FeatureRow({ feature, reversed, t }: { feature: Feature; reversed: boolean; t: TFn }) {
  const Icon = feature.icon;
  const details = t(`features.${feature.key}.details`, {
    returnObjects: true,
  }) as unknown as string[];
  return (
    <div
      className={`flex flex-col items-center gap-8 lg:gap-12 lg:flex-row ${reversed ? "lg:flex-row-reverse" : ""}`}
    >
      {/* Screenshot */}
      <div className={`w-full lg:w-3/5 ${feature.isTall ? "flex justify-center" : ""}`}>
        <div
          className={`rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-white ${feature.isTall ? "max-w-[220px]" : ""}`}
        >
          <img
            src={feature.screenshot.src}
            width={feature.screenshot.width}
            height={feature.screenshot.height}
            alt={t(`features.${feature.key}.screenshotAlt`)}
            className="w-full h-auto"
            loading="lazy"
            decoding="async"
          />
        </div>
      </div>
      {/* Content */}
      <div className="w-full lg:w-2/5">
        <div className="flex items-center gap-3 mb-3">
          <div
            className={`flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 ${feature.iconBg} rounded-xl flex-shrink-0`}
          >
            <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${feature.iconColor}`} />
          </div>
          <div className="min-w-0">
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 leading-tight">
              {t(`features.${feature.key}.title`)}
            </h3>
            <p className="text-xs sm:text-sm text-gray-600 truncate">
              {t(`features.${feature.key}.subtitle`)}
            </p>
          </div>
        </div>
        <p className="text-sm sm:text-base text-gray-600 mb-4">
          {t(`features.${feature.key}.description`)}
        </p>
        <ul className="space-y-2">
          {details.map((detail) => (
            <li key={detail} className="flex items-start gap-2 text-gray-700">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <span className="text-sm">{detail}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function IIoTPlatform() {
  const { t } = useTranslation("iiot");
  const introChain = t("intro.p1Chain", { returnObjects: true }) as string[];
  const dataFlowChain = t("dataFlow.chain", { returnObjects: true }) as string[];

  return (
    <div>
      <SEO
        title={t("seo.title")}
        description={t("seo.description")}
        keywords={t("seo.keywords")}
        canonicalPath="/iiot-platform"
      />
      {/* ===== Hero Section ===== */}
      <section className="bg-gradient-to-b from-sky-50 via-white to-white py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-sky-50 border border-sky-200 text-[#0B72B5] rounded-full text-sm font-semibold mb-4 sm:mb-6">
            <Zap className="w-4 h-4" />
            openIndu-platform
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 sm:mb-4 leading-tight text-gray-900 [word-break:keep-all]">
            {t("hero.title1")}
            <br />
            {t("hero.title2")}
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-gray-600 mb-6 sm:mb-8 font-light">
            {t("hero.subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8 sm:mb-10">
            <a
              href="https://website.openindu.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[48px] items-center justify-center px-6 sm:px-8 bg-[#0B72B5] text-white rounded-lg hover:bg-[#085A90] transition-colors font-semibold text-base sm:text-lg"
            >
              {t("hero.ctaPrimary")}
              <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
            </a>
            <a
              href="#architecture"
              className="inline-flex min-h-[48px] items-center justify-center px-6 sm:px-8 bg-white border border-gray-300 text-gray-800 rounded-lg hover:border-[#0B72B5] hover:text-[#0B72B5] transition-colors font-semibold text-base sm:text-lg"
            >
              {t("hero.ctaSecondary")}
            </a>
          </div>
          <div className="inline-flex items-center border border-sky-200 bg-sky-50 rounded-xl px-4 py-4 sm:px-6 sm:py-4">
            <div className="text-center">
              <p className="text-xs text-gray-600 mb-1">{t("hero.demoLabel")}</p>
              <p className="text-sm font-mono text-gray-900">website.openindu.com</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Platform Intro ===== */}
      <section className="py-10 sm:py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">
              {t("intro.heading")}
            </h2>
            <p className="text-base sm:text-lg text-gray-600 leading-relaxed mb-4 sm:mb-6">
              {t("intro.p1Prefix")}
              {introChain.map((step, i) => (
                <span key={step}>
                  {i > 0 && "→"}
                  <span className="font-semibold text-sky-700">{step}</span>
                </span>
              ))}
              {t("intro.p1Suffix")}
            </p>
            <p className="text-base sm:text-lg text-gray-600 leading-relaxed">
              {t("intro.p2Prefix")}
              <strong className="text-gray-900">{t("intro.p2Strong1")}</strong>
              {t("intro.p2Mid1")}
              <strong className="text-gray-900">{t("intro.p2Strong2")}</strong>
              {t("intro.p2Mid2")}
            </p>
          </div>
        </div>
      </section>

      {/* ===== Core Features ===== */}
      <section className="py-12 sm:py-20 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-4">
              {t("features.heading")}
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              {t("features.subheading")}
            </p>
          </div>

          <div className="space-y-12 sm:space-y-24">
            {featureKeys.map((feature, index) => (
              <FeatureRow key={feature.key} feature={feature} reversed={index % 2 === 1} t={t} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== Architecture ===== */}
      <section id="architecture" className="py-12 sm:py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-4">
              {t("architecture.heading")}
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              {t("architecture.subheading")}
            </p>
          </div>

          {/* Architecture Diagram */}
          <div className="mb-10 sm:mb-16 max-w-4xl mx-auto">
            <div className="rounded-2xl overflow-hidden shadow-lg border border-gray-200 bg-white p-3 sm:p-4">
              <img
                src="/assets/iiot/architecture.svg"
                alt={t("architecture.diagramAlt")}
                width="960"
                height="640"
                loading="lazy"
                decoding="async"
                className="w-full h-auto"
              />
            </div>
          </div>

          {/* Tech Layers */}
          <div className="space-y-3 sm:space-y-4 max-w-4xl mx-auto">
            {techLayerKeys.map((layer) => (
              <div
                key={layer.key}
                className="bg-white p-4 sm:p-5 rounded-xl border-2 border-gray-200 hover:shadow-lg transition-all"
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <div
                    className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex-shrink-0 text-white text-xs sm:text-sm font-bold ${layer.iconBg}`}
                  >
                    L{layer.layer}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                        {t(`architecture.layers.${layer.key}.name`)}
                      </h3>
                      <span
                        className={`px-2 py-0.5 ${layer.badgeBg} ${layer.badgeText} rounded text-xs font-medium`}
                      >
                        Layer {layer.layer}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-500 font-mono mb-1 break-all">
                      {t(`architecture.layers.${layer.key}.tech`)}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600">
                      {t(`architecture.layers.${layer.key}.desc`)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Data Flow */}
          <div className="mt-8 sm:mt-12 max-w-4xl mx-auto bg-gradient-to-r from-blue-50 via-purple-50 to-cyan-50 p-4 sm:p-6 rounded-xl border border-gray-200">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
              {t("dataFlow.heading")}
            </h3>
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-gray-700">
              {dataFlowChain.map((step, i) => (
                <span key={step} className="flex items-center gap-2">
                  {i > 0 && (
                    <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400 flex-shrink-0" />
                  )}
                  <span
                    className={`px-2 sm:px-3 py-1 ${dataFlowColors[i]} rounded whitespace-nowrap font-medium`}
                  >
                    {step}
                  </span>
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===== Advantages ===== */}
      <section className="py-12 sm:py-20 bg-gradient-to-br from-blue-50 via-cyan-50 to-blue-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-4">
              {t("advantages.heading")}
            </h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              {t("advantages.subheading")}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {advantageKeys.map((adv) => {
              const Icon = adv.icon;
              return (
                <div
                  key={adv.key}
                  className="bg-white rounded-xl p-4 sm:p-6 shadow-sm hover:shadow-lg transition-all"
                >
                  <div className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-600 to-cyan-600 text-white rounded-lg mb-3 sm:mb-4">
                    <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1 sm:mb-2">
                    {t(`advantages.${adv.key}.title`)}
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600">
                    {t(`advantages.${adv.key}.description`)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
