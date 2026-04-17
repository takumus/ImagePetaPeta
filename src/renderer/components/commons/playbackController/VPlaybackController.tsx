import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";

import { secondsToHMS } from "@/commons/utils/secondsToHMS";

import VSeekBar from "@/renderer/components/commons/playbackController/VSeekBar";
import VSlider from "@/renderer/components/commons/utils/slider/VSlider";
import { appButtonStyle } from "@/renderer/components/shared/controlStyles";

const rootStyle = css({
  display: "flex",
  flexDirection: "column",
  width: "100%",
  height: "100%",
});

const generalStyle = css({
  display: "flex",
  alignItems: "center",
});

const seekbarStyle = css({
  display: "block",
  flex: 1,
  padding: "px1",
});

const currentTimeStyle = css({
  display: "block",
  paddingX: "px1",
});

const advancedStyle = css({
  display: "flex",
  flexDirection: "column",
  padding: "px1",
});

const propertyStyle = css({
  display: "flex",
  alignItems: "center",
});

const labelStyle = css({
  minWidth: "64px",
});

const speeds = [
  { value: 500, label: "0.5" },
  { value: 1000, label: "1.0" },
  { value: 2000, label: "2.0" },
];

export default function VPlaybackController({
  currentTime,
  duration,
  hasAudio,
  loopEnd,
  loopStart,
  onLoopEndChange,
  onLoopStartChange,
  onPausedChange,
  onSeekStart,
  onSeekStop,
  onSpeedChange,
  onTimeChange,
  onVolumeChange,
  playing,
  speed,
  volume,
}: {
  currentTime: number;
  duration: number;
  hasAudio: boolean;
  loopEnd: number;
  loopStart: number;
  onLoopEndChange: (value: number) => void;
  onLoopStartChange: (value: number) => void;
  onPausedChange: (paused: boolean) => void;
  onSeekStart: () => void;
  onSeekStop: () => void;
  onSpeedChange: (value: number) => void;
  onTimeChange: (value: number) => void;
  onVolumeChange: (value: number) => void;
  playing: boolean;
  speed: number;
  volume: number;
}) {
  const { t } = useTranslation();
  const [isPlayingBeforeSeek, setIsPlayingBeforeSeek] = useState(false);

  const currentTimeHMS = useMemo(() => secondsToHMS(currentTime / 1000), [currentTime]);

  return (
    <div className={rootStyle}>
      <div className={advancedStyle}>
        {hasAudio ? (
          <div className={propertyStyle}>
            <div className={labelStyle}>{t("playbackController.volume")}</div>
            <VSlider max={1000} min={0} onValueChange={onVolumeChange} value={volume} />
          </div>
        ) : null}
        <div className={propertyStyle}>
          <div className={labelStyle}>{t("playbackController.speed")}</div>
          <VSlider max={4000} min={100} onValueChange={onSpeedChange} value={speed} />
          {speeds.map((item) => (
            <button
              className={appButtonStyle}
              key={item.label}
              onClick={() => onSpeedChange(item.value)}
              type="button">
              {item.label}x
            </button>
          ))}
        </div>
      </div>
      <div className={generalStyle}>
        <button
          className={appButtonStyle}
          onClick={() => onPausedChange(playing)}
          type="button">
          {playing ? t("playbackController.pause") : t("playbackController.play")}
        </button>
        <div className={seekbarStyle}>
          <VSeekBar
            duration={duration}
            loopEnd={loopEnd}
            loopStart={loopStart}
            onLoopEndChange={onLoopEndChange}
            onLoopStartChange={onLoopStartChange}
            onSeekStart={() => {
              setIsPlayingBeforeSeek(playing);
              onSeekStart();
            }}
            onSeekStop={() => {
              if (isPlayingBeforeSeek) {
                onPausedChange(false);
              }
              onSeekStop();
            }}
            onTimeChange={onTimeChange}
            time={currentTime}
          />
        </div>
        <div className={currentTimeStyle}>{currentTimeHMS}</div>
      </div>
    </div>
  );
}
