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
  "password",
] as const;
export type WindowName = (typeof windowNames)[number];
