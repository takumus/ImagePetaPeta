import { Keyboards } from "@/renderer/utils/keyboards";
import { onUnmounted } from "vue";

export function useKeyboardsStore(lockable = true) {
  const keyboards = new Keyboards(lockable);
  onUnmounted(() => {
    keyboards.destroy();
  });
  return keyboards;
}
