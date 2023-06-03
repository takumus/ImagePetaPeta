export const windowNames = [
  "board",
  "browser",
  "settings",
  "details",
  "eula",
  "capture",
  "quit",
  "modal",
  "webAccess",
] as const;
export type WindowName = (typeof windowNames)[number];
