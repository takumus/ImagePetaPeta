import { RPetaFile } from "@/commons/datas/rPetaFile";

import { VideoLoaderResult, videoLoader } from "@/renderer/utils/pFileObject/loaders/videoLoader";
import { PFileObjectContent } from "@/renderer/utils/pFileObject/pFileObjectContent";

export class PVideoFileObjectContent extends PFileObjectContent {
  private video?: VideoLoaderResult;
  private _canceledLoading = false;
  async load(petaFile: RPetaFile) {
    this.video = videoLoader(petaFile, false, () => {
      this.onUpdateRenderer();
    });
    const texture = await this.video.load();
    if (this._canceledLoading) {
      texture.destroy();
      return false;
    }
    this.texture = texture;
    return true;
  }
  destroy() {
    this.video?.destroy();
    super.destroy();
  }
  play() {
    return this.video?.play();
  }
  pause() {
    return this.video?.pause();
  }
  setVolume(volume: number) {
    if (this.video !== undefined) {
      this.video.videoElement.volume = volume;
    }
  }
  cancelLoading(): void {
    this._canceledLoading = true;
    return;
  }
}
