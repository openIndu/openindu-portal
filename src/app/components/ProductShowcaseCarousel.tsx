import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { productScreenshots } from "@/assets/product-images";

const AUTOPLAY_MS = 5000;

const SLIDES = [
  {
    key: "workbench",
    ns: "iiot",
    image: productScreenshots.workbench,
    titleKey: "features.workbench.title",
    altKey: "features.workbench.screenshotAlt",
    to: "/iiot-platform",
  },
  {
    key: "dashboard",
    ns: "iiot",
    image: productScreenshots.dashboard,
    titleKey: "features.dashboard.title",
    altKey: "features.dashboard.screenshotAlt",
    to: "/iiot-platform",
  },
  {
    key: "deviceManagement",
    ns: "iiot",
    image: productScreenshots.deviceMgmt,
    titleKey: "features.deviceManagement.title",
    altKey: "features.deviceManagement.screenshotAlt",
    to: "/iiot-platform",
  },
  {
    key: "traceability",
    ns: "iiot",
    image: productScreenshots.traceability,
    titleKey: "features.traceability.title",
    altKey: "features.traceability.screenshotAlt",
    to: "/iiot-platform",
  },
  {
    key: "stationOverview",
    ns: "station",
    image: productScreenshots.stationOverview,
    titleKey: "screenshots.overviewCaption",
    altKey: "screenshots.overviewAlt",
    to: "/vision/station",
  },
  {
    key: "stationVision",
    ns: "station",
    image: productScreenshots.stationVision,
    titleKey: "screenshots.visionCaption",
    altKey: "screenshots.visionAlt",
    to: "/vision/station",
  },
] as const;

export function ProductShowcaseCarousel() {
  const { t } = useTranslation(["home", "iiot", "station"]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const total = SLIDES.length;

  const goTo = useCallback((i: number) => setIndex(((i % total) + total) % total), [total]);

  useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % total), AUTOPLAY_MS);
    return () => clearInterval(id);
  }, [paused, total]);

  return (
    <section className="pt-6 pb-16 sm:pt-8 sm:pb-20 bg-white overflow-hidden">
      <div className="text-center mb-10 sm:mb-12 px-4 sm:px-6 lg:px-8">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-3">
          {t("home:showcase.heading")}
        </h2>
        <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto">
          {t("home:showcase.subheading")}
        </p>
      </div>

      <div
        className="relative w-full"
        role="region"
        aria-roledescription="carousel"
        aria-label={t("home:showcase.heading")}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
      >
        <div className="overflow-hidden bg-white">
          <div
            className="flex transition-transform duration-700 ease-out"
            style={{ transform: `translateX(-${index * 100}%)` }}
          >
            {SLIDES.map((slide, i) => (
              <Link
                key={slide.key}
                to={slide.to}
                className="w-full flex-shrink-0 group"
                aria-hidden={i !== index}
                tabIndex={i === index ? 0 : -1}
              >
                <div className="max-w-6xl mx-auto aspect-video p-3 sm:p-6 lg:p-8 flex items-center justify-center">
                  <img
                    src={slide.image.src}
                    width={slide.image.width}
                    height={slide.image.height}
                    alt={t(`${slide.ns}:${slide.altKey}`)}
                    className="block w-auto h-auto max-w-full max-h-full rounded-xl transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transform-none motion-reduce:transition-none"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="pt-6 pb-8 sm:pt-8 sm:pb-10 text-center px-4">
                  <p className="text-base sm:text-lg font-semibold text-gray-900">
                    {t(`${slide.ns}:${slide.titleKey}`)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => goTo(index - 1)}
          aria-label={t("home:showcase.prev")}
          className="absolute left-3 sm:left-6 lg:left-10 top-[35%] -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/90 backdrop-blur shadow-lg flex items-center justify-center text-[#0B72B5] hover:bg-white hover:scale-105 transition-all"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <button
          type="button"
          onClick={() => goTo(index + 1)}
          aria-label={t("home:showcase.next")}
          className="absolute right-3 sm:right-6 lg:right-10 top-[35%] -translate-y-1/2 w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/90 backdrop-blur shadow-lg flex items-center justify-center text-[#0B72B5] hover:bg-white hover:scale-105 transition-all"
        >
          <ChevronRight className="w-6 h-6" />
        </button>

        <div className="flex justify-center gap-2 mt-6">
          {SLIDES.map((slide, i) => (
            <button
              key={slide.key}
              type="button"
              onClick={() => goTo(i)}
              aria-label={t("home:showcase.goTo", { n: i + 1 })}
              aria-current={i === index}
              className={`h-2.5 rounded-full transition-all ${i === index ? "w-8 bg-[#0B72B5]" : "w-2.5 bg-gray-300 hover:bg-gray-400"}`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default ProductShowcaseCarousel;
