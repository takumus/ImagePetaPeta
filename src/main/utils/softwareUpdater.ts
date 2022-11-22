import { RemoteBinaryInfo } from "@/commons/datas/remoteBinaryInfo";
import { WindowType } from "@/commons/datas/windowType";
import { UPDATE_CHECK_INTERVAL } from "@/commons/defines";

import { useLogger } from "@/main/provides/utils/logger";
import { useWindows } from "@/main/provides/utils/windows";
import { getLatestVersion } from "@/main/utils/versions";

let checkUpdateTimeoutHandler: NodeJS.Timeout | undefined;
export async function checkAndNotifySoftwareUpdate() {
  const logger = useLogger();
  const windows = useWindows();
  if (checkUpdateTimeoutHandler) {
    clearTimeout(checkUpdateTimeoutHandler);
  }
  const log = logger.logMainChunk();
  log.log("$Check Update");
  if (process.platform != "win32") {
    log.log("mac os is not available");
    return;
  }
  const remote: RemoteBinaryInfo = await getLatestVersion();
  log.log(remote);
  if (!remote.isLatest) {
    log.log("this version is old");
    windows.openWindow(WindowType.SETTINGS);
    windows.emitMainEvent("foundLatestVersion", remote);
  } else {
    log.log("this version is latest");
  }
  checkUpdateTimeoutHandler = setTimeout(checkAndNotifySoftwareUpdate, UPDATE_CHECK_INTERVAL);
}
