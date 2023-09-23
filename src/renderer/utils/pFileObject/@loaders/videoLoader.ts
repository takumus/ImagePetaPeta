import * as PIXI from "pixi.js";

import { FileType } from "@/commons/datas/fileType";
import { RPetaFile } from "@/commons/datas/rPetaFile";
import { TypedEventEmitter } from "@/commons/utils/typedEventEmitter";

import { getFileURL } from "@/renderer/utils/fileURL";

export class VideoLoader extends TypedEventEmitter<{
  update: () => void;
}> {
  public element: HTMLVideoElement;
  private texture?: PIXI.Texture;
  private destroyed = false;
  constructor(
    private petaFile: RPetaFile,
    private play: boolean,
  ) {
    super();
    this.element = document.createElement("video");
    document.body.appendChild(this.element);
    this.element.style.zIndex = "100";
    this.element.style.bottom = "0px";
    this.element.style.width = "1px";
    this.element.style.height = "1px";
    this.element.style.position = "fixed";
  }
  async load() {
    this.element.src = getFileURL(this.petaFile, FileType.ORIGINAL);
    this.element.loop = true;
    this.element.autoplay = false;
    this.element.volume = 0;
    this.element.addEventListener("seeked", () => {
      this.forceUpdate();
    });
    await this.element.play();
    if (this.destroyed) {
      throw new Error("video is destroyed");
    }
    if (!this.play) {
      this.element.pause();
    }
    this.texture = new PIXI.Texture(
      new PIXI.BaseTexture(
        new PIXI.VideoResource(this.element, {
          autoPlay: false,
          autoLoad: true,
        }),
      ),
    );
    this.updateVideo();
    return this.texture;
  }
  // requestVideoFrameCallback対策
  updateVideo = () => {
    if (!this.element.paused) {
      this.emit("update");
    }
    this.texture?.update();
    this.element.requestVideoFrameCallback(this.updateVideo);
  };
  forceUpdate() {
    this.texture?.update();
    this.emit("update");
  }
  destroy() {
    this.destroyed = true;
    this.element.removeAttribute("src");
    this.element.load();
    this.element.remove();
    this.texture?.destroy(true);
  }
}
// export type VideoLoaderResult = {
//   load: () => Promise<PIXI.Texture>;
//   destroy: () => void;
//   forceUpdate: () => void;
//   videoElement: HTMLVideoElement;
// };
