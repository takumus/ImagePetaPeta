import { ref } from "vue";
export const Keyboards = {
  shift: ref(false),
  ctrl: ref(false),
  cmd: ref(false),
  delete: ref(false),
  current: ref("")
};
export function initKeyboards() {
  window.addEventListener("keydown", (e) => {
    switch(e.key.toLowerCase()) {
      case "shift":
        Keyboards.shift.value = true;
        break;
      case "control":
        Keyboards.ctrl.value = true;
        break;
      case "backspace":
      case "delete":
        Keyboards.delete.value = true;
        break;
    }
    Keyboards.current.value = e.key.toLowerCase();
  });
  window.addEventListener("keyup", (e) => {
    switch(e.key.toLowerCase()) {
      case "shift":
        Keyboards.shift.value = false;
        break;
      case "control":
        Keyboards.ctrl.value = false;
        break;
      case "backspace":
      case "delete":
        Keyboards.delete.value = false;
        break;
    }
    if (Keyboards.current.value == e.key.toLowerCase()) Keyboards.current.value = "";
  });
}
declare module '@vue/runtime-core' {
  export interface ComponentCustomProperties {
    $keyboards: typeof Keyboards;
  }
}