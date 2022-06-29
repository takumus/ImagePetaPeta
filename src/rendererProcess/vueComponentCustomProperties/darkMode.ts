import { App, ref } from "vue";
import { API } from "../api";
const darkMode = ref(false);
export default {
  async install(app: App) {
    darkMode.value = await API.send("getIsDarkMode");
    app.config.globalProperties.$darkMode = darkMode;
    API.on("darkMode", (event, value) => {
      darkMode.value = value;
    });
  }
}
declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $darkMode: typeof darkMode;
  }
}