import { ref } from "vue";
import { reactive } from "vue";
export const Keyboards = reactive({
  shift: false,
  ctrl: false,
  cmd: false,
  delete: false,
  current: ""
});
export function initKeyboards() {
  window.addEventListener("keydown", (e) => {
    switch(e.key.toLowerCase()) {
      case "shift":
        Keyboards.shift = true;
        break;
      case "control":
        Keyboards.ctrl = true;
        break;
      case "backspace":
      case "delete":
        Keyboards.delete = true;
        break;
    }
    Keyboards.current = e.key.toLowerCase();
  });
  window.addEventListener("keyup", (e) => {
    switch(e.key.toLowerCase()) {
      case "shift":
        Keyboards.shift = false;
        break;
      case "control":
        Keyboards.ctrl = false;
        break;
      case "backspace":
      case "delete":
        Keyboards.delete = false;
        break;
    }
    if (Keyboards.current == e.key.toLowerCase()) Keyboards.current = "";
  });
}
declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $keyboards: typeof Keyboards;
  }
}