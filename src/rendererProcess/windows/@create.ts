import { Component, createApp, Plugin } from "vue";
import { createI18n } from "vue-i18n";
import languages from "@/commons/languages";
import { Keyboards } from "@/rendererProcess/utils/keyboards";
import { API } from "@/rendererProcess/api";
import { logChunk } from "@/rendererProcess/utils/rendererLogger";
import { WindowType } from "@/commons/datas/windowType";
import GlobalComponents from "@/rendererProcess/vueComponentCustomProperties/components";

import { createDarkModeStore, darkModeStoreKey } from "@/rendererProcess/stores/darkModeStore";
import { createNSFWStore, nsfwStoreKey } from "@/rendererProcess/stores/nsfwStore";
import { createWindowTypeStore, windowTypeStoreKey } from "@/rendererProcess/stores/windowTypeStore";
import { createDefinesStore, definesStoreKey } from "@/rendererProcess/stores/definesStore";
import { createSystemInfoStore, systemInfoStoreKey } from "@/rendererProcess/stores/systemInfoStore";
import { createWindowStatusStore, windowStatusStoreKey } from "@/rendererProcess/stores/windowStatusStore";
import { createStatesStore, statesStoreKey } from "@/rendererProcess/stores/statesStore";
import { settingsStoreKey, createSettingsStore } from "@/rendererProcess/stores/settingsStore";
import { appInfoStoreKey, createAppInfoStore } from "@/rendererProcess/stores/appInfoStore";
import { textsStoreKey, createTextsStore } from "@/rendererProcess/stores/textsStore";
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
    await appUse(
      createI18n({
        locale: "ja",
        messages: languages,
      }),
    );
    await appUse(GlobalComponents);
    app.provide(darkModeStoreKey, await createDarkModeStore());
    app.provide(nsfwStoreKey, await createNSFWStore());
    app.provide(windowTypeStoreKey, await createWindowTypeStore(windowType));
    app.provide(definesStoreKey, await createDefinesStore());
    app.provide(systemInfoStoreKey, await createSystemInfoStore(platform));
    app.provide(windowStatusStoreKey, await createWindowStatusStore(windowType));
    app.provide(statesStoreKey, await createStatesStore());
    app.provide(settingsStoreKey, await createSettingsStore());
    app.provide(appInfoStoreKey, await createAppInfoStore());
    app.provide(textsStoreKey, await createTextsStore());
    app.mount("#app");
  };
  API.on("dataInitialized", () => {
    initVue();
  });
  if (await API.send("getIsDataInitialized")) {
    initVue();
  }
  document.body.addEventListener(
    "touchstart",
    (e) => {
      e.preventDefault();
    },
    {
      passive: false,
      capture: false,
    },
  );
  const keyboards = new Keyboards();
  keyboards.keys("KeyD").down(() => {
    if (Keyboards.pressedOR("ControlLeft", "ControlRight", "MetaLeft", "MetaRight")) {
      API.send("windowToggleDevTools");
    }
  });
  keyboards.enabled = true;
  window.onerror = (e) => {
    logChunk().log(`window "${windowType}" error:`, e);
  };
}
