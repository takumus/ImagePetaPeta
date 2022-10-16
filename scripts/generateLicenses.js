const script = require("./@script");
script.run("generate licenses", async () => {
  const licenseChecker = require("license-checker");
  const customLicenses = script.utils
    .readdir("resources/licenses")
    .filter((fileName) => fileName.endsWith(".txt"))
    .reduce((licenses, fileName) => {
      const text = script.utils
        .read("resources/licenses/" + fileName)
        .toString()
        .split(/\r?\n/g);
      return {
        ...licenses,
        [text.shift()]: {
          customLicensesName: text.shift(),
          customLicensesText: text.join("\n"),
        },
      };
    }, {});
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
        licensesText = script.utils.read(data.licenseFile).toString();
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
  script.utils.log(
    script.utils.write(
      "./src/@assets/licenses.ts",
      `export const LICENSES = ${JSON.stringify(licenses, null, 2)}`,
      {
        encoding: "utf-8",
      },
    ),
  );
  script.utils.log(
    Object.keys(licensesCounts)
      .map((key) => `${key}: ${licensesCounts[key]}`)
      .join("\n"),
  );
});
