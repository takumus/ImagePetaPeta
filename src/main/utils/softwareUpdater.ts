import { RemoteBinaryInfo } from "@/commons/datas/remoteBinaryInfo";
import { UPDATE_CHECK_INTERVAL } from "@/commons/defines";

import { useLogger } from "@/main/provides/utils/logger";
import { useWindows } from "@/main/provides/windows";
import { getLatestVersion } from "@/main/utils/versions";

let checkUpdateTimeoutHandler: NodeJS.Timeout | undefined;
export async function checkAndNotifySoftwareUpdate() {
  const windows = useWindows();
  if (checkUpdateTimeoutHandler) {
    clearTimeout(checkUpdateTimeoutHandler);
  }
  const log = useLogger().logChunk("checkAndNotifySoftwareUpdate");
  const remote: RemoteBinaryInfo = await getLatestVersion();
  log.debug(remote);
  if (!remote.isLatest) {
    log.debug("this version is old");
    windows.openWindow("settings");
    windows.emit.common.foundLatestVersion({ type: "all" }, remote);
  } else {
    log.debug("this version is latest");
  }
  checkUpdateTimeoutHandler = setTimeout(checkAndNotifySoftwareUpdate, UPDATE_CHECK_INTERVAL);
}
