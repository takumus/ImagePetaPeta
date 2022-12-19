const script = require("./@script");
const AdmZip = require("adm-zip");
script.run("compress for windows", async () => {
  if (process.platform === "win32") {
    const zip = new AdmZip();
    const exeFile = script.utils
      .readdir(script.files.output.electron.appDir)
      .find((name) => name.endsWith(".exe"));
    if (exeFile === undefined) {
      throw new Error(exeFile + " is not found");
    }
    zip.addLocalFile(script.files.output.electron.appDir + "/" + exeFile);
    const out =
      script.files.output.electron.appDir + "/" + exeFile.replace(/win32-x64/g, "windows") + ".zip";
    zip.writeZip(out);
    script.utils.log(out);
  } else if (process.platform === "darwin") {
    const dmgFile = script.utils
      .readdir(script.files.output.electron.appDir)
      .find((name) => name.endsWith(".dmg"));
    script.utils.log(
      script.utils.mv(
        script.files.output.electron.appDir + "/" + dmgFile,
        script.files.output.electron.appDir +
          "/" +
          dmgFile
            .replace(/darwin/g, "mac")
            .replace(/x64/g, "intel")
            .replace(/arm64/g, "m1"),
      ),
    );
  }
});
