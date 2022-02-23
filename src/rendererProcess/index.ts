import { createApp, Plugin } from "vue";
import { createI18n } from "vue-i18n";
import languages from "@/commons/languages";
import App from "@/rendererProcess/components/VIndex.vue";
import { App as _App, reactive } from "vue";
import GlboalKeyboard from "@/rendererProcess/vueComponentCustomProperties/keyboards";
import GlobalSettings from "@/rendererProcess/vueComponentCustomProperties/settings";
import GlobalSystemInfo from "@/rendererProcess/vueComponentCustomProperties/systemInfo";
import GlobalDefines from "@/rendererProcess/vueComponentCustomProperties/defines";
import GlobalAPI from "@/rendererProcess/vueComponentCustomProperties/api";
import GlobalComponents from "@/rendererProcess/vueComponentCustomProperties/components";
import GlobalSystemDarkMode from "@/rendererProcess/vueComponentCustomProperties/systemDarkMode";
(async () => {
  const app = createApp(App);
  const appUse = async (plugin: Plugin) => await plugin.install!(app);
  const i18n = createI18n({
    locale: "ja",
    messages: languages,
  });
  appUse(i18n);
  appUse(GlboalKeyboard);
  appUse(GlobalDefines);
  appUse(GlobalAPI);
  appUse(GlobalComponents);
  appUse(GlobalSystemDarkMode);
  await appUse(GlobalSettings)
  await appUse(GlobalSystemInfo);
  app.mount("#app");
})();