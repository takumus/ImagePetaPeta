const task = require("./task");
const fs = require("fs");
task("generate dirs", async () => {
  fs.mkdir("./build", (err) => err);
  fs.mkdir("./test_output", (err) => err);
});
