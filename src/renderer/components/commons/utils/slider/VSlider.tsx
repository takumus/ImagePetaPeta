import { useEffect, useRef, useState } from "react";
import { css } from "styled-system/css";

const rootStyle = css({
  display: "inline-block",
  cursor: "pointer",
  margin: "px1",
  padding: "px1",
  height: "px3",
});

const contentStyle = css({
  position: "relative",
  width: "100%",
  height: "100%",
});

const circleStyle = css({
  position: "relative",
  left: "0%",
  zIndex: 2,
  display: "block",
  height: "100%",
  aspectRatio: "1",
  transform: "translateX(-50%) scale(1.9)",
  transformOrigin: "center",
  borderRadius: "circle",
  backgroundColor: "checkboxTrueCircle",
  boxShadow: "0px 0.5px 2px rgba(0, 0, 0, 0.3)",
});

const barStyle = css({
  position: "absolute",
  inset: 0,
  overflow: "hidden",
  borderRadius: "window",
  backgroundColor: "checkboxFalseBackground",
});

const barInnerStyle = css({
  height: "100%",
  backgroundColor: "checkboxTrueBackground",
});

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function VSlider({
  float,
  max,
  min,
  onChange,
  onValueChange,
  value,
  width,
}: {
  float?: boolean;
  max: number;
  min: number;
  onChange?: (value: number) => void;
  onValueChange: (value: number) => void;
  value: number;
  width?: string;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const positionX = ((value - min) / (max - min)) * 100;

  function emitValue(clientX: number, change = false) {
    const rect = barRef.current?.getBoundingClientRect();
    if (rect === undefined) {
      return;
    }
    const raw =
      clamp((clientX - rect.x) / rect.width, 0, 1) * (max - min) + min;
    const nextValue = float ? raw : Math.floor(raw);
    if (Number.isNaN(nextValue)) {
      return;
    }
    onValueChange(nextValue);
    if (change) {
      onChange?.(nextValue);
    }
  }

  useEffect(() => {
    function pointerMove(event: PointerEvent) {
      if (!dragging) {
        return;
      }
      emitValue(event.clientX);
    }
    function pointerUp(event: PointerEvent) {
      if (!dragging) {
        return;
      }
      emitValue(event.clientX, true);
      setDragging(false);
    }
    window.addEventListener("pointermove", pointerMove);
    window.addEventListener("pointerup", pointerUp);
    return () => {
      window.removeEventListener("pointermove", pointerMove);
      window.removeEventListener("pointerup", pointerUp);
    };
  }, [dragging, float, max, min, onChange, onValueChange]);

  return (
    <div
      className={rootStyle}
      onClick={(event) => emitValue(event.clientX, true)}
      onPointerDown={(event) => {
        if (event.button !== 0) {
          return;
        }
        setDragging(true);
        emitValue(event.clientX);
      }}
      style={{ width: width ?? "128px" }}>
      <div className={contentStyle} ref={barRef}>
        <div className={circleStyle} style={{ left: `${positionX}%` }} />
        <div className={barStyle}>
          <div className={barInnerStyle} style={{ width: `${positionX}%` }} />
        </div>
      </div>
    </div>
  );
}
