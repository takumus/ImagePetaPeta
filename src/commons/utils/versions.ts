import { RemoteBinaryInfo } from "../datas/remoteBinaryInfo";
import { PACKAGE_JSON_URL } from "../defines";
import { v4 as uuid } from "uuid";
import axios from "axios";
import { app } from "electron";
export function isLatest(meVersion: string, remoteVersion: string, ignoreMinor: boolean) {
  if (meVersion === remoteVersion) {
    return true;
  }
  const meNumbers = meVersion.split(".");
  const remoteNumbers = remoteVersion.split(".");
  const length = Math.min(meNumbers.length, remoteNumbers.length);
  for (let i = 0; i < length; i++) {
    const meNumber = parseInt(meNumbers[i]!.replace(/[^0-9]/g, ""));
    const remoteNumber = parseInt(remoteNumbers[i]!.replace(/[^0-9]/g, ""));
    // A.B.C のC以降をマイナーとする。
    if (ignoreMinor && i > 1) return true;
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
export async function getLatestVersion(ignoreMinorUpdate: boolean): Promise<RemoteBinaryInfo> {
  try {
    const url = `${PACKAGE_JSON_URL}?hash=${uuid()}`;
    const packageJSON = (await axios.get(url, { responseType: "json" })).data;
    // packageJSON.version = "3.0.0";
    return {
      isLatest: isLatest(app.getVersion(), packageJSON.version, ignoreMinorUpdate),
      version: packageJSON.version,
      sha256: {
        win: packageJSON["binary-sha256-win"],
        mac: packageJSON["binary-sha256-mac"],
      }
    }
  } catch(e) {
    //
  }
  return {
    isLatest: true,
    version: app.getVersion(),
    sha256: {
      win: "",
      mac: "",
    }
  }
}