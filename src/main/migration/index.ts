import { UpdateMode } from "@/commons/datas/updateMode";

import { migratePetaBoard } from "@/main/migration/migratePetaBoard";
import { migratePetaImage } from "@/main/migration/migratePetaImage";
import { migratePetaTag } from "@/main/migration/migratePetaTag";
import { usePetaBoardsController } from "@/main/provides/controllers/petaBoardsController";
import { usePetaImagesController } from "@/main/provides/controllers/petaImagesController";
import { usePetaTagsController } from "@/main/provides/controllers/petaTagsController";
import { useDBPetaBoards, useDBPetaImages, useDBPetaTags } from "@/main/provides/databases";
import { useLogger } from "@/main/provides/utils/logger";

export function migrate() {
  const logger = useLogger();
  const petaImagesController = usePetaImagesController();
  const petaBoardsController = usePetaBoardsController();
  const petaTagsController = usePetaTagsController();
  const dbPetaBoard = useDBPetaBoards();
  const dbPetaImages = useDBPetaImages();
  const dbPetaTags = useDBPetaTags();
  dbPetaImages.getAll().forEach((pi) => {
    const result = migratePetaImage(pi);
    if (result.updated) {
      logger.logMainChunk().log("Migrate PetaImage");
      petaImagesController.updateMultiple([result.data], UpdateMode.UPDATE, true);
    }
  });
  dbPetaTags.getAll().forEach((pt) => {
    const result = migratePetaTag(pt);
    if (result.updated) {
      logger.logMainChunk().log("Migrate PetaTag");
      petaTagsController.updateMultiple(
        [{ type: "petaTag", petaTag: result.data }],
        UpdateMode.UPDATE,
        true,
      );
    }
  });
  dbPetaBoard.getAll().forEach((pb) => {
    const result = migratePetaBoard(pb);
    if (result.updated) {
      logger.logMainChunk().log("Migrate PetaBoard");
      petaBoardsController.updateMultiple([result.data], UpdateMode.UPDATE);
    }
  });
}
