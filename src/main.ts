import { createApp } from "vue"
import { createI18n } from "vue-i18n";
import languages from "@/languages";
import App from "@/App.vue"
import GLOBALS from "@/globals";

const app = createApp(App);
const i18n = createI18n({
  locale: 'ja',
  messages: languages,
});
app.config.globalProperties.$globals = GLOBALS;
app.use(i18n);
app.mount('#app');