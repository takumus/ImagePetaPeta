import { createApp, Plugin } from "vue";
import { createI18n } from "vue-i18n";
import languages from "@/commons/languages";
import App from "@/rendererProcess/components/VIndex.vue";
import { App as _App, reactive } from "vue";
import GlobalSettings from "@/rendererProcess/vueComponentCustomProperties/settings";
import * as GlobalSystemInfo from "@/rendererProcess/vueComponentCustomProperties/systemInfo";
import GlobalDefines from "@/rendererProcess/vueComponentCustomProperties/defines";
import GlobalAPI from "@/rendererProcess/vueComponentCustomProperties/api";
import GlobalComponents from "@/rendererProcess/vueComponentCustomProperties/components";
import GlobalSystemDarkMode from "@/rendererProcess/vueComponentCustomProperties/systemDarkMode";
import * as GlobalTexts from "@/rendererProcess/vueComponentCustomProperties/texts";
import { API } from "@/rendererProcess/api";
(async () => {
  const app = createApp(App);
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
  await appUse(GlobalSettings)
  app.mount("#app");
})();