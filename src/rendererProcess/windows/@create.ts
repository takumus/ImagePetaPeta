import { Component, createApp as _createApp, Plugin } from "vue";
import { createI18n } from "vue-i18n";
import languages from "@/commons/languages";
import { App as _App } from "vue";
import GlobalSettings from "@/rendererProcess/vueComponentCustomProperties/settings";
import GlobalStates from "@/rendererProcess/vueComponentCustomProperties/states";
import * as GlobalSystemInfo from "@/rendererProcess/vueComponentCustomProperties/systemInfo";
import GlobalDefines from "@/rendererProcess/vueComponentCustomProperties/defines";
import GlobalAPI from "@/rendererProcess/vueComponentCustomProperties/api";
import GlobalComponents from "@/rendererProcess/vueComponentCustomProperties/components";
import GlobalSystemDarkMode from "@/rendererProcess/vueComponentCustomProperties/systemDarkMode";
import GlobalDarkMode from "@/rendererProcess/vueComponentCustomProperties/darkMode";
import GlobalAppInfo from "@/rendererProcess/vueComponentCustomProperties/appInfo";
import GlobalNSFW from "@/rendererProcess/vueComponentCustomProperties/nsfw";
import * as GlobalWindowType from "@/rendererProcess/vueComponentCustomProperties/windowType";
import * as GlobalWindowIsFocused from "@/rendererProcess/vueComponentCustomProperties/windowIsFocused";

import * as GlobalTexts from "@/rendererProcess/vueComponentCustomProperties/texts";
import { Keyboards } from "@/rendererProcess/utils/keyboards";
import { API } from "@/rendererProcess/api";
import { logChunk } from "../utils/rendererLogger";
export async function create(component: Component) {
  document.body.addEventListener("touchstart", (e) => {
    e.preventDefault();
  }, {
    passive: false,
    capture: false
  });
  let initialized = false;
  const initVue = async () => {
    if (initialized) {
      return;
    }
    initialized = true;
    const windowType = GlobalWindowType.createPlugin();
    logChunk().log(`window "${windowType.windowType}" init`);
    window.onerror = (e) => {
      logChunk().log(`window "${windowType.windowType}" error:`, e);
    }
    // const app = createApp(windowType.windowType);
    const app = _createApp(component);
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
    await appUse(GlobalDarkMode);
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
  }
  API.on("dataInitialized", () => {
    initVue();
  });
  if (await API.send("getIsDataInitialized")) {
    initVue();
  }
}