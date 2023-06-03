export const windowNames = [
  "board",
  "browser",
  "settings",
  "details",
  "eula",
  "capture",
  "quit",
  "modal",
] as const;
export type WindowName = (typeof windowNames)[number];
