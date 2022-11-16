import { Component, createApp, InjectionKey, Plugin } from "vue";
import { createI18n } from "vue-i18n";
import languages from "@/commons/languages";
import { Keyboards } from "@/renderer/utils/keyboards";
import { IPC } from "@/renderer/ipc";
import { logChunk } from "@/renderer/utils/rendererLogger";
import { WindowType } from "@/commons/datas/windowType";

import {
  createDarkModeStore,
  darkModeStoreKey,
} from "@/renderer/stores/darkModeStore/createDarkModeStore";
import { createNSFWStore, nsfwStoreKey } from "@/renderer/stores/nsfwStore/createNSFWStore";
import { createWindowTypeStore, windowTypeStoreKey } from "@/renderer/stores/windowTypeStore";
import {
  createDefinesStore,
  definesStoreKey,
} from "@/renderer/stores/definesStore/createDefinesStore";
import {
  createSystemInfoStore,
  systemInfoStoreKey,
} from "@/renderer/stores/systemInfoStore/createSystemInfoStore";
import {
  createWindowStatusStore,
  windowStatusStoreKey,
} from "@/renderer/stores/windowStatusStore/createWindowStatusStore";
import { createStatesStore, statesStoreKey } from "@/renderer/stores/statesStore/createStatesStore";
import {
  settingsStoreKey,
  createSettingsStore,
} from "@/renderer/stores/settingsStore/createSettingsStore";
import {
  appInfoStoreKey,
  createAppInfoStore,
} from "@/renderer/stores/appInfoStore/createAppInfoStore";
import { textsStoreKey, createTextsStore } from "@/renderer/stores/textsStore/createTextsStore";
import {
  componentsStoreKey,
  createComponentsStore,
} from "@/renderer/stores/componentsStore/createComponentsStore";
import {
  createWindowTitleStore,
  windowTitleStoreKey,
} from "@/renderer/stores/windowTitleStore/createWindowTitleStore";
import { injectAnimatedGIFAsset } from "@/renderer/utils/pixi-gif/animatedGIFAsset";
import { ClickChecker } from "@/renderer/utils/clickChecker";
import { KeyStoreCreatorPair } from "../stores/keyStoreCreatorPair";
export async function create(
  component: Component,
  windowType: WindowType,
  stores?: KeyStoreCreatorPair<any>[],
) {
  let initialized = false;
  const initVue = async () => {
    if (initialized) {
      return;
    }
    initialized = true;
    logChunk().log(`$Window "${windowType}" init`);
    const app = createApp(component);
    async function appUse(plugin: Plugin) {
      return await plugin.install?.(app);
    }
    const platform = await IPC.send("getPlatform");
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
      (async () => app.provide(windowTitleStoreKey, await createWindowTitleStore()))(),
      ...(stores?.map(async (store) => app.provide(store.key, await store.creator())) || []),
    ]);
    injectAnimatedGIFAsset();
    ClickChecker.init();
    app.mount("#app");
  };
  IPC.on("dataInitialized", () => {
    initVue();
  });
  if (await IPC.send("getIsDataInitialized")) {
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
      IPC.send("windowToggleDevTools");
    }
  });
  keyboards.enabled = true;
  window.onerror = (e) => {
    logChunk().log(`window "${windowType}" error:`, e);
  };
}
