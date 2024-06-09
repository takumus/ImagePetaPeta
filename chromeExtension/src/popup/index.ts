import App from "$/popup/VIndex.vue";
import { createApp } from "vue";

import { applyStyle, defaultStyles } from "@/renderer/styles/styles";

applyStyle(defaultStyles.dark);
createApp(App).mount("#app");
