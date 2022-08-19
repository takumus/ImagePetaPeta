const task = require("./@task");
const fs = require("fs");
const licenseChecker = require("license-checker");
const customLicenses = require("./customLicenses");
task("generate licenses", async (log) => {
  const packages = {
    ...(await new Promise((res, rej) => {
      licenseChecker.init(
        {
          start: "./",
          production: true,
          excludePrivatePackages: true,
        },
        (err, result) => {
          if (err) {
            rej(err);
            return;
          }
          res(result);
        },
      );
    })),
    ...customLicenses,
  };
  const licensesCounts = {};
  const licenses = Object.keys(packages).map((name) => {
    const data = packages[name];
    let licensesName = data.licenses;
    let licensesText = "";
    if (!data.customLicensesText) {
      try {
        licensesText = fs.readFileSync(data.licenseFile).toString();
      } catch {
        licensesText = "";
      }
    } else {
      licensesText = data.customLicensesText;
      licensesName = data.customLicensesName;
    }
    if (licensesCounts[licensesName] !== undefined) {
      licensesCounts[licensesName]++;
    } else {
      licensesCounts[licensesName] = 1;
    }
    return {
      name: `${name} (${licensesName})`,
      licenses: licensesText
        .replace(/^\s+/g, "") //先頭のスペース削除
        .replace(/\r\n|\n|\r/g, "\n") // 改行コード統一
        .replace(/\n+/g, "\n") // 連続改行削除
        .replace(/\n\s+/g, "\n") // 行頭のスペース削除
        .replace(/\n$/, ""), // 最後の改行削除
    };
  });
  fs.writeFileSync("./src/@assets/licenses.ts", `export const LICENSES = ${JSON.stringify(licenses, null, 2)}`, {
    encoding: "utf-8",
  });
  log(
    Object.keys(licensesCounts)
      .map((key) => `${key}: ${licensesCounts[key]}`)
      .join("\n"),
  );
});
