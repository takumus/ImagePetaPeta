import { sendToBackground } from "$/commons/sendToBackground";
import App from "$/contents/ui/components/VIndex.vue";
import { createInjectedDataStore, injectedDataStoreKey } from "$/contents/ui/injectedData";
import { createApp } from "vue";

import { defaultStyles } from "@/renderer/styles/styles";

(async () => {
  const styleString = await sendToBackground("getInjectStyle");
  const domRoot = document.createElement("div");
  const rootShadow = domRoot.attachShadow({ mode: "closed" });
  const domApp = document.createElement("div");
  const style = document.createElement("style");
  style.innerHTML = styleString;
  style.style.display = "none";
  rootShadow.append(style);
  rootShadow.append(domApp);
  document.body.append(domRoot);
  Object.keys(defaultStyles.dark).forEach((key) => {
    domApp.style.setProperty(key, (defaultStyles.dark as { [key: string]: string })[key]);
  });
  const app = createApp(App);
  const injectedDataStore = await createInjectedDataStore({
    domApp,
    domRoot,
    id: "yay",
  });
  app.provide(injectedDataStoreKey, injectedDataStore);
  app.mount(domApp);
  console.log("impt content injected:", location.href);
})();
