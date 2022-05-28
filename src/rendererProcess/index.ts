import { createApp, Plugin } from "vue";
import { createI18n } from "vue-i18n";
// import { Loader as PIXILoader } from '@pixi/loaders';
import { AnimatedGIFLoader } from '@/rendererProcess/utils/pixi-gif';
import languages from "@/commons/languages";
import App from "@/rendererProcess/components/VMainIndex.vue";
import BrowserIndex from "@/rendererProcess/components/VBrowserIndex.vue";
import { App as _App } from "vue";
import GlobalSettings from "@/rendererProcess/vueComponentCustomProperties/settings";
import GlobalStates from "@/rendererProcess/vueComponentCustomProperties/states";
import * as GlobalSystemInfo from "@/rendererProcess/vueComponentCustomProperties/systemInfo";
import GlobalDefines from "@/rendererProcess/vueComponentCustomProperties/defines";
import GlobalAPI from "@/rendererProcess/vueComponentCustomProperties/api";
import GlobalComponents from "@/rendererProcess/vueComponentCustomProperties/components";
import GlobalSystemDarkMode from "@/rendererProcess/vueComponentCustomProperties/systemDarkMode";
import GlobalAppInfo from "@/rendererProcess/vueComponentCustomProperties/appInfo";
import * as GlobalWindowType from "@/rendererProcess/vueComponentCustomProperties/windowType";
import * as GlobalWindowIsFocused from "@/rendererProcess/vueComponentCustomProperties/windowIsFocused";

import * as GlobalTexts from "@/rendererProcess/vueComponentCustomProperties/texts";
import { Keyboards } from "@/rendererProcess/utils/keyboards";
import { API } from "@/rendererProcess/api";
import { WindowType } from "@/commons/datas/windowType";
(async () => {
  const windowType = GlobalWindowType.createPlugin();
  AnimatedGIFLoader.add?.();
  const app = windowType.windowType === WindowType.BROWSER ? createApp(BrowserIndex) : createApp(App);
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
  await appUse(GlobalStates);
  await appUse(GlobalAppInfo);
  await appUse(GlobalWindowIsFocused.createPlugin());
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