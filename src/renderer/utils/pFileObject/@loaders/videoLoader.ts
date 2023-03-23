import * as PIXI from "pixi.js";

import { FileType } from "@/commons/datas/fileType";
import { RPetaFile } from "@/commons/datas/rPetaFile";

import { getFileURL } from "@/renderer/utils/fileURL";

export function videoLoader(
  petaFile: RPetaFile,
  play: boolean,
  onUpdate: () => void,
): VideoLoaderResult {
  const videoElement = document.createElement("video");
  document.body.appendChild(videoElement);
  videoElement.style.zIndex = "100";
  videoElement.style.bottom = "0px";
  videoElement.style.width = "1px";
  videoElement.style.height = "1px";
  videoElement.style.position = "fixed";

  let texture: PIXI.Texture | undefined;
  let destroyed = false;
  async function load() {
    videoElement.src = getFileURL(petaFile, FileType.ORIGINAL);
    videoElement.loop = true;
    videoElement.autoplay = false;
    videoElement.volume = 0;
    videoElement.addEventListener("seeked", () => {
      forceUpdate();
    });
    await videoElement.play();
    if (destroyed) {
      throw new Error("video is destroyed");
    }
    if (!play) {
      videoElement.pause();
    }
    texture = new PIXI.Texture(
      new PIXI.BaseTexture(
        new PIXI.VideoResource(videoElement, {
          autoPlay: false,
          autoLoad: true,
        }),
      ),
    );
    updateVideo();
    return texture;
  }
  function updateVideo() {
    if (!videoElement.paused) {
      onUpdate();
    }
    videoElement.requestVideoFrameCallback(updateVideo);
  }
  function forceUpdate() {
    texture?.update();
    onUpdate();
  }
  function destroy() {
    destroyed = true;
    videoElement.removeAttribute("src");
    videoElement.load();
    videoElement.remove();
    texture?.destroy(true);
  }
  return {
    load,
    destroy,
    forceUpdate,
    videoElement,
  };
}
export type VideoLoaderResult = {
  load: () => Promise<PIXI.Texture>;
  destroy: () => void;
  forceUpdate: () => void;
  videoElement: HTMLVideoElement;
};
