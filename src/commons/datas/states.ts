export type States = {
  selectedPetaBoardId: string;
  browserTileSize: number;
  visibleLayerPanel: boolean;
  loadedPetaBoardId: string;
  groupingByDate: boolean;
};
export const defaultStates: States = {
  selectedPetaBoardId: "",
  browserTileSize: 128,
  visibleLayerPanel: true,
  loadedPetaBoardId: "",
  groupingByDate: false,
};
