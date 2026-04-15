import { useEffect, useRef, useState } from "react";
import { css, cx } from "styled-system/css";

import { MediaSourceInfo } from "@/commons/datas/mediaSourceInfo";

import VDragView from "@/renderer/components/commons/utils/dragView/VDragView";
import { IPC } from "@/renderer/libs/ipc";

const rootStyle = css({
  position: "relative",
  zIndex: 1,
  display: "flex",
  width: "100%",
  height: "100%",
  flexDirection: "column",
  overflow: "hidden",
});

const videoAreaStyle = css({
  flex: 1,
  overflow: "hidden",
});

const videoStyle = css({
  width: "100%",
  height: "100%",
});

const thumbnailsStyle = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  height: "128px",
  backgroundColor: "surface",
  padding: "px2",
});

const thumbnailStyle = css({
  display: "block",
  height: "100%",
  marginRight: "px2",
  overflow: "hidden",
  borderRadius: "window",
  cursor: "pointer",
  filter: "brightness(0.5)",
});

const selectedThumbnailStyle = css({
  filter: "brightness(1)",
});

export default function VCapture() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [sources, setSources] = useState<MediaSourceInfo[]>([]);
  const [currentSource, setCurrentSource] = useState<MediaSourceInfo | undefined>(undefined);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    let mounted = true;
    void IPC.common.getMediaSources().then((value) => {
      if (mounted) {
        setSources(value);
        setCurrentSource(value[0]);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      stopStream(mediaStream);
    };
  }, [mediaStream]);

  useEffect(() => {
    if (!currentSource) {
      return;
    }

    let active = true;
    const previousStream = mediaStream;
    stopStream(previousStream);

    void navigator.mediaDevices
      .getUserMedia({
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: currentSource.id,
            maxFrameRate: 60,
            minWidth: currentSource.size?.width,
            minHeight: currentSource.size?.height,
          },
        },
      } as never)
      .then((stream) => {
        if (!active) {
          stopStream(stream);
          return;
        }
        setMediaStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      })
      .catch(() => {
        if (active) {
          setMediaStream(null);
        }
      });

    return () => {
      active = false;
    };
  }, [currentSource]);

  return (
    <div className={rootStyle}>
      <div className={videoAreaStyle}>
        {currentSource?.size ? (
          <VDragView
            contentHeight={currentSource.size.height}
            contentWidth={currentSource.size.width}>
            <video className={videoStyle} ref={videoRef} />
          </VDragView>
        ) : null}
      </div>
      <div className={thumbnailsStyle}>
        {sources.map((source) => (
          <img
            className={cx(thumbnailStyle, source === currentSource && selectedThumbnailStyle)}
            draggable={false}
            key={source.id}
            onClick={() => setCurrentSource(source)}
            src={source.thumbnailDataURL}
          />
        ))}
      </div>
    </div>
  );
}

function stopStream(stream: MediaStream | null) {
  if (!stream) {
    return;
  }
  try {
    stream.getVideoTracks().forEach((track) => {
      track.stop();
    });
  } catch {
    //
  }
}
