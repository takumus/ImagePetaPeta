import { KeyStoreCreatorPair } from "../stores/keyStoreCreatorPair";
import { ComponentType, createElement } from "react";
import { createRoot } from "react-dom/client";

import { WindowName } from "@/commons/windows";

import { StoreProvider } from "@/renderer/contexts/StoreContext";
import { initializeI18n } from "@/renderer/i18n";
import { ClickChecker } from "@/renderer/libs/clickChecker";
import { IPC } from "@/renderer/libs/ipc";
import { Keyboards } from "@/renderer/libs/keyboards";
import { logChunk } from "@/renderer/libs/rendererLogger";
import "@/renderer/styles/panda.css";
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
  component: ComponentType,
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
    await initializeI18n();
    const platform = await IPC.common.getPlatform();
    const container = document.querySelector("#app");
    if (!(container instanceof HTMLElement)) {
      throw new Error('Could not find "#app" root element');
    }
    const resolvedStores = await Promise.all([
      (async () => ({ key: styleStoreKey, value: await createStyleStore() }))(),
      (async () => ({ key: nsfwStoreKey, value: await createNSFWStore() }))(),
      (async () => ({ key: windowNameStoreKey, value: await createWindowNameStore(windowName) }))(),
      (async () => ({ key: definesStoreKey, value: await createDefinesStore() }))(),
      (async () => ({ key: systemInfoStoreKey, value: await createSystemInfoStore(platform) }))(),
      (async () => ({ key: statesStoreKey, value: await createStatesStore() }))(),
      (async () => ({ key: settingsStoreKey, value: await createSettingsStore() }))(),
      (async () => ({ key: appInfoStoreKey, value: await createAppInfoStore() }))(),
      (async () => ({ key: textsStoreKey, value: await createTextsStore() }))(),
      (async () => ({ key: componentsStoreKey, value: await createComponentsStore() }))(),
      (async () => ({ key: windowTitleStoreKey, value: await createWindowTitleStore() }))(),
      ...(stores?.map(async (store) => ({ key: store.key, value: await store.creator() })) || []),
    ]);
    ClickChecker.init();
    createRoot(container).render(
      createElement(
        StoreProvider,
        {
          stores: resolvedStores,
        },
        createElement(component),
      ),
    );
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
