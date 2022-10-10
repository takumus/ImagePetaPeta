const script = require("./@script");
const AdmZip = require("adm-zip");
script.run("compress for windows", async () => {
  if (process.platform !== "win32") {
    script.utils.log("skipped");
    return;
  }
  const zip = new AdmZip();
  const exeFile = script.utils
    .readdir(script.files.output.electron.appDir)
    .find((name) => name.endsWith(".exe"));
  if (exeFile === undefined) {
    throw new Error(exeFile + " is not found");
  }
  zip.addLocalFile(script.files.output.electron.appDir + "/" + exeFile);
  zip.writeZip(script.files.output.electron.appDir + "/" + exeFile + ".zip");
});
