const task = require("./@task");
const fs = require("fs");
const files = require("../files");
task("generate dirs", async () => {
  rm(files.out.electronDir);
  mkdir(files.out.resourcesDir);
  mkdir(files.out.testDir);
});
function mkdir(path) {
  try {
    fs.mkdirSync(path, { recursive: true });
  } catch (err) {
    //
  }
}
function rm(path) {
  try {
    fs.rmSync(path, { recursive: true });
  } catch (err) {
    //
  }
}
