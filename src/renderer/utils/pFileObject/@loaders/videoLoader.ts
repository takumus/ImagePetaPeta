import * as PIXI from "pixi.js";

import { FileType } from "@/commons/datas/fileType";
import { RPetaFile } from "@/commons/datas/rPetaFile";
import { VIDEO_LOADER_MAX_FPS } from "@/commons/defines";
import { TypedEventEmitter } from "@/commons/utils/typedEventEmitter";

import { getFileURL } from "@/renderer/utils/fileURL";

const intervals = (() => {
  const events = new TypedEventEmitter<{
    update: () => void;
  }>();
  window.setInterval(() => {
    events.emit("update");
  }, 1000 / VIDEO_LOADER_MAX_FPS);
  return events;
})();
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
    intervals.on("update", updateVideo);
    return texture;
  }
  function updateVideo() {
    if (!videoElement.paused) {
      onUpdate();
    }
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
    intervals.off("update", updateVideo);
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
