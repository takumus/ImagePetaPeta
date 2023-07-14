import { RPetaFile } from "@/commons/datas/rPetaFile";

import { videoLoader, VideoLoaderResult } from "@/renderer/utils/pFileObject/@loaders/videoLoader";
import { PPlayableFileObjectContent } from "@/renderer/utils/pFileObject/pPlayableFileObjectContainer";

export class PVideoFileObjectContent extends PPlayableFileObjectContent<{
  volume: () => void;
}> {
  private video?: VideoLoaderResult;
  private _canceledLoading = false;
  private setCurrentTimeHandler = -1;
  private orderedCurrentTime = -1;
  async load(petaFile: RPetaFile) {
    this.video = videoLoader(petaFile, false, () => {
      this.event.emit("time");
      this.event.emit("updateRenderer");
    });
    const texture = await this.video.load();
    if (this._canceledLoading) {
      texture.destroy();
      return false;
    }
    this.texture = texture;

    return true;
  }
  async setCurrentTimeFromOrdered() {
    window.clearTimeout(this.setCurrentTimeHandler);
    if (this._canceledLoading) {
      return;
    }
    if (
      this.video !== undefined &&
      !this.video.videoElement.seeking &&
      this.orderedCurrentTime >= 0
    ) {
      this.video.videoElement.currentTime = this.orderedCurrentTime;
      this.orderedCurrentTime = -1;
      this.setCurrentTimeHandler = window.setTimeout(
        this.setCurrentTimeFromOrdered.bind(this),
        1000 / 60,
      );
    }
  }
  destroy() {
    this.video?.destroy();
    this._canceledLoading = true;
    window.clearTimeout(this.setCurrentTimeHandler);
    super.destroy();
  }
  getPaused() {
    return this.video?.videoElement.paused ?? false;
  }
  async setPaused(paused: boolean) {
    if (this.video?.videoElement.paused === true && !paused) {
      await this.video.videoElement.play();
      this.event.emit("paused", false);
      return;
    } else if (this.video?.videoElement.paused === false && paused) {
      this.video.videoElement.pause();
      this.event.emit("paused", true);
      return;
    }
  }
  getDuration() {
    return this.video?.videoElement.duration ?? 0;
  }
  getCurrentTime() {
    return this.video?.videoElement.currentTime ?? 0;
  }
  getSeekable() {
    if (this.video === undefined) {
      return false;
    }
    return !this.video.videoElement.seeking;
  }
  setCurrentTime(currentTime: number) {
    if (this.video === undefined) {
      return;
    }
    this.orderedCurrentTime = currentTime;
    this.setCurrentTimeFromOrdered();
  }
  getVolume() {
    return this.video?.videoElement.volume ?? 0;
  }
  setVolume(volume: number) {
    if (this.video !== undefined) {
      this.video.videoElement.volume = volume;
      this.event.emit("volume");
    }
  }
  getSpeed() {
    return this.video?.videoElement.playbackRate ?? 1;
  }
  setSpeed(speed: number) {
    if (this.video !== undefined) {
      this.video.videoElement.playbackRate = speed;
      this.event.emit("speed");
    }
  }
}
