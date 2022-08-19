const task = require("./@task");
const fs = require("fs");
task("generate dirs", async () => {
  rm("./dist/electron");
  mkdir("./dist");
  mkdir("./dist/resources");
  mkdir("./dist/test");
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
