import { WEBHOOK_PORT } from "@/commons/defines";
import { IpcFunctionsType } from "@/commons/ipc/ipcFunctionsType";
import { WindowName } from "@/commons/windows";

import { showError } from "@/main/errorWindow";
import { useConfigSettings } from "@/main/provides/configs";
import { useNSFW } from "@/main/provides/nsfw";
import { windowIs } from "@/main/provides/utils/windowIs";
import { useWebHook } from "@/main/provides/webhook";
import { useWindows } from "@/main/provides/windows";
import { getStyle } from "@/main/utils/darkMode";

export const settingsIPCFunctions: IpcFunctionsType["settings"] = {
  async update(event, log, settings) {
    const windows = useWindows();
    const configSettings = useConfigSettings();
    try {
      if (configSettings.data.web !== settings.web) {
        if (settings.web) {
          useWebHook().open(WEBHOOK_PORT);
        } else {
          useWebHook().close();
        }
      }
      configSettings.data = settings;
      Object.keys(windows.windows).forEach((key) => {
        const window = windows.windows[key as WindowName];
        if (windowIs.dead(window)) {
          return;
        }
      });
      configSettings.save();
      windows.emit.common.updateSettings({ type: "all" }, settings);
      windows.emit.common.showNSFW({ type: "all" }, useNSFW().getShowNSFW());
      windows.emit.common.style({ type: "all" }, getStyle());
      log.debug("return:", configSettings.data);
      return true;
    } catch (e) {
      log.error(e);
      showError({
        category: "M",
        code: 200,
        title: "Update Settings Error",
        message: String(e),
      });
    }
    return false;
  },
  async get(_, log) {
    const configSettings = useConfigSettings();
    log.debug("return:", configSettings.data);
    return configSettings.data;
  },
};
