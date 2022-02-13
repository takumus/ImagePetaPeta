const fs = require("fs");
const customLicenses = require("./customLicenses");
const datas = {
  ...JSON.parse(fs.readFileSync("./licenses.json")),
  ...customLicenses
};
console.log("generate licenses");
const newDatas = Object.keys(datas).map((name) => {
  const data = datas[name];
  let licenses = data.licenses;
  try {
    licenses = fs.readFileSync(data.licenseFile).toString();
  } catch {
    console.error("failed to load licenses:", name);
    console.log(data);
  }
  return {
    name: name,
    licenses: licenses
  }
});
fs.rmSync("./licenses.json");
fs.writeFileSync("./src/assets/licenses.ts", `export const LICENSES = ${JSON.stringify(newDatas, null, 2)}`);
console.log("generate licenses complete");