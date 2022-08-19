const task = require("./@task");
const fs = require("fs");
task("generate dirs", async () => {
  fs.mkdir("./dist", (err) => err);
  fs.mkdir("./dist/resources", (err) => err);
  fs.mkdir("./dist/test", (err) => err);
});
