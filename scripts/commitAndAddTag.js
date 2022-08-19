const task = require("./@task");
const fs = require("fs");
const process = require("child_process");
task("commit and add tag", async (log) => {
  const packageJSON = JSON.parse(fs.readFileSync("./package.json"));
  log("VERSION:", packageJSON.version);
  log(process.execSync(`git add .`).toString());
  log(process.execSync(`git commit -m "Update version ${packageJSON.version}"`).toString());
  log(process.execSync(`git tag ${packageJSON.version}`).toString());
  log(process.execSync(`git push origin --tags`).toString());
});
