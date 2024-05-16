import { compareVersions } from "compare-versions";
import { app } from "electron";
import { v4 as uuid } from "uuid";

import { RemoteBinaryInfo } from "@/commons/datas/remoteBinaryInfo";
import { URL_PACKAGE_JSON } from "@/commons/defines";

export function isLatest(currentVersion: string, remoteVersion: string) {
  return compareVersions(currentVersion, remoteVersion) >= 0;
}
export async function getLatestVersion(): Promise<RemoteBinaryInfo> {
  try {
    const url = `${URL_PACKAGE_JSON}?hash=${uuid()}`;
    const packageJSON = await (await fetch(url)).json();
    // packageJSON.version = "4.0.0";
    return {
      isLatest: isLatest(app.getVersion(), packageJSON.version),
      version: packageJSON.version,
    };
  } catch (e) {
    //
  }
  return {
    isLatest: true,
    version: app.getVersion(),
  };
}
