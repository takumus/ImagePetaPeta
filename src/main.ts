import { createApp } from "vue"
import { createI18n } from "vue-i18n";
import languages from "@/languages";
import App from "@/components/VIndex.vue"
import { App as _App, reactive } from "vue";
import GlboalKeyboard from "@/globals/globalKeyboard";
import GlobalSettings from "@/globals/globalSettings";
import GlobalSystemInfo from "@/globals/globalSystemInfo";
import GlobalDefines from "@/globals/globalDefines";
(async () => {
  const app = createApp(App);
  const i18n = createI18n({
    locale: "ja",
    messages: languages,
  });
  app.use(i18n);
  app.use(GlboalKeyboard);
  await GlobalSettings.install(app);
  await GlobalSystemInfo.install(app);
  await GlobalDefines.install(app);
  app.config.globalProperties.$globalComponents = reactive({
    currentModalId: [],
    currentModalZIndex: 0
  });
  app.mount("#app");
})();