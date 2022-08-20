const script = require("./@script");
script.run("commit and add tag", async (log) => {
  const process = require("child_process");
  const packageJSON = JSON.parse(script.utils.read("./package.json"));
  log("VERSION:", packageJSON.version);
  log(process.execSync(`git add .`).toString());
  log(process.execSync(`git commit -m "Update version ${packageJSON.version}"`).toString());
  log(process.execSync(`git tag ${packageJSON.version}`).toString());
  log(process.execSync(`git push origin --tags`).toString());
});
