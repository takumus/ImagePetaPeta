import { WINDOW_DEFAULT_HEIGHT, WINDOW_DEFAULT_WIDTH } from "@/commons/defines";

export const defaultStates = {
  windowSize: { width: WINDOW_DEFAULT_WIDTH, height: WINDOW_DEFAULT_HEIGHT },
  windowIsMaximized: false,
  selectedPetaBoardId: ""
}
export type States = typeof defaultStates;