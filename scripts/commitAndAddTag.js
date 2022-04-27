const fs = require("fs");
const process = require("child_process");
const packageJSON = JSON.parse(fs.readFileSync("./package.json"));

console.log("VERSION:", packageJSON.version);
console.log(process.execSync(`git add .`).toString());
console.log(process.execSync(`git commit -m "Update version ${packageJSON.version}"`).toString());
console.log(process.execSync(`git tag ${packageJSON.version}`).toString());
console.log(process.execSync(`git push origin --tags`).toString());