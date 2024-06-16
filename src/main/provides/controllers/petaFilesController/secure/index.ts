// import { rename } from "node:fs/promises";
// import path, { resolve } from "node:path";
// import { v4 as uuid } from "uuid";

// import { PetaFile } from "@/commons/datas/petaFile";

// import { useConfigSecureFilePassword } from "@/main/provides/configs";
// import { usePetaFilesController } from "@/main/provides/controllers/petaFilesController/petaFilesController";
// import { usePaths } from "@/main/provides/utils/paths";
// import { getPetaFilePath } from "@/main/utils/getPetaFileDirectory";
// import { secureFile } from "@/main/utils/secureFile";

// export async function encryptPetaFile(petaFile: PetaFile, updatePetaFile = true) {
//   try {
//     const sfp = useConfigSecureFilePassword();
//     const tempPaths = {
//       original: resolve(usePaths().DIR_TEMP, uuid()),
//       thumbnail: resolve(usePaths().DIR_TEMP, uuid()),
//     };
//     const paths = getPetaFilePath.fromPetaFile(petaFile);
//     await secureFile.encrypt.toFile(paths.original, tempPaths.original, sfp.getKey());
//     await secureFile.encrypt.toFile(paths.thumbnail, tempPaths.thumbnail, sfp.getKey());
//     // 暗号復号OK
//     await rename(tempPaths.original, paths.original);
//     await rename(tempPaths.thumbnail, paths.thumbnail);
//     if (updatePetaFile) {
//       petaFile.encrypted = true;
//       await usePetaFilesController().updateMultiple([petaFile], "update");
//     }
//     return true;
//   } catch {
//     //
//   }
//   return false;
// }
