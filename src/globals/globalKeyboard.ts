import { reactive, App } from "vue";
const keyboards = reactive({
  shift: false,
  ctrl: false,
  cmd: false,
  delete: false,
  current: ""
});
export function initKeyboards(app: App) {
  app.config.globalProperties.$keyboards = keyboards;
  window.addEventListener("keydown", (e) => {
    switch(e.key.toLowerCase()) {
      case "shift":
        keyboards.shift = true;
        break;
      case "control":
        keyboards.ctrl = true;
        break;
      case "backspace":
      case "delete":
        keyboards.delete = true;
        break;
    }
    keyboards.current = e.key.toLowerCase();
  });
  window.addEventListener("keyup", (e) => {
    switch(e.key.toLowerCase()) {
      case "shift":
        keyboards.shift = false;
        break;
      case "control":
        keyboards.ctrl = false;
        break;
      case "backspace":
      case "delete":
        keyboards.delete = false;
        break;
    }
    if (keyboards.current == e.key.toLowerCase()) keyboards.current = "";
  });
}
declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $keyboards: typeof keyboards;
  }
}