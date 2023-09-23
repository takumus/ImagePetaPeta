import { RPetaFile } from "@/commons/datas/rPetaFile";

import { ImageLoader } from "@/renderer/utils/pFileObject/@loaders/imageLoader";
import { PFileObjectContent } from "@/renderer/utils/pFileObject/pFileObjectContent";

export class PImageFileObjectContent extends PFileObjectContent<void> {
  private _cancelLoading?: () => void;
  private _canceledLoading = false;
  async load(petaFile: RPetaFile) {
    const loader = new ImageLoader(petaFile);
    this._cancelLoading = loader.cancel.bind(loader);
    const image = await loader.load();
    if (this._canceledLoading) {
      return false;
    }
    if (image.texture) {
      this.texture = image.texture;
    }
    return true;
  }
  destroy() {
    this._canceledLoading = true;
    this._cancelLoading?.();
    super.destroy();
  }
}
