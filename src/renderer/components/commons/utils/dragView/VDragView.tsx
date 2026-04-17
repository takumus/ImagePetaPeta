import { PropsWithChildren, useCallback, useEffect, useRef, useState } from "react";
import { css } from "styled-system/css";

import { BOARD_ZOOM_MAX, BOARD_ZOOM_MIN } from "@/commons/defines";
import { Settings } from "@/commons/datas/settings";
import { resizeImage } from "@/commons/utils/resizeImage";
import { Vec2, vec2FromPointerEvent } from "@/commons/utils/vec2";

import TransparentTexture from "@/_public/images/textures/transparent.png";
import { IPC } from "@/renderer/libs/ipc";
import { useSystemInfoStore } from "@/renderer/stores/systemInfoStore/useSystemInfoStore";

const rootStyle = css({
  position: "relative",
  display: "block",
  width: "100%",
  height: "100%",
  overflow: "hidden",
});

const contentStyle = css({
  position: "absolute",
  display: "block",
  overflow: "hidden",
  transformOrigin: "top left",
});

type ViewState = {
  scale: number;
  positionX: number;
  positionY: number;
  stageWidth: number;
  stageHeight: number;
};

export default function VDragView({
  children,
  contentWidth,
  contentHeight,
}: PropsWithChildren<{
  contentWidth: number;
  contentHeight: number;
}>) {
  const { systemInfo } = useSystemInfoStore();
  const rootRef = useRef<HTMLDivElement>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [viewState, setViewState] = useState<ViewState>({
    scale: 1,
    positionX: 0,
    positionY: 0,
    stageWidth: 0,
    stageHeight: 0,
  });
  const stageRectRef = useRef(new Vec2());
  const mouseOffsetRef = useRef(new Vec2());
  const pointerPositionRef = useRef(new Vec2());
  const positionRef = useRef(new Vec2());
  const scaleRef = useRef(1);
  const draggingRef = useRef(false);
  const fitToOutsideRef = useRef(true);
  const settingsRef = useRef<Settings | null>(null);

  const commit = useCallback(() => {
    setViewState({
      scale: scaleRef.current,
      positionX: positionRef.current.x,
      positionY: positionRef.current.y,
      stageWidth: stageRectRef.current.x,
      stageHeight: stageRectRef.current.y,
    });
  }, []);

  const getDefaultScale = useCallback(() => {
    const maxWidth = stageRectRef.current.x;
    const maxHeight = stageRectRef.current.y;
    if (contentWidth === 0 || contentHeight === 0 || maxWidth === 0 || maxHeight === 0) {
      return 1;
    }
    if (contentHeight / contentWidth < maxHeight / maxWidth) {
      return resizeImage(contentWidth, contentHeight, maxWidth, "width").width / contentWidth;
    }
    return resizeImage(contentWidth, contentHeight, maxHeight, "height").width / contentWidth;
  }, [contentHeight, contentWidth]);

  const constraint = useCallback(() => {
    if (positionRef.current.x + stageRectRef.current.x / 2 > 0) {
      positionRef.current.x = -stageRectRef.current.x / 2;
    }
    if (
      contentWidth * scaleRef.current +
        positionRef.current.x +
        stageRectRef.current.x / 2 -
        stageRectRef.current.x <
      0
    ) {
      positionRef.current.x =
        -contentWidth * scaleRef.current - (stageRectRef.current.x / 2 - stageRectRef.current.x);
    }
    if (positionRef.current.y + stageRectRef.current.y / 2 > 0) {
      positionRef.current.y = -stageRectRef.current.y / 2;
    }
    if (
      contentHeight * scaleRef.current +
        positionRef.current.y +
        stageRectRef.current.y / 2 -
        stageRectRef.current.y <
      0
    ) {
      positionRef.current.y =
        -contentHeight * scaleRef.current -
        (stageRectRef.current.y / 2 - stageRectRef.current.y);
    }
    if (contentWidth * scaleRef.current < stageRectRef.current.x) {
      positionRef.current.x = (-contentWidth * scaleRef.current) / 2;
    }
    if (contentHeight * scaleRef.current < stageRectRef.current.y) {
      positionRef.current.y = (-contentHeight * scaleRef.current) / 2;
    }
  }, [contentHeight, contentWidth]);

  const reset = useCallback(() => {
    fitToOutsideRef.current = true;
    scaleRef.current = getDefaultScale();
    positionRef.current.x = (-contentWidth * scaleRef.current) / 2;
    positionRef.current.y = (-contentHeight * scaleRef.current) / 2;
    commit();
  }, [commit, contentHeight, contentWidth, getDefaultScale]);

  const resize = useCallback(
    (rect: DOMRectReadOnly) => {
      if (rootRef.current) {
        mouseOffsetRef.current.set(rootRef.current.getBoundingClientRect());
      }
      stageRectRef.current.set(rect.width, rect.height);
      if (fitToOutsideRef.current) {
        reset();
      }
      constraint();
      commit();
    },
    [commit, constraint, reset],
  );

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    let mounted = true;
    void IPC.settings.get().then((value) => {
      if (mounted) {
        setSettings(value);
      }
    });
    const settingsSubscription = IPC.settings.on("update", (_event, value) => {
      setSettings(value);
    });
    return () => {
      mounted = false;
      settingsSubscription.off();
    };
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) {
      return;
    }

    const resizeObserver = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) {
        resize(rect);
      }
    });

    const pointerDown = (event: PointerEvent) => {
      pointerPositionRef.current.set(vec2FromPointerEvent(event));
      draggingRef.current = true;
    };
    const pointerUp = () => {
      draggingRef.current = false;
    };
    const pointerMove = (event: PointerEvent) => {
      if (!draggingRef.current) {
        return;
      }
      fitToOutsideRef.current = false;
      const current = vec2FromPointerEvent(event);
      const diff = current.clone().sub(pointerPositionRef.current);
      positionRef.current.add(diff);
      pointerPositionRef.current.set(current);
      constraint();
      commit();
    };
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const activeSettings = settingsRef.current;
      if (!activeSettings) {
        return;
      }
      const mouse = vec2FromPointerEvent(event)
        .sub(mouseOffsetRef.current)
        .sub(stageRectRef.current.clone().div(2));

      if (event.ctrlKey || systemInfo.value.platform === "win32") {
        const currentZoom = scaleRef.current;
        scaleRef.current *= 1 + -event.deltaY * activeSettings.zoomSensitivity * 0.00001;
        if (scaleRef.current > BOARD_ZOOM_MAX) {
          scaleRef.current = BOARD_ZOOM_MAX;
        }
        if (scaleRef.current < BOARD_ZOOM_MIN) {
          scaleRef.current = BOARD_ZOOM_MIN;
        }
        positionRef.current
          .mult(-1)
          .add(mouse)
          .mult(scaleRef.current / currentZoom)
          .sub(mouse)
          .mult(-1);
      } else {
        positionRef.current.add(
          new Vec2(event.deltaX, event.deltaY)
            .mult(activeSettings.moveSensitivity)
            .mult(-0.01),
        );
      }
      fitToOutsideRef.current = false;
      constraint();
      commit();
    };

    root.addEventListener("pointerdown", pointerDown);
    root.addEventListener("dblclick", reset);
    root.addEventListener("wheel", wheel, { passive: false });
    window.addEventListener("pointerup", pointerUp);
    window.addEventListener("pointermove", pointerMove);
    resizeObserver.observe(root);
    resize(root.getBoundingClientRect());

    return () => {
      resizeObserver.disconnect();
      root.removeEventListener("pointerdown", pointerDown);
      root.removeEventListener("dblclick", reset);
      root.removeEventListener("wheel", wheel);
      window.removeEventListener("pointerup", pointerUp);
      window.removeEventListener("pointermove", pointerMove);
    };
  }, [commit, constraint, reset, resize, systemInfo.value.platform]);

  useEffect(() => {
    reset();
  }, [contentHeight, contentWidth, reset]);

  return (
    <div
      className={rootStyle}
      ref={rootRef}
      style={{ backgroundImage: `url(${TransparentTexture})` }}>
      <div
        className={contentStyle}
        style={{
          transform: `translate(${viewState.positionX + viewState.stageWidth / 2}px, ${
            viewState.positionY + viewState.stageHeight / 2
          }px) scale(${viewState.scale})`,
          width: `${contentWidth}px`,
          height: `${contentHeight}px`,
        }}>
        {children}
      </div>
    </div>
  );
}
