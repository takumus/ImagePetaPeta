import { getPetaFileInfoFromURL } from "@/commons/utils/getPetaFileInfoFromURL";

import { createKey, createUseFunction } from "@/main/libs/di";
import { usePetaFilesController } from "@/main/provides/controllers/petaFilesController/petaFilesController";
import { createImageResponse } from "@/main/provides/handleFileResponse/createImageResponse";
import { createVideoResponse } from "@/main/provides/handleFileResponse/createVideoResponse";

export class HandleFileResponse {
  fileResponse(type: "thumbnail" | "original"): (request: Request) => Promise<Response> {
    return async (req) => {
      const info = getPetaFileInfoFromURL(req.url);
      const petaFile = await usePetaFilesController().getPetaFile(info.id);
      if (petaFile === undefined) {
        return new Response(undefined, { status: 404 });
      }
      if (petaFile.metadata.type === "video" && type === "original") {
        return await createVideoResponse(req, petaFile);
      } else {
        return createImageResponse(petaFile, type);
      }
    };
  }
}
export const handleFileResponseKey = createKey<HandleFileResponse>("handleFileResponse");
export const useHandleFileResponse = createUseFunction(handleFileResponseKey);
