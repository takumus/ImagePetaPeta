import { _alert } from "$/background/alert";
import { sendToApp } from "$/commons/sendToApp";

import { AppInfo } from "@/commons/datas/appInfo";
import { CHROME_EXTENSION_VERSION } from "@/commons/defines";

export async function checkApp() {
  try {
    const appInfo = await new Promise<AppInfo>((res, rej) => {
      sendToApp("common", "getAppInfo").then(res).catch(rej);
      setTimeout(rej, 500);
    });
    const version = appInfo.chromeExtensionVersion ?? 0;
    if (version > CHROME_EXTENSION_VERSION) {
      await _alert("拡張機能が古いです。\n拡張機能をアップデートしてください。");
      return false;
    } else if (version < CHROME_EXTENSION_VERSION) {
      await _alert("アプリが古いです。\nアプリをアップデートしてください。");
      return false;
    }
  } catch {
    await _alert("ImagePetaPetaを起動してください。");
    return false;
  }
  return true;
}
