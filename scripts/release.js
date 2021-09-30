const fs = require("fs");
const process = require("child_process");
const packageJSON = JSON.parse(fs.readFileSync("./package.json"));
console.log("VERSION:", packageJSON.version);
console.log(process.execSync(`git tag ${packageJSON.version}`).toString());
console.log(process.execSync(`git push origin --tags`).toString());
const readme = fs.readFileSync("README.md").toString().replace(/<https:\/\/github.com\/takumus\/ImagePetaPeta\/releases\/tag\/.*>/g, `https://github.com/takumus/ImagePetaPeta/releases/tag/${packageJSON.version}`);
fs.writeFileSync("README.md", readme);