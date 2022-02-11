import { WINDOW_DEFAULT_HEIGHT, WINDOW_DEFAULT_WIDTH } from "@/defines";

export const defaultStates = {
  windowSize: { width: WINDOW_DEFAULT_WIDTH, height: WINDOW_DEFAULT_HEIGHT },
  windowIsMaximized: false
}
export function upgradeStates(states: States) {
  return states;
}
export type States = typeof defaultStates;