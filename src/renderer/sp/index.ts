import { createApp } from "vue";
import { createI18n } from "vue-i18n";

import VIndex from "./VIndex.vue";

import languages from "@/commons/languages";

import { applyStyle, defaultStyles } from "@/renderer/styles/styles";

const app = createApp(VIndex);
applyStyle(defaultStyles.dark);
app.use(
  createI18n<[typeof languages.ja], "ja">({
    legacy: false,
    locale: "ja",
    messages: languages,
  }),
);
app.mount("#app");
