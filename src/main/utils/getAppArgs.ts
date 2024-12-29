import yargs from "yargs";

import { ObjectKeys } from "@/commons/utils/objectKeys";

export interface AppArgs {
  libraryPath?: string;
}
export function getAppArgs() {
  return yargs(process.argv).parseSync() as any as AppArgs;
}
export function createAppArgs(args: AppArgs) {
  return ObjectKeys(args).map((key) => {
    return `--${key}=${args[key]}`;
  });
}
