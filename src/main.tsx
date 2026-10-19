import "./i18n"; // must be first — initialises i18next before App renders
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App";
import { router } from "./app/routes";
import { installPreloadErrorRecovery } from "./lib/preloadRecovery";
import "./styles/colors.css";
import "./styles/index.css";

installPreloadErrorRecovery();

const root = createRoot(document.getElementById("root")!);
const render = () =>
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );

// Route components load lazily. Rendering before the matched route has loaded
// would empty the prerendered page until its chunk arrives, so leave that markup
// on screen and render once the router is ready.
if (router.state.initialized) {
  render();
} else {
  const unsubscribe = router.subscribe((state) => {
    if (!state.initialized) return;
    unsubscribe();
    render();
  });
}
