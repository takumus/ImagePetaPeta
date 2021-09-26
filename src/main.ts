import { createApp } from "vue"
import { createI18n } from "vue-i18n";
import languages from "@/languages";
import App from "@/App.vue"
import GlboalKeyboard from "@/globals/globalKeyboard";
import GlobalSettings from "@/globals/globalSettings";
import store from './store';

const app = createApp(App).use(store);
const i18n = createI18n({
  locale: 'ja',
  messages: languages,
});

app.use(i18n);
app.use(GlboalKeyboard);
app.use(GlobalSettings);
app.config.globalProperties.$globalComponents = {};

app.mount('#app');