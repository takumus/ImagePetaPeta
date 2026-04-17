import { PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import { css } from "styled-system/css";

const rootStyle = css({
  position: "relative",
  display: "block",
  overflow: "hidden",
  width: "100%",
  height: "32px",
  paddingY: "px2",
  paddingX: "calc(var(--px-2) + calc(var(--px-1) / 2))",
  borderRadius: "window",
  backgroundColor: "surface",
});

const wrapperStyle = css({
  position: "relative",
  width: "100%",
  height: "100%",
});

const layerStyle = css({
  position: "absolute",
  inset: 0,
});

const loopCursorStyle = css({
  position: "relative",
  display: "block",
  height: "100%",
  borderRadius: "window",
  backgroundColor: "text",
  opacity: 0.1,
});

const dragHandleStyle = css({
  position: "absolute",
  top: 0,
  left: 0,
  display: "block",
  width: "px1",
  height: "100%",
  borderRadius: "window",
  backgroundColor: "accent",
});

const seekCursorStyle = css({
  position: "absolute",
  display: "block",
  width: "px1",
  height: "100%",
  transform: "translateX(-50%)",
  borderRadius: "window",
  backgroundColor: "text",
});

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function VSeekBar({
  duration,
  loopEnd,
  loopStart,
  onLoopEndChange,
  onLoopStartChange,
  onSeekStart,
  onSeekStop,
  onTimeChange,
  time,
}: {
  duration: number;
  loopEnd: number;
  loopStart: number;
  onLoopEndChange: (time: number) => void;
  onLoopStartChange: (time: number) => void;
  onSeekStart: () => void;
  onSeekStop: () => void;
  onTimeChange: (time: number) => void;
  time: number;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [draggingTime, setDraggingTime] = useState(0);
  const [draggingType, setDraggingType] = useState<"loopEnd" | "loopStart" | "none" | "seek">(
    "none",
  );

  function updateFromClientX(clientX: number, type: "loopEnd" | "loopStart" | "seek") {
    const rect = rootRef.current?.getBoundingClientRect();
    if (rect === undefined || duration <= 0) {
      return;
    }
    let nextTime = clamp(((clientX - rect.x) / rect.width) * duration, 0, duration);
    if (type === "seek") {
      setDraggingTime(nextTime);
      onTimeChange(nextTime);
    } else if (type === "loopStart") {
      if (nextTime > loopEnd) {
        nextTime = loopEnd;
      }
      onLoopStartChange(nextTime);
    } else if (type === "loopEnd") {
      if (nextTime < loopStart) {
        nextTime = loopStart;
      }
      onLoopEndChange(nextTime);
    }
  }

  useEffect(() => {
    function pointerMove(event: PointerEvent) {
      if (draggingType === "none") {
        return;
      }
      updateFromClientX(event.clientX, draggingType);
    }

    function pointerUp(event: PointerEvent) {
      if (draggingType === "none") {
        return;
      }
      pointerMove(event);
      if (draggingType === "seek") {
        onSeekStop();
      }
      setDraggingType("none");
    }

    window.addEventListener("pointermove", pointerMove);
    window.addEventListener("pointerup", pointerUp);
    return () => {
      window.removeEventListener("pointermove", pointerMove);
      window.removeEventListener("pointerup", pointerUp);
    };
  }, [
    draggingType,
    duration,
    loopEnd,
    loopStart,
    onLoopEndChange,
    onLoopStartChange,
    onSeekStop,
    onTimeChange,
  ]);

  const cursorPosition = useMemo(() => {
    if (duration <= 0) {
      return 0;
    }
    return clamp(((draggingType === "seek" ? draggingTime : time) / duration) * 100, 0, 100);
  }, [draggingTime, draggingType, duration, time]);

  const loopStartPosition = duration <= 0 ? 0 : ((loopStart === 0 && loopEnd === 0 ? 0 : loopStart) / duration) * 100;
  const loopWidth = duration <= 0 ? 0 : ((loopStart === 0 && loopEnd === 0 ? 1 : loopEnd - loopStart) / duration) * 100;
  const loopEndPosition = duration <= 0 ? 0 : (((loopStart === 0 && loopEnd === 0 ? duration : loopEnd)) / duration) * 100;

  function beginDrag(event: ReactPointerEvent<HTMLDivElement>, type: "loopEnd" | "loopStart" | "seek") {
    setDraggingType(type);
    if (type === "seek") {
      onSeekStart();
    }
    if (type === "loopStart" && loopStart === 0 && loopEnd === 0) {
      onLoopEndChange(duration);
    }
    updateFromClientX(event.clientX, type);
  }

  return (
    <div className={rootStyle}>
      <div className={wrapperStyle} ref={rootRef}>
        <div className={layerStyle}>
          <div className={loopCursorStyle} style={{ left: `${loopStartPosition}%`, width: `${loopWidth}%` }} />
          <div
            className={dragHandleStyle}
            onPointerDown={(event) => beginDrag(event, "loopStart")}
            style={{ left: `${loopStartPosition}%`, transform: "translateX(-100%)", cursor: "e-resize" }}
          />
          <div
            className={dragHandleStyle}
            onPointerDown={(event) => beginDrag(event, "loopEnd")}
            style={{ left: `${loopEndPosition}%`, cursor: "w-resize" }}
          />
        </div>
        <div className={layerStyle}>
          <div
            className={seekCursorStyle}
            onPointerDown={(event) => beginDrag(event, "seek")}
            style={{ left: `${cursorPosition}%` }}
          />
        </div>
      </div>
    </div>
  );
}
