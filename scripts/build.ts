import { writeFileSync } from "node:fs";
import { exit } from "process";
import { electronConfiguration } from "../electron.config";
import { Arch, build, Platform } from "electron-builder";
import { release } from "scripts/release";
import yargs from "yargs/yargs";

(async () => {
  const args = await yargs(process.argv).argv;
  console.log(args);
  const [os, archString] = (args["electron-target"] as string | undefined)?.split(":") ?? [];
  const target = (() => {
    if (os === undefined || archString === undefined) {
      console.log("taregt: default");
      return undefined;
    }
    const arch = {
      ia32: Arch.ia32,
      x64: Arch.x64,
      armv7l: Arch.armv7l,
      arm64: Arch.arm64,
      universal: Arch.universal,
    }[archString];
    if (arch === undefined) {
      console.log("target: default");
      return undefined;
    }
    console.log(`target: ${os}, ${archString}`);
    if (os === "mac") {
      return Platform.MAC.createTarget(undefined, arch);
    }
    if (os === "win") {
      return Platform.WINDOWS.createTarget(undefined, arch);
    }
  })();
  const windowsCSC: typeof electronConfiguration.win = (() => {
    const pfx = process.env.WINDOWS_PFX?.split("\n");
    if (os !== "win" || pfx == undefined) {
      return undefined;
    }
    writeFileSync("./windowsPFX.pfx", pfx[0], { encoding: "base64" });
    return {
      cscKeyPassword: pfx[1],
      cscLink: "./windowsPFX.pfx",
    };
  })();
  if (windowsCSC !== undefined) {
    console.log("add csc configuration");
  }
  build({
    config: {
      ...electronConfiguration,
      win: {
        ...electronConfiguration.win,
        ...windowsCSC,
      },
    },
    publish: "never",
    targets: target,
  })
    .then(() => {
      release()
        .then(() => {
          exit(0);
        })
        .catch((e) => {
          console.error(e);
          exit(-1);
        });
    })
    .catch((e) => {
      console.error(e);
      exit(-1);
    });
})();
