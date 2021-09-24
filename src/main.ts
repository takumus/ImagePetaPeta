import { createApp } from "vue"
import App from "@/App.vue"
import GLOBALS from "@/globals";

const app = createApp(App);
app.config.globalProperties.$globals = GLOBALS;
app.mount('#app');