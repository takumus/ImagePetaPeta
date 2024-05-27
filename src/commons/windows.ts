export const windowNames = [
  "board",
  "browser",
  "settings",
  "details",
  "eula",
  "capture",
  "quit",
  "modal",
  "web",
  "pageDownloader",
] as const;
export type WindowName = (typeof windowNames)[number];
