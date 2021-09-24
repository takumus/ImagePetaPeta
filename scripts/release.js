const fs = require("fs");
const process = require("child_process");
const packageJSON = JSON.parse(fs.readFileSync("./package.json"));
console.log("VERSION:", packageJSON.version);
process.exec(`git tag ${packageJSON.version}`);