import { electronConfiguration } from "../electron.config";
import { Arch, Platform, build } from "electron-builder";
import { exit } from "process";

const target = (() => {
  const [os, archString] = process.argv
    .find((arg) => arg.startsWith("--electron-target"))
    ?.split("=")[1]
    .split(":")
    .map((arg) => arg.trim().toLocaleLowerCase()) ?? [undefined, undefined];
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
build({
  config: electronConfiguration,
  publish: "never",
  targets: target,
})
  .then(() => {
    exit(0);
  })
  .catch(() => {
    exit(-1);
  });
