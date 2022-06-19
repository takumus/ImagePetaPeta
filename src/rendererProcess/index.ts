import { createApp as _createApp, Plugin } from "vue";
import { createI18n } from "vue-i18n";
// import { Loader as PIXILoader } from '@pixi/loaders';
import { AnimatedGIFLoader } from '@/rendererProcess/utils/pixi-gif';
import languages from "@/commons/languages";
import BoardIndex from "@/rendererProcess/components/VBoardIndex.vue";
import BrowserIndex from "@/rendererProcess/components/VBrowserIndex.vue";
import SettingsIndex from "@/rendererProcess/components/VSettingsIndex.vue";
import { App as _App } from "vue";
import GlobalSettings from "@/rendererProcess/vueComponentCustomProperties/settings";
import GlobalStates from "@/rendererProcess/vueComponentCustomProperties/states";
import * as GlobalSystemInfo from "@/rendererProcess/vueComponentCustomProperties/systemInfo";
import GlobalDefines from "@/rendererProcess/vueComponentCustomProperties/defines";
import GlobalAPI from "@/rendererProcess/vueComponentCustomProperties/api";
import GlobalComponents from "@/rendererProcess/vueComponentCustomProperties/components";
import GlobalSystemDarkMode from "@/rendererProcess/vueComponentCustomProperties/systemDarkMode";
import GlobalAppInfo from "@/rendererProcess/vueComponentCustomProperties/appInfo";
import GlobalNSFW from "@/rendererProcess/vueComponentCustomProperties/nsfw";
import * as GlobalWindowType from "@/rendererProcess/vueComponentCustomProperties/windowType";
import * as GlobalWindowIsFocused from "@/rendererProcess/vueComponentCustomProperties/windowIsFocused";

import * as GlobalTexts from "@/rendererProcess/vueComponentCustomProperties/texts";
import { Keyboards } from "@/rendererProcess/utils/keyboards";
import { API } from "@/rendererProcess/api";
import { WindowType } from "@/commons/datas/windowType";
import { logChunk } from "./utils/rendererLogger";
function createApp(type: WindowType) {
  switch(type) {
    case WindowType.BOARD:
      return _createApp(BoardIndex);
    case WindowType.BROWSER:
      return _createApp(BrowserIndex);
    case WindowType.SETTINGS:
      return _createApp(SettingsIndex);
  }
  return _createApp(BoardIndex);
}
(async () => {
  const windowType = GlobalWindowType.createPlugin();
  logChunk().log(`window "${windowType.windowType}" init`);
  window.onerror = (e) => {
    logChunk().log(`window "${windowType.windowType}" error:`, e);
  }
  AnimatedGIFLoader.add?.();
  const app = createApp(windowType.windowType);
  async function appUse(plugin: Plugin) {
    return await plugin.install?.(app);
  }
  const i18n = createI18n({
    locale: "ja",
    messages: languages,
  });
  const platform = await API.send("getPlatform");
  appUse(i18n);
  appUse(windowType);
  appUse(GlobalSystemInfo.createPlugin(platform));
  appUse(GlobalDefines);
  appUse(GlobalAPI);
  appUse(GlobalComponents);
  appUse(GlobalSystemDarkMode);
  appUse(GlobalTexts.createPlugin(platform));
  await appUse(GlobalSettings);
  await appUse(GlobalNSFW);
  await appUse(GlobalStates);
  await appUse(GlobalAppInfo);
  await appUse(GlobalWindowIsFocused.createPlugin(windowType.windowType));
  console.log("WindowType:", windowType.windowType);
  app.mount("#app");
  const keyboard = new Keyboards();
  keyboard.down(["d"], () => {
    if (Keyboards.pressedOR("control", "meta")) {
      API.send("windowToggleDevTools");
    }
  });
  keyboard.enabled = true;
})();