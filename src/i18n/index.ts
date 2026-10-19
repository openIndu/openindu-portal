import i18next from "i18next";
import { initReactI18next } from "react-i18next";
import { detectLocale } from "./locale";

// Auto-register every locale namespace under src/locales/{locale}/*.json.
// Uses Vite's import.meta.glob so zero manual import list to maintain —
// adding a new namespace file is enough to register it.
const localeModules = import.meta.glob<{ default: Record<string, string> }>("../locales/*/*.json", {
  eager: true,
});

const resources: Record<string, Record<string, Record<string, string>>> = {};

for (const [filePath, mod] of Object.entries(localeModules)) {
  // filePath: "./locales/en/common.json"
  const match = filePath.match(/\/locales\/([^/]+)\/([^/]+)\.json$/);
  if (!match) continue;
  const [, lng, ns] = match;
  resources[lng] ??= {};
  resources[lng][ns] = mod.default;
}

i18next.use(initReactI18next).init({
  resources,
  lng: detectLocale(),
  fallbackLng: "zh",
  interpolation: { escapeValue: false }, // React already escapes
  initImmediate: false, // resources are eager-loaded synchronously; first render must be final (prerender safety)
  react: { useSuspense: false },
});

export { i18next };
export default i18next;
