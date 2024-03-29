import { onUnmounted } from "vue";

import { Keyboards } from "@/renderer/libs/keyboards";

export function useKeyboardsStore(lockable = true) {
  const keyboards = new Keyboards(lockable);
  onUnmounted(() => {
    keyboards.destroy();
  });
  return keyboards;
}
