import { PetaBoard } from "@/commons/datas/petaBoard";
import { PetaPanel } from "@/commons/datas/petaPanel";

import { createMigrater } from "@/main/libs/createMigrater";

export const migratePetaBoard = createMigrater<PetaBoard>(async (data, update) => {
  // v3.0.0
  if (Array.isArray(data.petaPanels)) {
    const petaPanels = data.petaPanels as PetaPanel[];
    const newPetaPanels: { [id: string]: PetaPanel } = {};
    petaPanels.forEach((petaPanel) => {
      newPetaPanels[petaPanel.id] = petaPanel;
    });
    data.petaPanels = newPetaPanels;
    update();
  }
  Object.values(data.petaPanels).forEach((petaPanel) => {
    const result = migratePetaPanel(petaPanel);
    if (result.updated) {
      data.petaPanels[result.data.id] = result.data;
      update();
    }
  });
  return data;
});
export const migratePetaPanel = createMigrater<PetaPanel>(async (data, update) => {
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  const anyData = data as any;
  if (data.petaFileId === undefined) {
    data.petaFileId = anyData.petaImageId;
    delete anyData.petaImageId;
    update();
  }
  if (data.status === undefined) {
    data.status = {
      type: "none",
    };
    update();
  }
  if (data.status.type === "gif" && data.status.time === undefined) {
    data.status.time = 0;
    delete anyData.frame;
    update();
  }
  if (data.status.type === "video" && data.status.volume === undefined) {
    data.status.volume = 0;
    update();
  }
  if (
    (data.status.type === "video" || data.status.type === "gif") &&
    data.status.speed === undefined
  ) {
    data.status.speed = 1;
    update();
  }
  if (
    (data.status.type === "video" || data.status.type === "gif") &&
    data.status.paused === undefined
  ) {
    data.status.paused = true;
    update();
  }
  if (data.filters === undefined) {
    data.filters = {};
    update();
  }
  if (data.width < 0) {
    data.width = Math.abs(data.width);
    data.flipHorizontal = true;
    update();
  }
  if (data.height < 0) {
    data.height = Math.abs(data.height);
    data.flipVertical = true;
    update();
  }
  if (data.flipHorizontal === undefined) {
    data.flipHorizontal = false;
    update();
  }
  if (data.flipVertical === undefined) {
    data.flipVertical = false;
    update();
  }
  return data;
});
