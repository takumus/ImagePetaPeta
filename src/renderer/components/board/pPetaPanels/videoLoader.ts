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
  let updateVideoHandler = -1;
  let texture: PIXI.Texture | undefined;
  let destroyed = false;
  async function load() {
    videoElement.src = getFileURL(petaFile, FileType.ORIGINAL);
    videoElement.loop = true;
    videoElement.autoplay = false;
    videoElement.volume = 0;
    await videoElement.play();
    if (destroyed) {
      throw new Error("video is destroyed");
    }
    if (!play) {
      videoElement.pause();
    }
    const texture = new PIXI.Texture(
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
    window.cancelAnimationFrame(updateVideoHandler);
    onUpdate();
    updateVideoHandler = window.requestAnimationFrame(updateVideo);
  }
  function destroy() {
    destroyed = true;
    videoElement.removeAttribute("src");
    videoElement.load();
    videoElement.remove();
    window.cancelAnimationFrame(updateVideoHandler);
    texture?.destroy(true);
  }
  return {
    load,
    destroy,
    async play() {
      if (!videoElement.paused) {
        return;
      }
      return videoElement.play();
    },
    pause() {
      if (videoElement.paused) {
        return;
      }
      return videoElement.pause();
    },
    videoElement,
  };
}
export type VideoLoaderResult = {
  load: () => Promise<PIXI.Texture>;
  destroy: () => void;
  play: () => Promise<void>;
  pause: () => void;
  videoElement: HTMLVideoElement;
};
