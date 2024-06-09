import { RemoteBinaryInfo } from "@/commons/datas/remoteBinaryInfo";
import { UPDATE_CHECK_INTERVAL } from "@/commons/defines";

import { useLogger } from "@/main/provides/utils/logger";
import { EmitMainEventTargetType, useWindows } from "@/main/provides/windows";
import { getLatestVersion } from "@/main/utils/versions";

let checkUpdateTimeoutHandler: NodeJS.Timeout | undefined;
export async function checkAndNotifySoftwareUpdate() {
  const logger = useLogger();
  const windows = useWindows();
  if (checkUpdateTimeoutHandler) {
    clearTimeout(checkUpdateTimeoutHandler);
  }
  const log = logger.logMainChunk();
  log.debug("$Check Update");
  const remote: RemoteBinaryInfo = await getLatestVersion();
  log.debug(remote);
  if (!remote.isLatest) {
    log.debug("this version is old");
    windows.openWindow("settings");
    windows.emitMainEvent({ type: "all" }, "foundLatestVersion", remote);
  } else {
    log.debug("this version is latest");
  }
  checkUpdateTimeoutHandler = setTimeout(checkAndNotifySoftwareUpdate, UPDATE_CHECK_INTERVAL);
}
