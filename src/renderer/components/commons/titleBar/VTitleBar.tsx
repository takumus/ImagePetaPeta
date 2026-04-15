import { CSSProperties, PropsWithChildren } from "react";
import { css, cx } from "styled-system/css";

import { IPC } from "@/renderer/libs/ipc";
import { useSystemInfoStore } from "@/renderer/stores/systemInfoStore/useSystemInfoStore";
import { useWindowNameStore } from "@/renderer/stores/windowNameStore/useWindowNameStore";

const rootStyle = css({
  position: "relative",
  display: "flex",
  minHeight: "tabHeight",
  backgroundColor: "surfaceMuted",
});

const titleStyle = css({
  pointerEvents: "none",
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
});

const titleTextStyle = css({
  display: "inline-block",
  width: "100%",
  textAlign: "center",
  fontSize: "size0",
});

const contentStyle = css({
  display: "flex",
  flex: 1,
  flexDirection: "column",
  overflow: "hidden",
});

const topDragStyle = css({
  display: "block",
  flexGrow: 1,
  height: "topDraggableHeight",
});

const bottomStyle = css({
  display: "flex",
  flexDirection: "row",
});

const dragBaseStyle = css({
  display: "block",
});

const leftDragStyle = css({
  flexGrow: 0,
  width: "calc(var(--tab-height) + var(--top-draggable-height))",
});

const leftDragMacStyle = css({
  width: "calc(var(--tab-height) + var(--top-draggable-height) + 32px)",
});

const rightDragStyle = css({
  flexGrow: 1,
});

const buttonsStyle = css({
  display: "flex",
});

const buttonStyle = css({
  display: "flex",
  alignItems: "center",
  border: "none",
  margin: 0,
  background: "transparent",
  paddingX: "16px",
  color: "inherit",
  _hover: {
    backgroundColor: "surfaceEmphasis",
  },
});

const closeButtonStyle = css({
  _hover: {
    backgroundColor: "closeHover",
    color: "windowButton",
  },
});

const iconStyle = css({
  display: "inline-block",
  fontSize: "6px",
  fontFamily: "Segoe MDL2 Assets",
});

const dragRegionStyle = {
  WebkitAppRegion: "drag",
} as CSSProperties;

export default function VTitleBar({
  title,
  hideControls = false,
  children,
}: PropsWithChildren<{
  title?: string;
  hideControls?: boolean;
}>) {
  const { windowName } = useWindowNameStore();
  const { systemInfo } = useSystemInfoStore();
  const resizable = windowName.value !== "settings";
  const isMac = systemInfo.value.platform === "darwin";

  return (
    <div className={rootStyle}>
      <div className={titleStyle}>
        <div className={titleTextStyle}>{title}</div>
      </div>
      <div className={contentStyle}>
        <div className={topDragStyle} style={dragRegionStyle} />
        <div className={bottomStyle}>
          <div className={cx(dragBaseStyle, leftDragStyle, isMac && leftDragMacStyle)} style={dragRegionStyle} />
          {children}
          <div className={cx(dragBaseStyle, rightDragStyle)} style={dragRegionStyle} />
        </div>
      </div>
      {!isMac && !hideControls ? (
        <div className={buttonsStyle}>
          {resizable ? (
            <button className={buttonStyle} onClick={() => IPC.windows.minimize()} type="button">
              <span className={iconStyle}>&#xe921;</span>
            </button>
          ) : null}
          {resizable ? (
            <button className={buttonStyle} onClick={() => IPC.windows.maximize()} type="button">
              <span className={iconStyle}>&#xe922;</span>
            </button>
          ) : null}
          <button
            className={cx(buttonStyle, closeButtonStyle)}
            onClick={() => IPC.windows.close()}
            type="button">
            <span className={iconStyle}>&#xe8bb;</span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
