import { reactive, App } from "vue";
const keyboards = reactive({
  shift: false,
  control: false,
  meta: false,
  delete: false,
  backspace: false,
  escape: false,
  v: false,
  c: false
});
export default {
  install(app: App) {
    app.config.globalProperties.$keyboards = keyboards;
    function key(key: string, pressed: boolean) {
      (keyboards as any)[key.toLowerCase()] = pressed;
    }
    window.addEventListener("keydown", (e) => key(e.key, true));
    window.addEventListener("keyup", (e) => key(e.key, false));
  }
}
declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $keyboards: typeof keyboards;
  }
}