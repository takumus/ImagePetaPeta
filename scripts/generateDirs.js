const task = require("./@task");
const fs = require("fs");
const rimraf = require("rimraf");
task("generate dirs", async () => {
  rimraf.sync("./dist/electron");
  fs.mkdir("./dist", (err) => err);
  fs.mkdir("./dist/resources", (err) => err);
  fs.mkdir("./dist/test", (err) => err);
});
