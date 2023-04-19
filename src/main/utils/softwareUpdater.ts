import { RemoteBinaryInfo } from "@/commons/datas/remoteBinaryInfo";
import { UPDATE_CHECK_INTERVAL } from "@/commons/defines";

import { useLogger } from "@/main/provides/utils/logger";
import { EmitMainEventTargetType, useWindows } from "@/main/provides/windows";
import { emitMainEvent } from "@/main/utils/emitMainEvent";
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
  const remote: RemoteBinaryInfo = await getLatestVersion();
  log.log(remote);
  if (!remote.isLatest) {
    log.log("this version is old");
    windows.openWindow("settings");
    emitMainEvent({ type: EmitMainEventTargetType.ALL }, "foundLatestVersion", remote);
  } else {
    log.log("this version is latest");
  }
  checkUpdateTimeoutHandler = setTimeout(checkAndNotifySoftwareUpdate, UPDATE_CHECK_INTERVAL);
}
