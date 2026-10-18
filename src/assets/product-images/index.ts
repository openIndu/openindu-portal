import dashboard from "./dashboard.webp";
import deviceMgmt from "./device-mgmt.webp";
import login from "./login.webp";
import miniProgram from "./mini-program.webp";
import stationOverview from "./station-overview.webp";
import stationVision from "./station-vision.webp";
import traceability from "./traceability.webp";
import workbench from "./workbench.webp";

export type Screenshot = { src: string; width: number; height: number };

/**
 * Product screenshots.
 *
 * They live in src/ rather than public/ so that Vite gives every file a content
 * hash: a re-exported screenshot gets a new URL, which is what lets nginx cache
 * the hashed files for a year (see nginx.conf). Files in public/ keep their URL
 * when replaced and must not be cached that way.
 *
 * `width` and `height` are the files' intrinsic size. They let the browser
 * reserve the space before a lazy image arrives; a unit test checks them against
 * the files.
 */
export const productScreenshots = {
  dashboard: { src: dashboard, width: 1080, height: 675 },
  deviceMgmt: { src: deviceMgmt, width: 1080, height: 590 },
  login: { src: login, width: 1080, height: 590 },
  miniProgram: { src: miniProgram, width: 1170, height: 2532 },
  stationOverview: { src: stationOverview, width: 1920, height: 1080 },
  stationVision: { src: stationVision, width: 1920, height: 1080 },
  traceability: { src: traceability, width: 1080, height: 590 },
  workbench: { src: workbench, width: 1080, height: 590 },
} as const satisfies Record<string, Screenshot>;
