import { createApp } from "vue";
import { createI18n } from "vue-i18n";
import languages from "@/languages";
import App from "@/renderer/components/VIndex.vue";
import { App as _App, reactive } from "vue";
import GlboalKeyboard from "@/renderer/vueGlobals/globalKeyboard";
import GlobalSettings from "@/renderer/vueGlobals/globalSettings";
import GlobalSystemInfo from "@/renderer/vueGlobals/globalSystemInfo";
import GlobalDefines from "@/renderer/vueGlobals/globalDefines";
import GlobalAPI from "@/renderer/vueGlobals/globalAPI";
import GlobalComponents from "./vueGlobals/globalComponents";
(async () => {
  const app = createApp(App);
  const i18n = createI18n({
    locale: "ja",
    messages: languages,
  });
  app.use(i18n);
  app.use(GlboalKeyboard);
  app.use(GlobalDefines);
  app.use(GlobalAPI);
  app.use(GlobalComponents);
  await GlobalSettings.install(app);
  await GlobalSystemInfo.install(app);
  app.mount("#app");
})();