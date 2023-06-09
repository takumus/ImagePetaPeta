import { inject } from "@/renderer/utils/vue";

import { styleStoreKey } from "@/renderer/stores/styleStore/createStyleStore";

export function useStyleStore() {
  return inject(styleStoreKey);
}
