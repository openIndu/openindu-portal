import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import "@/i18n";
import { COOKIE_BANNER_HEIGHT_VAR, CookieConsent } from "@/app/components/CookieConsent";
import type { CookieConsent as Preference } from "@/lib/cookieConsent";

const root = document.documentElement;
const reserved = () => root.style.getPropertyValue(COOKIE_BANNER_HEIGHT_VAR);

const saved: Preference = {
  version: 1,
  necessary: true,
  analytics: false,
  updatedAt: "2000-01-01T00:00:00.000Z",
};

function bar(preference: Preference | null) {
  return (
    <MemoryRouter>
      <CookieConsent preference={preference} onChange={() => {}} />
    </MemoryRouter>
  );
}

describe("cookie bar room reservation", () => {
  const jsdomOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight")!;
  let height = 96;

  beforeEach(() => {
    height = 96;
    // jsdom has no layout, so give every element a height the test controls
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
      configurable: true,
      get: () => height,
    });
  });

  afterEach(() => {
    Object.defineProperty(HTMLElement.prototype, "offsetHeight", jsdomOffsetHeight);
    root.style.removeProperty(COOKIE_BANNER_HEIGHT_VAR);
  });

  it("publishes the bar's height while it is on screen", () => {
    render(bar(null));
    expect(reserved()).toBe("96px");
  });

  it("publishes nothing once a preference exists", () => {
    render(bar(saved));
    expect(reserved()).toBe("");
  });

  it("releases the room when a preference is saved", () => {
    const view = render(bar(null));
    expect(reserved()).toBe("96px");
    view.rerender(bar(saved));
    expect(reserved()).toBe("");
  });

  it("releases the room when the bar unmounts", () => {
    const view = render(bar(null));
    view.unmount();
    expect(reserved()).toBe("");
  });

  it("follows the bar when the viewport is resized and the text re-wraps", () => {
    render(bar(null));
    height = 160;
    window.dispatchEvent(new Event("resize"));
    expect(reserved()).toBe("160px");
  });
});
