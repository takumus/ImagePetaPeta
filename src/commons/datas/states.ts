import { WINDOW_DEFAULT_HEIGHT, WINDOW_DEFAULT_WIDTH } from "@/commons/defines";
import { WindowType } from "./windowType";
export type States = {
  selectedPetaBoardId: string,
  browserTileSize: number,
  visibleLayerPanel: boolean,
  loadedPetaBoardId: string,
  windows: { [key in WindowType]: {
    width: number,
    height: number,
    maximized: boolean,
  } }
}
export const defaultStates: States = {
  selectedPetaBoardId: "",
  browserTileSize: 128,
  visibleLayerPanel: true,
  loadedPetaBoardId: "",
  windows: {
    main: {
      width: WINDOW_DEFAULT_WIDTH,
      height: WINDOW_DEFAULT_HEIGHT,
      maximized: false
    },
    browser: {
      width: WINDOW_DEFAULT_WIDTH,
      height: WINDOW_DEFAULT_HEIGHT,
      maximized: false
    },
    settings: {
      width: WINDOW_DEFAULT_WIDTH,
      height: WINDOW_DEFAULT_HEIGHT,
      maximized: false
    },
    details: {
      width: WINDOW_DEFAULT_WIDTH,
      height: WINDOW_DEFAULT_HEIGHT,
      maximized: false
    }
  }
}