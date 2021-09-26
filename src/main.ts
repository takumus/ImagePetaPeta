import { createApp } from "vue"
import { createI18n } from "vue-i18n";
import languages from "@/languages";
import App from "@/App.vue"
import { Keyboards, initKeyboards } from "@/utils/keybaord";
import { reactivedSettings } from "@/utils/settings";
import store from './store';
const app = createApp(App).use(store);
const i18n = createI18n({
  locale: 'ja',
  messages: languages,
});
initKeyboards();
app.config.globalProperties.$globalComponents = {};
app.config.globalProperties.$settings = reactivedSettings;
app.config.globalProperties.$keyboards = Keyboards;
app.use(i18n);
app.mount('#app');