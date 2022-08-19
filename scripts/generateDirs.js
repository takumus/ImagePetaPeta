const task = require("./@task");
const fs = require("fs");
const files = require("../files.config");
task("generate dirs", async (log) => {
  log(rm(files.out.electronResourcesDir));
  log(rm(files.out.electronDir));
  log(mkdir(files.out.electronResourcesDir));
  log(mkdir(files.out.testDir));
});
function mkdir(path) {
  try {
    fs.mkdirSync(path, { recursive: true });
  } catch (err) {
    //
  }
  return "create: " + path;
}
function rm(path) {
  try {
    fs.rmSync(path, { recursive: true });
  } catch (err) {
    //
  }
  return "remove: " + path;
}
