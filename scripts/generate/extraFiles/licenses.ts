import { readFileSync, readdirSync } from "fs";
import checker from "license-checker-rseidelsohn";

interface Module {
  name: string;
  licenses: string;
  text: string;
}
export async function generateLicenses() {
  const modules = readdirSync("resources/licenses")
    .filter((fileName) => fileName.endsWith(".txt"))
    .reduce<Module[]>((licenses, fileName) => {
      const text = readFileSync("resources/licenses/" + fileName)
        .toString()
        .split(/\r\n|\n|\r/g);
      return [
        ...licenses,
        {
          name: text.shift() ?? "",
          licenses: text.shift() ?? "",
          text: text.join("\n"),
        },
      ];
    }, []);
  modules.push(
    ...(await new Promise<Module[]>((res) => {
      checker.init(
        {
          start: ".",
          production: true,
          excludePrivatePackages: true,
        },
        (_, packages) => {
          res(
            Object.keys(packages).reduce<Module[]>((modules, name) => {
              const info = packages[name];
              const text = (() => {
                if (info.licenseFile !== undefined) {
                  try {
                    return readFileSync(info.licenseFile).toString();
                  } catch {}
                }
                return "";
              })();
              return [
                ...modules,
                {
                  name,
                  licenses:
                    (typeof info.licenses === "object"
                      ? info.licenses.join("\n")
                      : info.licenses) ?? "",
                  text,
                },
              ];
            }, []),
          );
        },
      );
    })),
  );
  const licensesCounts: { [key: string]: number } = {};
  modules.forEach((module) => {
    if (licensesCounts[module.licenses] !== undefined) {
      licensesCounts[module.licenses]++;
    } else {
      licensesCounts[module.licenses] = 1;
    }
    module.text = module.text
      .replace(/^\s+/g, "") //先頭のスペース削除
      .replace(/\r\n|\n|\r/g, "\n") // 改行コード統一
      .replace(/\n+/g, "\n") // 連続改行削除
      .replace(/\n\s+/g, "\n") // 行頭のスペース削除
      .replace(/\n$/, ""); // 最後の改行削除
  });
  // writeFileSync(
  //   "./src/_public/licenses.ts",
  //   `export const LICENSES = ${JSON.stringify(modules, null, 2)}`,
  //   {
  //     encoding: "utf-8",
  //   },
  // ),
  //   console.log(
  //     Object.keys(licensesCounts)
  //       .map((key) => `${key}: ${licensesCounts[key]}`)
  //       .join("\n"),
  //   );
  return JSON.stringify(modules, null, 2);
}
