import * as PIXI from "pixi.js";

import { FileType } from "@/commons/datas/fileType";
import { RPetaFile } from "@/commons/datas/rPetaFile";

import { getFileURL } from "@/renderer/utils/fileURL";

export async function loadVideo(
  petaFile: RPetaFile,
  play: boolean,
  onUpdate: () => void,
): Promise<VideoLoaderResult> {
  const videoElement = document.createElement("video");
  let updateVideoHandler = -1;
  videoElement.src = getFileURL(petaFile, FileType.ORIGINAL);
  videoElement.loop = true;
  await videoElement.play();
  if (!play) {
    videoElement.pause();
  }
  function updateVideo() {
    window.cancelAnimationFrame(updateVideoHandler);
    onUpdate();
    updateVideoHandler = window.requestAnimationFrame(updateVideo);
  }
  updateVideo();
  function destroy() {
    videoElement.removeAttribute("src");
    videoElement.load();
    videoElement.remove();
    window.cancelAnimationFrame(updateVideoHandler);
  }
  return {
    texture: new PIXI.Texture(
      new PIXI.BaseTexture(
        new PIXI.VideoResource(videoElement, {
          autoPlay: false,
          autoLoad: true,
        }),
      ),
    ),
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
  texture: PIXI.Texture;
  destroy: () => void;
  play: () => Promise<void>;
  pause: () => void;
  videoElement: HTMLVideoElement;
};
