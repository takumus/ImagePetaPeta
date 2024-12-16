import { KeyStoreCreatorPair } from "../stores/keyStoreCreatorPair";
import { Component, createApp } from "vue";
import { createI18n } from "vue-i18n";

import languages from "@/commons/languages";
import { WindowName } from "@/commons/windows";

import { ClickChecker } from "@/renderer/libs/clickChecker";
import { IPC } from "@/renderer/libs/ipc";
import { Keyboards } from "@/renderer/libs/keyboards";
import { logChunk } from "@/renderer/libs/rendererLogger";
import {
  appInfoStoreKey,
  createAppInfoStore,
} from "@/renderer/stores/appInfoStore/createAppInfoStore";
import {
  componentsStoreKey,
  createComponentsStore,
} from "@/renderer/stores/componentsStore/createComponentsStore";
import {
  createDefinesStore,
  definesStoreKey,
} from "@/renderer/stores/definesStore/createDefinesStore";
import { createNSFWStore, nsfwStoreKey } from "@/renderer/stores/nsfwStore/createNSFWStore";
import {
  createSettingsStore,
  settingsStoreKey,
} from "@/renderer/stores/settingsStore/createSettingsStore";
import { createStatesStore, statesStoreKey } from "@/renderer/stores/statesStore/createStatesStore";
import { createStyleStore, styleStoreKey } from "@/renderer/stores/styleStore/createStyleStore";
import {
  createSystemInfoStore,
  systemInfoStoreKey,
} from "@/renderer/stores/systemInfoStore/createSystemInfoStore";
import { createTextsStore, textsStoreKey } from "@/renderer/stores/textsStore/createTextsStore";
import {
  createWindowNameStore,
  windowNameStoreKey,
} from "@/renderer/stores/windowNameStore/createWindowNameStore";
import {
  createWindowTitleStore,
  windowTitleStoreKey,
} from "@/renderer/stores/windowTitleStore/createWindowTitleStore";
import { createInitialization } from "@/renderer/utils/createInitialization";

export async function create(
  component: Component,
  windowName: WindowName,
  stores?: KeyStoreCreatorPair<unknown>[],
) {
  const keyboards = new Keyboards();
  keyboards.keys("KeyD").down(() => {
    if (Keyboards.pressedOR("ControlLeft", "ControlRight", "MetaLeft", "MetaRight")) {
      IPC.windows.toggleDevTools();
    }
  });
  keyboards.enabled = true;
  const initialization = createInitialization();
  await initialization.initialize();
  let initialized = false;
  const initVue = async () => {
    if (initialized) {
      return;
    }
    initialization.destroy();
    initialized = true;
    logChunk("init").debug(`$Window "${windowName}" init`);
    const app = createApp(component);
    const platform = await IPC.common.getPlatform();
    app.use(
      createI18n<[typeof languages.ja], "ja">({
        legacy: false,
        locale: "ja",
        messages: languages,
      }),
    );
    await Promise.all([
      (async () => app.provide(styleStoreKey, await createStyleStore()))(),
      (async () => app.provide(nsfwStoreKey, await createNSFWStore()))(),
      (async () => app.provide(windowNameStoreKey, await createWindowNameStore(windowName)))(),
      (async () => app.provide(definesStoreKey, await createDefinesStore()))(),
      (async () => app.provide(systemInfoStoreKey, await createSystemInfoStore(platform)))(),
      (async () => app.provide(statesStoreKey, await createStatesStore()))(),
      (async () => app.provide(settingsStoreKey, await createSettingsStore()))(),
      (async () => app.provide(appInfoStoreKey, await createAppInfoStore()))(),
      (async () => app.provide(textsStoreKey, await createTextsStore()))(),
      (async () => app.provide(componentsStoreKey, await createComponentsStore()))(),
      (async () => app.provide(windowTitleStoreKey, await createWindowTitleStore()))(),
      ...(stores?.map(async (store) => app.provide(store.key, await store.creator())) || []),
    ]);
    ClickChecker.init();
    app.mount("#app");
  };
  IPC.initialization.on("complete", () => {
    initVue();
  });
  if (await IPC.common.getIsDataInitialized()) {
    initVue();
  }
  // document.body.addEventListener(
  //   "touchstart",
  //   (e) => {
  //     e.preventDefault();
  //   },
  //   {
  //     passive: false,
  //     capture: false,
  //   },
  // );
  window.onerror = (e) => {
    logChunk("global").debug(`window "${windowName}" error:`, e);
  };
}
