import { readdirSync, readFileSync } from "node:fs";
import { styleText } from "node:util";
import checker from "license-checker-rseidelsohn";

const DANGER_LICENSES = /gpl/;
const UNKNOWN_LICENSES = /unknown/;
const IGNORES = [/@img\/sharp/];

interface Module {
  name: string;
  licenses: string;
  text: string;
}
export async function generateLicenses() {
  const modules: Module[] = await new Promise<Module[]>((res) => {
    checker.init(
      {
        start: ".",
        production: true,
        excludePrivatePackages: true,
        unknown: true,
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
                  (typeof info.licenses === "object" ? info.licenses.join("\n") : info.licenses) ??
                  "",
                text,
              },
            ];
          }, []),
        );
      },
    );
  });
  readdirSync("resources/licenses")
    .filter((fileName) => fileName.endsWith(".txt"))
    .map((fileName) => {
      const text = readFileSync("resources/licenses/" + fileName)
        .toString()
        .split(/\r\n|\n|\r/g);
      const module: Module = {
        name: text.shift() ?? "",
        licenses: text.shift() ?? "",
        text: text.join("\n"),
      };
      const sameNameModule = modules.find((m) => m.name === module.name);
      if (sameNameModule) {
        sameNameModule.licenses = module.licenses;
        sameNameModule.text = module.text;
        return;
      }
      modules.push(module);
    });
  const licensesCounts: { [key: string]: number } = {};
  modules.forEach((module) => {
    if (licensesCounts[module.licenses] !== undefined) {
      licensesCounts[module.licenses]++;
    } else {
      licensesCounts[module.licenses] = 1;
    }
    if (!IGNORES.find((r) => module.name.match(r))) {
      if (module.licenses.toLocaleLowerCase().match(UNKNOWN_LICENSES)) {
        throw `UNKNOWN LICENSE!!!!!!!: ${module.name}`;
      }
      if (module.licenses.toLocaleLowerCase().match(DANGER_LICENSES)) {
        throw `DANGER LICENSE!!!!!!!: ${module.name}(${module.licenses})`;
      }
    }
    module.text = module.text
      .replace(/^\s+/g, "") //先頭のスペース削除
      .replace(/\r\n|\n|\r/g, "\n") // 改行コード統一
      .replace(/\n+/g, "\n") // 連続改行削除
      .replace(/\n\s+/g, "\n") // 行頭のスペース削除
      .replace(/\n$/, ""); // 最後の改行削除
  });
  console.log(
    Object.keys(licensesCounts)
      .sort((a, b) => licensesCounts[b] - licensesCounts[a])
      .map((key) => `${styleText("green", key)}: ${licensesCounts[key]}`)
      .join("\n"),
  );
  return JSON.stringify(modules, null, 2);
}
