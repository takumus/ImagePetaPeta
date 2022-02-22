import { createApp, Plugin } from "vue";
import { createI18n } from "vue-i18n";
import languages from "@/languages";
import App from "@/renderer/components/VIndex.vue";
import { App as _App, reactive } from "vue";
import GlboalKeyboard from "@/renderer/vueComponentCustomProperties/keyboards";
import GlobalSettings from "@/renderer/vueComponentCustomProperties/settings";
import GlobalSystemInfo from "@/renderer/vueComponentCustomProperties/systemInfo";
import GlobalDefines from "@/renderer/vueComponentCustomProperties/defines";
import GlobalAPI from "@/renderer/vueComponentCustomProperties/api";
import GlobalComponents from "./vueComponentCustomProperties/components";
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
  await appUse(GlobalSettings)
  await appUse(GlobalSystemInfo);
  app.mount("#app");
})();