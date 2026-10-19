import { useEffect, type ReactNode } from "react";
import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/Layout";
import { NotFound } from "./components/NotFound";
import { Home } from "./pages/Home";
import { About } from "./pages/About";
import { Developers } from "./pages/Developers";
import { Team } from "./pages/Team";
import { Architecture } from "./pages/Architecture";
import { Craftsmanship } from "./pages/Craftsmanship";
import { UseCases } from "./pages/UseCases";
import { Pricing } from "./pages/Pricing";
import { EdgeComputing } from "./pages/EdgeComputing";
import { MotionControl } from "./pages/MotionControl";
import { Vision } from "./pages/Vision";
import { IIoTPlatform } from "./pages/IIoTPlatform";
import { TokenService } from "./pages/TokenService";
import { Login } from "./pages/Login";
import { Resources } from "./pages/Resources";
import { Workflow } from "./pages/Workflow";
import { Station } from "./pages/Station";
import { Forum } from "./pages/Forum";
import ChatPage from "./pages/ChatPage";
import { AccountSettings } from "./pages/AccountSettings";
import { CookiesPolicy, LegalIndex, LegalNotice, PrivacyPolicy } from "./pages/LegalPages";
import { detectLocale, stripLocalePrefix } from "@/i18n/locale";

/**
 * On the EN locale, legal pages are not translated — redirect to the ZH
 * version via a real browser navigation (cross-basename boundary).  On the
 * ZH locale this is a transparent pass-through.
 */
function ZhOnlyGuard({ children }: { children: ReactNode }) {
  // Computed during render, not in the effect: returning the children first
  // painted the full Chinese page for the frame before the redirect fired, so
  // an EN visitor saw a flash of Chinese legal text on the way out.
  const leaving = typeof window !== "undefined" && detectLocale() === "en";

  useEffect(() => {
    if (leaving) {
      window.location.replace(stripLocalePrefix(window.location.pathname));
    }
  }, [leaving]);

  if (leaving) return null;
  return <>{children}</>;
}

export const router = createBrowserRouter(
  [
    {
      path: "/",
      Component: Layout,
      children: [
        { index: true, Component: Home },
        { path: "architecture", Component: Architecture },
        { path: "craftsmanship", Component: Craftsmanship },
        { path: "use-cases", Component: UseCases },
        { path: "pricing", Component: Pricing },
        { path: "about", Component: About },
        { path: "developers", Component: Developers },
        { path: "team", Component: Team },
        { path: "edge-computing", Component: EdgeComputing },
        { path: "login", Component: Login },
        { path: "register", element: <Navigate to="/login" replace /> },
        { path: "account", Component: AccountSettings },
        {
          path: "privacy",
          element: (
            <ZhOnlyGuard>
              <PrivacyPolicy />
            </ZhOnlyGuard>
          ),
        },
        {
          path: "legal",
          element: (
            <ZhOnlyGuard>
              <LegalNotice />
            </ZhOnlyGuard>
          ),
        },
        {
          path: "cookies",
          element: (
            <ZhOnlyGuard>
              <CookiesPolicy />
            </ZhOnlyGuard>
          ),
        },
        {
          path: "legal-center",
          element: (
            <ZhOnlyGuard>
              <LegalIndex />
            </ZhOnlyGuard>
          ),
        },
        { path: "motion-control", Component: MotionControl },
        // openIndu-studio (formerly "workflow"): sub-page of AI+Motion Control, publicly visible
        { path: "motion-control/studio", Component: Workflow },
        // Chat's RAG knowledge base is Chinese-only — same ZH-only treatment as legal pages.
        {
          path: "chat",
          element: (
            <ZhOnlyGuard>
              <ChatPage />
            </ZhOnlyGuard>
          ),
        },
        { path: "vision", Component: Vision },
        // openIndu-station: sub-page of AI+Vision, publicly visible
        { path: "vision/station", Component: Station },
        { path: "iiot-platform", Component: IIoTPlatform },
        // Community forum — may redirect to external platform (Discourse/GitHub Discussions) in future
        { path: "forum", Component: Forum },
        { path: "infrastructure", Component: TokenService },
        { path: "resources", Component: Resources },
        { path: "resources/documents", Component: Resources },
        { path: "resources/software", Component: Resources },
        // Legacy route redirects
        { path: "workflow", element: <Navigate to="/motion-control/studio" replace /> },
        { path: "platform", Component: IIoTPlatform },
        { path: "features", Component: IIoTPlatform },
        { path: "quick-start", Component: IIoTPlatform },
        { path: "docs", Component: IIoTPlatform },
        { path: "token-service", Component: TokenService },
        { path: "*", Component: NotFound },
      ],
    },
  ],
  { basename: detectLocale() === "en" ? "/en" : "/" },
);
