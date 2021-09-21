const fs = require("fs");
const datas = JSON.parse(fs.readFileSync("./licenses.json"));
const newDatas = Object.keys(datas).filter((name) => name.indexOf("ImagePetaPeta") < 0).map((name) => {
  const data = datas[name];
  const licenses = fs.readFileSync(data.licenseFile).toString();
  delete data.path;
  delete data.licenseFile;
  return {
    name: name,
    licenses: licenses
  }
});
fs.rmSync("./licenses.json");
fs.writeFileSync("./src/licenses.ts", `export const LICENSES = ${JSON.stringify(newDatas, null, 2)}`);
console.log("generate licenses.ts");