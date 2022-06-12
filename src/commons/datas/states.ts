export type States = {
  selectedPetaBoardId: string,
  browserTileSize: number,
  visibleLayerPanel: boolean,
  loadedPetaBoardId: string
}
export const defaultStates: States = {
  selectedPetaBoardId: "",
  browserTileSize: 128,
  visibleLayerPanel: true,
  loadedPetaBoardId: ""
}