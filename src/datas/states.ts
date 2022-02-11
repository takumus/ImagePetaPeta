import { WINDOW_DEFAULT_HEIGHT, WINDOW_DEFAULT_WIDTH } from "@/defines";

export const defaultStates = {
  windowSize: { width: WINDOW_DEFAULT_WIDTH, height: WINDOW_DEFAULT_HEIGHT },
  windowIsMaximized: false
}
export type States = typeof defaultStates;