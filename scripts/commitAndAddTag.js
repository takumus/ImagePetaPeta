const script = require("./@script");
script.run("commit and add tag", async () => {
  const process = require("child_process");
  const packageJSON = JSON.parse(script.utils.read("./package.json"));
  script.utils.log("VERSION:", packageJSON.version);
  script.utils.log(process.execSync(`git add .`).toString());
  script.utils.log(process.execSync(`git commit -m "Update version ${packageJSON.version}"`).toString());
  script.utils.log(process.execSync(`git tag ${packageJSON.version}`).toString());
  script.utils.log(process.execSync(`git push origin --tags`).toString());
});
