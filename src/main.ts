import { createApp } from "vue"
import { createI18n } from "vue-i18n";
import languages from "@/languages";
import App from "@/App.vue"
import { initKeyboards } from "@/globals/globalKeyboard";
import { initSettings } from "@/globals/globalSettings";
import store from './store';
const app = createApp(App).use(store);
const i18n = createI18n({
  locale: 'ja',
  messages: languages,
});
initKeyboards(app);
initSettings(app);
app.config.globalProperties.$globalComponents = {};
app.use(i18n);
app.mount('#app');