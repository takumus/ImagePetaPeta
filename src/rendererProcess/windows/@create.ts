import { Component, createApp, Plugin } from "vue";
import { createI18n } from "vue-i18n";
import languages from "@/commons/languages";
import { Keyboards } from "@/rendererProcess/utils/keyboards";
import { API } from "@/rendererProcess/api";
import { logChunk } from "@/rendererProcess/utils/rendererLogger";
import { WindowType } from "@/commons/datas/windowType";
import GlobalSettings from "@/rendererProcess/vueComponentCustomProperties/settings";
import GlobalStates from "@/rendererProcess/vueComponentCustomProperties/states";
import GlobalDefines from "@/rendererProcess/vueComponentCustomProperties/defines";
import GlobalAPI from "@/rendererProcess/vueComponentCustomProperties/api";
import GlobalComponents from "@/rendererProcess/vueComponentCustomProperties/components";
import GlobalSystemDarkMode from "@/rendererProcess/vueComponentCustomProperties/systemDarkMode";
import GlobalDarkMode from "@/rendererProcess/vueComponentCustomProperties/darkMode";
import GlobalAppInfo from "@/rendererProcess/vueComponentCustomProperties/appInfo";
import GlobalNSFW from "@/rendererProcess/vueComponentCustomProperties/nsfw";
import GlobalWindowArgs from "@/rendererProcess/vueComponentCustomProperties/windowArgs";
import * as GlobalSystemInfo from "@/rendererProcess/vueComponentCustomProperties/systemInfo";
import * as GlobalWindowType from "@/rendererProcess/vueComponentCustomProperties/windowType";
import * as GlobalWindowIsFocused from "@/rendererProcess/vueComponentCustomProperties/windowIsFocused";
import * as GlobalTexts from "@/rendererProcess/vueComponentCustomProperties/texts";

import { createDarkModeStore, darkModeStoreKey } from "@/rendererProcess/stores/darkModeStore";
export async function create(component: Component, windowType: WindowType) {
  let initialized = false;
  const initVue = async () => {
    if (initialized) {
      return;
    }
    initialized = true;
    logChunk().log(`window "${windowType}" init`);
    const app = createApp(component);
    async function appUse(plugin: Plugin) {
      return await plugin.install?.(app);
    }
    const platform = await API.send("getPlatform");
    await appUse(createI18n({
      locale: "ja",
      messages: languages,
    }));
    await appUse(GlobalWindowArgs);
    await appUse(GlobalWindowType.createPlugin(windowType));
    await appUse(GlobalSystemInfo.createPlugin(platform));
    await appUse(GlobalDefines);
    await appUse(GlobalAPI);
    await appUse(GlobalComponents);
    await appUse(GlobalSystemDarkMode);
    await appUse(GlobalTexts.createPlugin(platform));
    await appUse(GlobalDarkMode);
    await appUse(GlobalSettings);
    await appUse(GlobalNSFW);
    await appUse(GlobalStates);
    await appUse(GlobalAppInfo);
    await appUse(GlobalWindowIsFocused.createPlugin(windowType));
    app.provide(darkModeStoreKey, createDarkModeStore());
    app.mount("#app");
  }
  API.on("dataInitialized", () => {
    initVue();
  });
  if (await API.send("getIsDataInitialized")) {
    initVue();
  }
  document.body.addEventListener("touchstart", (e) => {
    e.preventDefault();
  }, {
    passive: false,
    capture: false
  });
  new Keyboards().down(["KeyD"], () => {
    if (Keyboards.pressedOR("ControlLeft", "ControlRight", "MetaLeft", "MetaRight")) {
      API.send("windowToggleDevTools");
    }
  }).enabled = true;
  window.onerror = (e) => {
    logChunk().log(`window "${windowType}" error:`, e);
  }
}