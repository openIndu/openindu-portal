import { useTranslation } from "react-i18next";
import { Camera, Crosshair, Droplets, Factory, Layers, Zap } from "lucide-react";
import { productScreenshots } from "@/assets/product-images";
import { SEO } from "../components/SEO";

const screenshots = [
  { key: "overview", image: productScreenshots.stationOverview },
  { key: "vision", image: productScreenshots.stationVision },
] as const;

const capabilityKeys = [
  { key: "calibration", icon: Crosshair },
  { key: "matching", icon: Camera },
  { key: "dualCamera", icon: Layers },
] as const;

const productKeys = [
  { key: "dispensing", icon: Droplets },
  { key: "laser", icon: Zap },
] as const;

export function Station() {
  const { t } = useTranslation("station");

  return (
    <div>
      <SEO
        title={t("seo.title")}
        description={t("seo.description")}
        keywords={t("seo.keywords")}
        canonicalPath="/vision/station"
      />
      {/* Hero */}
      <section className="bg-gradient-to-b from-sky-50 via-white to-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-12 h-12 bg-[#0B72B5] text-white rounded-lg">
              <Factory className="w-7 h-7" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900">{t("hero.title")}</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mb-6">{t("hero.subtitle")}</p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[#085A90] rounded-lg border border-sky-200 font-medium">
            {t("hero.badge")}
          </div>
        </div>
      </section>

      {/* Intro */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">{t("intro.heading")}</h2>
            <p className="text-lg text-gray-600 leading-relaxed">{t("intro.description")}</p>
          </div>
        </div>
      </section>

      {/* Screenshots */}
      <section className="py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">{t("screenshots.heading")}</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {screenshots.map((shot) => (
              <figure key={shot.key}>
                <div className="rounded-xl overflow-hidden shadow-lg border border-gray-200 bg-white">
                  <img
                    src={shot.image.src}
                    width={shot.image.width}
                    height={shot.image.height}
                    alt={t(`screenshots.${shot.key}Alt`)}
                    className="w-full h-auto"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <figcaption className="text-sm text-gray-500 mt-3 text-center">
                  {t(`screenshots.${shot.key}Caption`)}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* Capabilities */}
      <section className="py-16 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">{t("capabilities.heading")}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {capabilityKeys.map((capability) => (
              <div
                key={capability.key}
                className="p-6 border border-gray-200 rounded-xl hover:border-[#0B72B5] hover:shadow-lg transition-all"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-sky-100 text-[#0B72B5] rounded-lg mb-4">
                  <capability.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t(`capabilities.${capability.key}.title`)}
                </h3>
                <p className="text-sm text-gray-600">{t(`capabilities.${capability.key}.description`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products */}
      <section className="py-16 bg-gray-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4 text-center">{t("products.heading")}</h2>
          <p className="text-gray-600 mb-12 text-center max-w-3xl mx-auto">{t("products.description")}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {productKeys.map((product) => (
              <div key={product.key} className="bg-white p-8 rounded-xl shadow-sm border border-gray-100">
                <div className="w-12 h-12 bg-[#0B72B5] text-white rounded-lg flex items-center justify-center mb-4">
                  <product.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{t(`products.${product.key}.title`)}</h3>
                <p className="text-gray-600 leading-relaxed">{t(`products.${product.key}.description`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Status + CTA */}
      <section className="py-16 bg-[#085A90] text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold mb-4">{t("cta.heading")}</h2>
          <p className="text-xl mb-4 text-white/90">{t("cta.description")}</p>
          <p className="text-sm mb-8 text-white/90">{t("cta.status")}</p>
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
