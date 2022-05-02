import { WINDOW_DEFAULT_HEIGHT, WINDOW_DEFAULT_WIDTH } from "@/commons/defines";

export const defaultStates = {
  windowSize: { width: WINDOW_DEFAULT_WIDTH, height: WINDOW_DEFAULT_HEIGHT },
  windowIsMaximized: false,
  selectedPetaBoardId: "",
  browserTileSize: 128,
  visibleLayerPanel: true,
}
export interface StateSet {
  key: string,
  value: any,
}
export function StateSet<U extends keyof States>(key: U, value: States[U]): StateSet {
  return {
    key,
    value
  }
}
export type States = typeof defaultStates;