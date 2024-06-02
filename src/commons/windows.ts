export const windowNames = [
  "board",
  "browser",
  "settings",
  "details",
  "eula",
  "capture",
  "quit",
  "modal",
  "task",
  "web",
  "pageDownloader",
] as const;
export type WindowName = (typeof windowNames)[number];
