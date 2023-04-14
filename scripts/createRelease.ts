import AdmZip from "adm-zip";
import { readdirSync, renameSync } from "fs";
import { resolve } from "path";

(async () => {
  if (process.platform === "win32") {
    const zip = new AdmZip();
    const exeFile = readdirSync(resolve("./release")).find((name) => name.endsWith(".exe"));
    if (exeFile === undefined) {
      throw new Error(exeFile + " is not found");
    }
    zip.addLocalFile(resolve("./release", exeFile));
    const out = resolve("./release", exeFile.replace(/win32-x64/g, "windows") + ".zip");
    zip.writeZip(out);
  } else if (process.platform === "darwin") {
    const dmgFile = readdirSync(resolve("./release")).find((name) => name.endsWith(".dmg"));
    if (dmgFile === undefined) {
      return;
    }
    renameSync(
      resolve("./release", dmgFile),
      resolve(
        "./release",
        dmgFile
          .replace(/darwin/g, "mac")
          .replace(/x64/g, "intel")
          .replace(/arm64/g, "m1"),
      ),
    );
  }
})();
