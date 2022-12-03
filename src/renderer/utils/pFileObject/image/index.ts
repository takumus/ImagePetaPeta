import { RPetaFile } from "@/commons/datas/rPetaFile";

import { getImage } from "@/renderer/utils/pFileObject/@loaders/imageLoader";
import { PFileObjectContent } from "@/renderer/utils/pFileObject/pFileObjectContent";

export class PImageFileObjectContent extends PFileObjectContent {
  private _cancelLoading?: () => void;
  private _canceledLoading = false;
  async load(petaFile: RPetaFile) {
    const result = getImage(petaFile);
    this._cancelLoading = result.cancel;
    const image = await result.promise;
    if (this._canceledLoading) {
      return false;
    }
    if (image.texture) {
      this.texture = image.texture;
    }
    return true;
  }
  destroy() {
    super.destroy();
  }
  cancelLoading(): void {
    this._canceledLoading = true;
    this._cancelLoading?.();
    return;
  }
}
