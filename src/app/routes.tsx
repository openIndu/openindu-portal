import type { ComponentType } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/Layout";
import { NotFound } from "./components/NotFound";
import { ZhOnlyGuard } from "./components/ZhOnlyGuard";
import { Home } from "./pages/Home";
import { detectLocale } from "@/i18n/locale";

/**
 * Every page except Home is its own chunk, fetched the first time its route is
 * visited, so a first-time visitor no longer downloads the AI chat page's
 * Markdown stack, the legal text and the account screens just to read the home
 * page. Home stays in the entry bundle: it is the landing page for most visits.
 *
 * `.then((m) => m.X)` is type-checked, so a renamed or missing export fails the
 * build instead of leaving a blank page at runtime. Loaders that point at the
 * same module (the legacy aliases, the Resources tabs) share one chunk.
 */
const load = {
  about: () => import("./pages/About").then((m) => m.About),
  account: () => import("./pages/AccountSettings").then((m) => m.AccountSettings),
  mySubmissions: () => import("./pages/MySubmissions").then((m) => m.MySubmissions),
  architecture: () => import("./pages/Architecture").then((m) => m.Architecture),
  chat: () => import("./pages/ChatPage").then((m) => m.default),
  cookies: () => import("./pages/LegalPages").then((m) => m.CookiesPolicy),
  craftsmanship: () => import("./pages/Craftsmanship").then((m) => m.Craftsmanship),
  developers: () => import("./pages/Developers").then((m) => m.Developers),
  edgeComputing: () => import("./pages/EdgeComputing").then((m) => m.EdgeComputing),
  forum: () => import("./pages/Forum").then((m) => m.Forum),
  iiotPlatform: () => import("./pages/IIoTPlatform").then((m) => m.IIoTPlatform),
  legalCenter: () => import("./pages/LegalPages").then((m) => m.LegalIndex),
  legalNotice: () => import("./pages/LegalPages").then((m) => m.LegalNotice),
  login: () => import("./pages/Login").then((m) => m.Login),
  motionControl: () => import("./pages/MotionControl").then((m) => m.MotionControl),
  pricing: () => import("./pages/Pricing").then((m) => m.Pricing),
  privacy: () => import("./pages/LegalPages").then((m) => m.PrivacyPolicy),
  resources: () => import("./pages/Resources").then((m) => m.Resources),
  station: () => import("./pages/Station").then((m) => m.Station),
  studio: () => import("./pages/Workflow").then((m) => m.Workflow),
  team: () => import("./pages/Team").then((m) => m.Team),
  tokenService: () => import("./pages/TokenService").then((m) => m.TokenService),
  useCases: () => import("./pages/UseCases").then((m) => m.UseCases),
  vision: () => import("./pages/Vision").then((m) => m.Vision),
} satisfies Record<string, () => Promise<ComponentType>>;

type Loader = () => Promise<ComponentType>;

const lazyPage = (loader: Loader) => ({
  lazy: async () => ({ Component: await loader() }),
});

/** Same, for pages that exist only in Chinese: EN visitors are sent to the ZH URL. */
const zhOnlyPage = (loader: Loader) => ({
  lazy: async () => {
    const Page = await loader();
    return {
      element: (
        <ZhOnlyGuard>
          <Page />
        </ZhOnlyGuard>
      ),
    };
  },
});

export const router = createBrowserRouter(
  [
    {
      path: "/",
      Component: Layout,
      children: [
        { index: true, Component: Home },
        { path: "architecture", ...lazyPage(load.architecture) },
        { path: "craftsmanship", ...lazyPage(load.craftsmanship) },
        { path: "use-cases", ...lazyPage(load.useCases) },
        { path: "pricing", ...lazyPage(load.pricing) },
        { path: "about", ...lazyPage(load.about) },
        { path: "developers", ...lazyPage(load.developers) },
        { path: "team", ...lazyPage(load.team) },
        { path: "edge-computing", ...lazyPage(load.edgeComputing) },
        { path: "login", ...lazyPage(load.login) },
        { path: "register", element: <Navigate to="/login" replace /> },
        { path: "account", ...lazyPage(load.account) },
        { path: "account/submissions", ...lazyPage(load.mySubmissions) },
        { path: "privacy", ...zhOnlyPage(load.privacy) },
        { path: "legal", ...zhOnlyPage(load.legalNotice) },
        { path: "cookies", ...zhOnlyPage(load.cookies) },
        { path: "legal-center", ...zhOnlyPage(load.legalCenter) },
        { path: "motion-control", ...lazyPage(load.motionControl) },
        // openIndu-studio (formerly "workflow"): sub-page of AI+Motion Control, publicly visible
        { path: "motion-control/studio", ...lazyPage(load.studio) },
        // Chat's RAG knowledge base is Chinese-only — same ZH-only treatment as legal pages.
        { path: "chat", ...zhOnlyPage(load.chat) },
        { path: "vision", ...lazyPage(load.vision) },
        // openIndu-station: sub-page of AI+Vision, publicly visible
        { path: "vision/station", ...lazyPage(load.station) },
        { path: "iiot-platform", ...lazyPage(load.iiotPlatform) },
        // Community forum — may redirect to external platform (Discourse/GitHub Discussions) in future
        { path: "forum", ...lazyPage(load.forum) },
        { path: "infrastructure", ...lazyPage(load.tokenService) },
        { path: "resources", ...lazyPage(load.resources) },
        { path: "resources/documents", ...lazyPage(load.resources) },
        { path: "resources/software", ...lazyPage(load.resources) },
        // Legacy route redirects
        { path: "workflow", element: <Navigate to="/motion-control/studio" replace /> },
        { path: "platform", ...lazyPage(load.iiotPlatform) },
        { path: "features", ...lazyPage(load.iiotPlatform) },
        { path: "quick-start", ...lazyPage(load.iiotPlatform) },
        { path: "docs", ...lazyPage(load.iiotPlatform) },
        { path: "token-service", ...lazyPage(load.tokenService) },
        { path: "*", Component: NotFound },
      ],
    },
  ],
  { basename: detectLocale() === "en" ? "/en" : "/" },
);
