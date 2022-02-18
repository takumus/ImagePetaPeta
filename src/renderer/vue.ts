import { createApp } from "vue"
import { createI18n } from "vue-i18n";
import languages from "@/languages";
import App from "@/renderer/components/VIndex.vue"
import { App as _App, reactive } from "vue";
import GlboalKeyboard from "@/renderer/globals/globalKeyboard";
import GlobalSettings from "@/renderer/globals/globalSettings";
import GlobalSystemInfo from "@/renderer/globals/globalSystemInfo";
import GlobalDefines from "@/renderer/globals/globalDefines";
(async () => {
  const app = createApp(App);
  const i18n = createI18n({
    locale: "ja",
    messages: languages,
  });
  app.use(i18n);
  app.use(GlboalKeyboard);
  app.use(GlobalDefines);
  await GlobalSettings.install(app);
  await GlobalSystemInfo.install(app);
  app.config.globalProperties.$globalComponents = reactive({
    currentModalId: [],
    currentModalZIndex: 0
  });
  app.mount("#app");
})();