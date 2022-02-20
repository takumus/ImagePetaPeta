import { reactive, App } from "vue";
const keyboards = reactive({
  shift: false,
  ctrl: false,
  cmd: false,
  delete: false,
  escape: false,
  current: "",
  v: false,
  c: false
});
const Plugin = {
  install(app: App) {
    app.config.globalProperties.$keyboards = keyboards;
    window.addEventListener("keydown", (e) => {
      switch(e.key.toLowerCase()) {
        case "shift":
          keyboards.shift = true;
          break;
        case "meta":
        case "control":
          keyboards.ctrl = true;
          break;
        case "backspace":
        case "delete":
          keyboards.delete = true;
          break;
        case "escape":
          keyboards.escape = true;
          break;
        case "v":
          keyboards.v = true;
          break;
      }
      keyboards.current = e.key.toLowerCase();
    });
    window.addEventListener("keyup", (e) => {
      switch(e.key.toLowerCase()) {
        case "shift":
          keyboards.shift = false;
          break;
        case "meta":
        case "control":
          keyboards.ctrl = false;
          break;
        case "backspace":
        case "delete":
          keyboards.delete = false;
          break;
        case "escape":
          keyboards.escape = false;
          break;
        case "v":
          keyboards.v = false;
          break;
      }
      if (keyboards.current == e.key.toLowerCase()) keyboards.current = "";
    });
  }
}
export default Plugin;
declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $keyboards: typeof keyboards;
  }
}