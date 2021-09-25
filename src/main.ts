import { createApp } from "vue"
import { createI18n } from "vue-i18n";
import languages from "@/languages";
import App from "@/App.vue"
import GLOBALS from "@/globals";
import { Keyboards, initKeyboards } from "@/utils/keybaord";
const app = createApp(App);
const i18n = createI18n({
  locale: 'ja',
  messages: languages,
});
initKeyboards();
app.config.globalProperties.$globals = GLOBALS;
app.config.globalProperties.$keyboards = Keyboards;
app.use(i18n);
app.mount('#app');