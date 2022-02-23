import { App, ref } from "vue";
const darkMode = ref(false);
getSystemDarkMode();
export default {
  async install(app: App) {
    app.config.globalProperties.$systemDarkMode = darkMode;
  }
}
declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $systemDarkMode: typeof darkMode;
  }
}
function getSystemDarkMode() {
  darkMode.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
  setTimeout(() => {
    getSystemDarkMode();
  }, 3000);
}