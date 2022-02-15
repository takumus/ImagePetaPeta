const fs = require("fs");
const packageJSON = JSON.parse(fs.readFileSync("./package.json"));
module.exports = {
  appx: {
    identityName: "XXXXtakumus." + packageJSON.productName,
    applicationId: "io.takumus.petaimage" + packageJSON.name,
    publisherDisplayName: "takumus",
    publisher: "CN=XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
    languages: ["JA-JP", "EN-US"]
 },
}