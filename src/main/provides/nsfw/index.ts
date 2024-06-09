import { createKey, createUseFunction } from "@/main/libs/di";
import { useConfigSettings } from "@/main/provides/configs";

export class NSFW {
  private temporaryShowNSFW = false;
  getShowNSFW() {
    const configSettings = useConfigSettings();
    return this.temporaryShowNSFW || configSettings.data.alwaysShowNSFW;
  }
  setTemporaryShowNSFW(value: boolean) {
    this.temporaryShowNSFW = value;
  }
}
export const nsfwKey = createKey<NSFW>("nsfw");
export const useNSFW = createUseFunction(nsfwKey);
