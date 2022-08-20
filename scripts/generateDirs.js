const task = require("./@task");
const fs = require("fs");
const files = require("../files.config");
task("generate dirs", async (log) => {
  log(rm(files.output.electron.resources.dir));
  log(rm(files.output.electron.appDir));
  log(mkdir(files.output.electron.resources.dir));
  log(mkdir(files.output.testDir));
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
