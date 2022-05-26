import { createApp, Plugin } from "vue";
import { createI18n } from "vue-i18n";
// import { Loader as PIXILoader } from '@pixi/loaders';
import { AnimatedGIFLoader } from '@/rendererProcess/utils/pixi-gif';
import languages from "@/commons/languages";
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
  const entry = await getVueEntry(location.search.replace(/\?/g, ""));
  console.log("ENTRY:", entry.id);
  const appUse = async (plugin: Plugin) => await plugin.install!(entry.app);
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
  entry.app.mount("#app");
})();
async function getVueEntry(id: string) {
  let app: _App;
  switch(id) {
    case "browser":
      app = createApp((await import("@/rendererProcess/components/VBrowserIndex.vue")).default);
      break;
    case "main":
    default:
      app = createApp((await import("@/rendererProcess/components/VIndex.vue")).default);
      break;
  }
  return {
    app,
    id
  };
}