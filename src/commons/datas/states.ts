export type States = {
  selectedPetaBoardId: string;
  browserTileSize: number;
  visibleLayerPanel: boolean;
  loadedPetaBoardId: string;
  browserTileViewMode: (typeof browserTileViewMode)[number];
};
export const defaultStates: States = {
  selectedPetaBoardId: "",
  browserTileSize: 128,
  visibleLayerPanel: true,
  loadedPetaBoardId: "",
  browserTileViewMode: "fill1",
};
export const browserTileViewMode = ["fill1", "fill2"] as const;
