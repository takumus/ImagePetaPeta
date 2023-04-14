export const windowNames = ["board", "browser", "settings", "details", "eula", "capture"] as const;
export type WindowName = (typeof windowNames)[number];
