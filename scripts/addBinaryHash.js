const fs = require("fs");
const crypto = require("crypto");
const packageJSON = JSON.parse(fs.readFileSync("./package.json"));
const isMac = process.platform == "darwin";
const binaryFile = isMac ? `./dist_electron/mac-arm64/ImagePetaPeta-beta.app` : `./dist_electron/ImagePetaPeta-beta Setup ${packageJSON.version}.exe`;
const hashAdded = fs.readFileSync("./package.json")
.toString()
.replace(
  /"binary-sha256-win": ".*"/, 
  `"binary-sha256-win": "${crypto.createHash("sha256").update(fs.readFileSync(binaryFile)).digest("hex")}"`
)
fs.writeFileSync("./package.json", hashAdded);