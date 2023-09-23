import { RPetaFile } from "@/commons/datas/rPetaFile";

import { VideoLoader } from "@/renderer/utils/pFileObject/@loaders/videoLoader";
import { PPlayableFileObjectContent } from "@/renderer/utils/pFileObject/pPlayableFileObjectContainer";

export class PVideoFileObjectContent extends PPlayableFileObjectContent<{
  volume: () => void;
}> {
  private video?: VideoLoader;
  private _canceledLoading = false;
  private setCurrentTimeHandler = -1;
  private orderedCurrentTime = -1;
  async load(petaFile: RPetaFile) {
    this.video = new VideoLoader(petaFile, false);
    this.video.on("update", () => {
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
    if (this.video !== undefined && !this.video.element.seeking && this.orderedCurrentTime >= 0) {
      this.video.element.currentTime = this.orderedCurrentTime;
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
    return this.video?.element.paused ?? false;
  }
  async setPaused(paused: boolean) {
    if (this.video?.element.paused === true && !paused) {
      await this.video.element.play();
      this.event.emit("paused", false);
      return;
    } else if (this.video?.element.paused === false && paused) {
      this.video.element.pause();
      this.event.emit("paused", true);
      return;
    }
  }
  getDuration() {
    return this.video?.element.duration ?? 0;
  }
  getCurrentTime() {
    return this.video?.element.currentTime ?? 0;
  }
  getSeekable() {
    if (this.video === undefined) {
      return false;
    }
    return !this.video.element.seeking;
  }
  setCurrentTime(currentTime: number) {
    if (this.video === undefined) {
      return;
    }
    this.orderedCurrentTime = currentTime;
    this.setCurrentTimeFromOrdered();
  }
  getVolume() {
    return this.video?.element.volume ?? 0;
  }
  setVolume(volume: number) {
    if (this.video !== undefined) {
      this.video.element.volume = volume;
      this.event.emit("volume");
    }
  }
  getSpeed() {
    return this.video?.element.playbackRate ?? 1;
  }
  setSpeed(speed: number) {
    if (this.video !== undefined) {
      this.video.element.playbackRate = speed;
      this.event.emit("speed");
    }
  }
}
