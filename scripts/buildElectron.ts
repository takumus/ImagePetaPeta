import { electronConfiguration } from "../electron.config";
import { Arch, Platform, build } from "electron-builder";
import { writeFileSync } from "fs";
import { exit } from "process";
import { createRelease } from "scripts/createRelease";
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
    if (
      os !== "win" ||
      process.env.WINDOWS_PFX_PASSWORD == undefined ||
      process.env.WINDOWS_PFX == undefined
    ) {
      return undefined;
    }
    writeFileSync("./windowsPFX.pfx", process.env.WINDOWS_PFX, { encoding: "base64" });
    return {
      cscKeyPassword: process.env.WINDOWS_PFX_PASSWORD,
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
      createRelease()
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
