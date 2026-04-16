import { useEffect, useRef, useState } from "react";
import { css } from "styled-system/css";

import VPlaybackController from "@/renderer/components/commons/playbackController/VPlaybackController";

import { PetaFile } from "@/commons/datas/petaFile";

import { IPC } from "@/renderer/libs/ipc";
import { getFileURL } from "@/renderer/utils/fileURL";

import NsfwTexture from "@/_public/images/textures/nsfw.png";
import TransparentTexture from "@/_public/images/textures/transparent.png";

const rootStyle = css({
  display: "flex",
  flexDirection: "column",
  width: "100%",
  height: "100%",
  backgroundPosition: "center",
  backgroundRepeat: "repeat",
  backgroundSize: "16px 16px",
});

const previewWrapperStyle = css({
  position: "relative",
  flex: 1,
  overflow: "hidden",
});

const centeredStyle = css({
  display: "grid",
  width: "100%",
  height: "100%",
  placeItems: "center",
});

const imageStyle = css({
  maxWidth: "100%",
  maxHeight: "100%",
  objectFit: "contain",
});

const videoStyle = css({
  width: "100%",
  height: "100%",
  objectFit: "contain",
});

const controllerWrapperStyle = css({
  borderTopWidth: "window",
  borderTopStyle: "solid",
  borderTopColor: "border",
  backgroundColor: "surfaceMuted",
});

const nsfwStyle = css({
  width: "100%",
  height: "100%",
  backgroundPosition: "center",
  backgroundRepeat: "repeat",
  backgroundSize: "32px 32px",
});

export default function VDetails({
  petaFile,
}: {
  petaFile?: PetaFile;
}) {
  const [showNSFW, setShowNSFW] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(500);
  const [speed, setSpeed] = useState(1000);
  const [loopStart, setLoopStart] = useState(0);
  const [loopEnd, setLoopEnd] = useState(0);

  useEffect(() => {
    let mounted = true;
    void IPC.nsfw.get().then((value) => {
      if (mounted) {
        setShowNSFW(value);
      }
    });
    const subscription = IPC.common.on("showNSFW", (_event, value) => {
      setShowNSFW(value);
    });
    return () => {
      mounted = false;
      subscription.off();
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (video === null) {
      return;
    }

    function sync() {
      setDuration((video.duration || 0) * 1000);
      setCurrentTime(video.currentTime * 1000);
      setPlaying(!video.paused);
      setVolume(video.volume * 1000);
      setSpeed(video.playbackRate * 1000);
    }

    function handleTimeUpdate() {
      if (loopStart !== 0 || loopEnd !== 0) {
        if (video.currentTime < loopStart / 1000 - 0.1) {
          video.currentTime = loopStart / 1000;
        } else if (video.currentTime > loopEnd / 1000) {
          video.currentTime = loopStart / 1000;
        }
      }
      sync();
    }

    video.addEventListener("loadedmetadata", sync);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("play", sync);
    video.addEventListener("pause", sync);
    video.addEventListener("volumechange", sync);
    video.addEventListener("ratechange", sync);
    sync();

    return () => {
      video.removeEventListener("loadedmetadata", sync);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("play", sync);
      video.removeEventListener("pause", sync);
      video.removeEventListener("volumechange", sync);
      video.removeEventListener("ratechange", sync);
    };
  }, [loopEnd, loopStart, petaFile?.id]);

  useEffect(() => {
    const video = videoRef.current;
    if (video === null || petaFile?.metadata.type !== "video") {
      return;
    }
    function keydown(event: KeyboardEvent) {
      if (event.code !== "ArrowRight" && event.code !== "ArrowLeft") {
        return;
      }
      const delta = event.code === "ArrowRight" ? 5 : -5;
      const nextTime = Math.min(Math.max(video.currentTime + delta, 0), video.duration || 0);
      video.currentTime = nextTime;
      setCurrentTime(nextTime * 1000);
    }
    window.addEventListener("keydown", keydown);
    return () => {
      window.removeEventListener("keydown", keydown);
    };
  }, [petaFile?.id, petaFile?.metadata.type]);

  if (petaFile === undefined) {
    return <div className={rootStyle} style={{ backgroundImage: `url(${TransparentTexture})` }} />;
  }

  const masked = petaFile.nsfw && !showNSFW;
  const originalURL = getFileURL(petaFile, "original");
  const hasVideo = petaFile.metadata.type === "video";
  const hasAudio = hasVideo;

  return (
    <div className={rootStyle} style={{ backgroundImage: `url(${TransparentTexture})` }}>
      <div className={previewWrapperStyle}>
        {masked ? (
          <div className={nsfwStyle} style={{ backgroundImage: `url(${NsfwTexture})` }} />
        ) : hasVideo ? (
          <div className={centeredStyle}>
            <video
              autoPlay
              className={videoStyle}
              loop={false}
              muted={false}
              playsInline
              ref={videoRef}
              src={originalURL}
            />
          </div>
        ) : (
          <div className={centeredStyle}>
            <img alt={petaFile.name} className={imageStyle} draggable={false} src={originalURL} />
          </div>
        )}
      </div>
      {!masked && hasVideo ? (
        <div className={controllerWrapperStyle}>
          <VPlaybackController
            currentTime={currentTime}
            duration={duration}
            hasAudio={hasAudio}
            loopEnd={loopEnd}
            loopStart={loopStart}
            onLoopEndChange={(value) => setLoopEnd(value)}
            onLoopStartChange={(value) => setLoopStart(value)}
            onPausedChange={(paused) => {
              const video = videoRef.current;
              if (video === null) {
                return;
              }
              if (paused) {
                video.pause();
              } else {
                void video.play();
              }
              setPlaying(!paused);
            }}
            onSeekStart={() => {
              videoRef.current?.pause();
            }}
            onSeekStop={() => {
              //
            }}
            onSpeedChange={(value) => {
              const video = videoRef.current;
              if (video === null) {
                return;
              }
              video.playbackRate = value / 1000;
              setSpeed(value);
            }}
            onTimeChange={(value) => {
              const video = videoRef.current;
              if (video === null) {
                return;
              }
              video.currentTime = value / 1000;
              setCurrentTime(value);
            }}
            onVolumeChange={(value) => {
              const video = videoRef.current;
              if (video === null) {
                return;
              }
              video.volume = value / 1000;
              setVolume(value);
            }}
            playing={playing}
            speed={speed}
            volume={volume}
          />
        </div>
      ) : null}
    </div>
  );
}
