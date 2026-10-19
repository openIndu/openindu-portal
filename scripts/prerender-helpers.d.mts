export const SITE_ORIGIN: string;

export interface PrerenderTarget {
  /** The URL path the app is rendered at. */
  route: string;
  /** Where the page is written, relative to dist/. */
  file: string;
  /** Error pages are kept out of search indexes. */
  noindex: boolean;
}

export function consentPreset(): { key: string; value: string };
export function expectedCanonical(route: string): string;
export function expectedLang(route: string): "en" | "zh-CN";
export function isPristineShell(html: string): boolean;
export function prerenderTargets(
  sharedRoutes: readonly string[],
  zhOnlyRoutes: readonly string[],
): PrerenderTarget[];
export function pageIsReady(expectation: {
  lang: string;
  canonical: string;
  noindex: boolean;
}): boolean;
export function snapshotProblems(
  html: string,
  target: Pick<PrerenderTarget, "route" | "noindex">,
): string[];
