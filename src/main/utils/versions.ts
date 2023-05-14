import { app } from "electron";
import { v4 as uuid } from "uuid";

import { RemoteBinaryInfo } from "@/commons/datas/remoteBinaryInfo";
import { URL_PACKAGE_JSON } from "@/commons/defines";

export function isLatest(meVersion: string, remoteVersion: string) {
  if (meVersion === remoteVersion) {
    return true;
  }
  const meNumbers = meVersion.split(".");
  const remoteNumbers = remoteVersion.split(".");
  const length = Math.min(meNumbers.length, remoteNumbers.length);
  for (let i = 0; i < length; i++) {
    const meNumber = parseInt(meNumbers[i]?.replace(/[^0-9]/g, "") || "0");
    const remoteNumber = parseInt(remoteNumbers[i]?.replace(/[^0-9]/g, "") || "0");
    // A.B.C のC以降をマイナーとする。
    if (meNumber < remoteNumber) return false;
    if (meNumber > remoteNumber) return true;
  }
  if (meNumbers.length < remoteNumbers.length) {
    return false;
  }
  if (meNumbers.length > remoteNumbers.length) {
    return true;
  }
  return true;
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
