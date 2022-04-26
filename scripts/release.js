const fs = require("fs");
const process = require("child_process");
const crypto = require("crypto");
const packageJSON = JSON.parse(fs.readFileSync("./package.json"));
const readme = fs.readFileSync("README.md").toString().replace(/<https:\/\/github.com\/takumus\/ImagePetaPeta\/releases\/tag\/.*>/g, `<https://github.com/takumus/ImagePetaPeta/releases/tag/${packageJSON.version}>`);
fs.writeFileSync("README.md", readme);
console.log("VERSION:", packageJSON.version);
console.log(process.execSync(`git add .`).toString());
console.log(process.execSync(`git commit -m "Update version ${packageJSON.version}"`).toString());
console.log(process.execSync(`git tag ${packageJSON.version}`).toString());
console.log(process.execSync(`git push origin --tags`).toString());
const hashAdded = fs.readFileSync("./package.json")
.toString()
.replace(
  /"binary-sha256-win": ".*"/, 
  `"binary-sha256-win": "${crypto.createHash("sha256").update(fs.readFileSync(`./dist_electron/ImagePetaPeta-beta ${packageJSON.version}.exe`)).digest("hex")}"`
)
fs.writeFileSync("./package.json", hashAdded);