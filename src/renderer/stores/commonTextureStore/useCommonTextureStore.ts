import { inject } from "@/renderer/utils/vue";

import { commonTextureStoreKey } from "@/renderer/stores/commonTextureStore/createCommonTextureStore";

export function useCommonTextureStore() {
  return inject(commonTextureStoreKey);
}
