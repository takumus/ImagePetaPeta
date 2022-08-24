import { Component, createApp, InjectionKey, Plugin } from "vue";
import { createI18n } from "vue-i18n";
import languages from "@/commons/languages";
import { Keyboards } from "@/rendererProcess/utils/keyboards";
import { API } from "@/rendererProcess/api";
import { logChunk } from "@/rendererProcess/utils/rendererLogger";
import { WindowType } from "@/commons/datas/windowType";

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
import { componentsStoreKey, createComponentsStore } from "@/rendererProcess/stores/componentsStore";
export async function create(
  component: Component,
  windowType: WindowType,
  stores?: { key: InjectionKey<unknown> | string; value: () => Promise<unknown> }[],
) {
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
        legacy: false,
        locale: "ja",
        messages: languages,
      }),
    );
    await Promise.all([
      (async () => app.provide(darkModeStoreKey, await createDarkModeStore()))(),
      (async () => app.provide(nsfwStoreKey, await createNSFWStore()))(),
      (async () => app.provide(windowTypeStoreKey, await createWindowTypeStore(windowType)))(),
      (async () => app.provide(definesStoreKey, await createDefinesStore()))(),
      (async () => app.provide(systemInfoStoreKey, await createSystemInfoStore(platform)))(),
      (async () => app.provide(windowStatusStoreKey, await createWindowStatusStore(windowType)))(),
      (async () => app.provide(statesStoreKey, await createStatesStore()))(),
      (async () => app.provide(settingsStoreKey, await createSettingsStore()))(),
      (async () => app.provide(appInfoStoreKey, await createAppInfoStore()))(),
      (async () => app.provide(textsStoreKey, await createTextsStore()))(),
      (async () => app.provide(componentsStoreKey, await createComponentsStore()))(),
      ...(stores?.map(async (store) => app.provide(store.key, await store.value())) || []),
    ]);
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
