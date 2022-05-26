import { createApp, Plugin } from "vue";
import { createI18n } from "vue-i18n";
// import { Loader as PIXILoader } from '@pixi/loaders';
import { AnimatedGIFLoader } from '@/rendererProcess/utils/pixi-gif';
import languages from "@/commons/languages";
import App from "@/rendererProcess/components/VIndex.vue";
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
import * as GlobalTexts from "@/rendererProcess/vueComponentCustomProperties/texts";
import { API } from "@/rendererProcess/api";
(async () => {
  AnimatedGIFLoader.add?.();
  const isBrowser = location.search.includes("?browser");
  console.log(isBrowser ? "BROWSER" : "MAIN");
  const app = isBrowser ? createApp(BrowserIndex) : createApp(App);
  const appUse = async (plugin: Plugin) => await plugin.install!(app);
  const i18n = createI18n({
    locale: "ja",
    messages: languages,
  });
  const platform = await API.send("getPlatform");
  appUse(i18n);
  appUse(GlobalSystemInfo.createPlugin(platform));
  appUse(GlobalDefines);
  appUse(GlobalAPI);
  appUse(GlobalComponents);
  appUse(GlobalSystemDarkMode);
  appUse(GlobalTexts.createPlugin(platform));
  await appUse(GlobalSettings);
  await appUse(GlobalStates);
  await appUse(GlobalAppInfo);
  app.mount("#app");
})();