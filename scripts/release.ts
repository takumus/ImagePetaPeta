import { readdirSync, renameSync } from "fs";
import { resolve } from "path";
import AdmZip from "adm-zip";

export const release = async () => {
  if (process.platform === "win32") {
    const zip = new AdmZip();
    const exeFile = readdirSync(resolve("./_release")).find((name) => name.endsWith(".exe"));
    if (exeFile === undefined) {
      throw new Error(exeFile + " is not found");
    }
    zip.addLocalFile(resolve("./_release", exeFile));
    zip.writeZip(resolve("./_release", exeFile.replace(/win32-x64/g, "windows") + ".zip"));
  } else if (process.platform === "darwin") {
    readdirSync(resolve("./_release"))
      .filter((name) => name.endsWith(".pkg") || name.endsWith(".dmg"))
      .forEach((name) => {
        renameSync(
          resolve("./_release", name),
          resolve(
            "./_release",
            name
              .replace(/darwin/g, "mac")
              .replace(/x64/g, "intel")
              .replace(/arm64/g, "m1"),
          ),
        );
      });
  }
};
