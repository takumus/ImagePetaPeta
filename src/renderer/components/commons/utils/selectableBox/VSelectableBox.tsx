import { PropsWithChildren, ReactNode, useMemo, useState } from "react";
import { css, cx } from "styled-system/css";

import TransparentTexture from "@/_public/images/textures/transparent.png";

const rootStyle = css({
  position: "relative",
  width: "100%",
  height: "100%",
  overflow: "hidden",
  borderRadius: "window",
  boxShadow: "0 1px 5px rgba(0, 0, 0, 0.5)",
});

const imagesStyle = css({
  position: "relative",
  width: "100%",
  height: "100%",
  overflow: "hidden",
  borderRadius: "window",
  cursor: "pointer",
});

const selectedImagesStyle = css({
  padding: "2px",
});

const backgroundStyle = css({
  position: "absolute",
  inset: "1px",
  borderRadius: "window",
  backgroundRepeat: "repeat",
  backgroundPosition: "center",
  backgroundSize: "16px 16px",
});

const contentStyle = css({
  position: "absolute",
  inset: 0,
  zIndex: 1,
  width: "100%",
  height: "100%",
  transition: "transform 120ms ease-out",
});

const innerStyle = css({
  position: "absolute",
  inset: 0,
  zIndex: 1,
  width: "100%",
  height: "100%",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "transparent",
  pointerEvents: "none",
});

const selectedInnerStyle = css({
  borderWidth: "2px",
});

const selectedStyle = css({
  position: "absolute",
  inset: 0,
  zIndex: 2,
  borderRadius: "window",
  boxShadow: "inset 0 0 0 1px var(--colors-text), inset 0 0 0 3px var(--colors-accent)",
  pointerEvents: "none",
});

export default function VSelectableBox({
  children,
  inner,
  selected,
  zoom = false,
}: PropsWithChildren<{
  inner?: ReactNode;
  selected: boolean;
  zoom?: boolean;
}>) {
  const [position, setPosition] = useState({ left: 0, top: 0, scale: 1 });

  const transform = useMemo(() => {
    return `translate(${position.left * 100}%, ${position.top * 100}%) scale(${position.scale})`;
  }, [position]);

  function updatePosition(left: number, top: number, scale: number) {
    setPosition((current) => {
      if (current.left === left && current.top === top && current.scale === scale) {
        return current;
      }
      return { left, top, scale };
    });
  }

  return (
    <div className={rootStyle}>
      <div
        className={cx(imagesStyle, selected && selectedImagesStyle)}
        onPointerLeave={() => updatePosition(0, 0, 1)}
        onPointerMove={(event) => {
          if (!zoom) {
            return;
          }
          const rect = event.currentTarget.getBoundingClientRect();
          if (rect.width <= 0 || rect.height <= 0) {
            return;
          }
          const ratioX = event.clientX / rect.width - rect.left / rect.width;
          const ratioY = event.clientY / rect.height - rect.top / rect.height;
          const zoomRatio = 1.1;
          updatePosition(-(ratioX - 0.5) * (zoomRatio - 1), -(ratioY - 0.5) * (zoomRatio - 1), zoomRatio);
        }}>
        <div className={backgroundStyle} style={{ backgroundImage: `url(${TransparentTexture})` }} />
        <div className={contentStyle} style={{ transform }}>
          {children}
        </div>
      </div>
      <div className={cx(innerStyle, selected && selectedInnerStyle)}>{inner}</div>
      {selected ? <div className={selectedStyle} /> : null}
    </div>
  );
}
