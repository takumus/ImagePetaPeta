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
    licenses: String(licenses)
    .replace(/^\s+/g, "") //先頭のスペース削除
    .replace(/\r\n|\n|\r/g, "\n") // 改行コード統一
    .replace(/\n+/g, "\n") // 連続改行削除
    .replace(/\n\s+/g, "\n") // 行頭のスペース削除
    .replace(/\n$/, "") // 最後の改行削除
  }
});
fs.rmSync("./licenses.json");
fs.writeFileSync("./src/@assets/licenses.ts", `export const LICENSES = ${JSON.stringify(newDatas, null, 2)}`);
console.log("generate licenses complete");