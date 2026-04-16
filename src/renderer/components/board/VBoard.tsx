import {
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { css, cx } from "styled-system/css";

import { PetaFile } from "@/commons/datas/petaFile";
import { RPetaBoard } from "@/commons/datas/rPetaBoard";
import { RPetaPanel } from "@/commons/datas/rPetaPanel";
import { Settings, getDefaultSettings } from "@/commons/datas/settings";
import { BOARD_ZOOM_MAX, BOARD_ZOOM_MIN } from "@/commons/defines";

import { IPC } from "@/renderer/libs/ipc";
import { getFileURL } from "@/renderer/utils/fileURL";

import NsfwTexture from "@/_public/images/textures/nsfw.png";

const rootStyle = css({
  position: "relative",
  width: "100%",
  height: "100%",
  overflow: "hidden",
  borderRadius: "rounded",
});

const viewportStyle = css({
  position: "relative",
  width: "100%",
  height: "100%",
  overflow: "hidden",
  touchAction: "none",
});

const stageStyle = css({
  position: "absolute",
  left: "50%",
  top: "50%",
  transformOrigin: "0 0",
});

const panelStyle = css({
  position: "absolute",
  overflow: "hidden",
  borderWidth: "window",
  borderStyle: "solid",
  borderColor: "border",
  borderRadius: "rounded",
  backgroundColor: "surface",
  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.25)",
});

const selectedPanelStyle = css({
  borderColor: "accent",
  boxShadow: "0 0 0 2px rgba(255,255,255,0.25), 0 10px 24px rgba(0, 0, 0, 0.3)",
});

const hiddenPanelStyle = css({
  opacity: 0.4,
});

const imageStyle = css({
  display: "block",
  width: "100%",
  height: "100%",
  objectFit: "cover",
  pointerEvents: "none",
});

const videoBadgeStyle = css({
  position: "absolute",
  right: "px1",
  bottom: "px1",
  borderRadius: "rounded",
  backgroundColor: "rgba(0, 0, 0, 0.72)",
  paddingX: "px1",
  color: "white",
  fontSize: "10px",
});

const topBadgesStyle = css({
  position: "absolute",
  left: "px1",
  top: "px1",
  display: "flex",
  gap: "px1",
});

const badgeStyle = css({
  borderRadius: "rounded",
  backgroundColor: "rgba(0, 0, 0, 0.72)",
  paddingX: "px1",
  color: "white",
  fontSize: "10px",
});

const emptyStyle = css({
  display: "grid",
  width: "100%",
  height: "100%",
  placeItems: "center",
  color: "text",
  opacity: 0.64,
});

const footerStyle = css({
  position: "absolute",
  left: "px2",
  right: "px2",
  bottom: "px2",
  display: "flex",
  justifyContent: "space-between",
  gap: "px2",
  pointerEvents: "none",
});

const footerItemStyle = css({
  borderRadius: "rounded",
  backgroundColor: "rgba(0, 0, 0, 0.55)",
  paddingX: "px2",
  paddingY: "px1",
  color: "white",
  fontSize: "size0",
});

function formatDuration(seconds: number) {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const remain = total % 60;
  return `${minutes}:${String(remain).padStart(2, "0")}`;
}

export default function VBoard({
  board,
  petaFilesById,
  onUpdateBoard,
}: {
  board?: RPetaBoard;
  petaFilesById: Record<string, PetaFile>;
  onUpdateBoard: (board: RPetaBoard) => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragPointerIdRef = useRef<number | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; positionX: number; positionY: number } | null>(
    null,
  );
  const [selectedPanelId, setSelectedPanelId] = useState("");
  const [showNSFW, setShowNSFW] = useState(false);
  const [settings, setSettings] = useState<Settings>(getDefaultSettings());

  useEffect(() => {
    let mounted = true;
    void Promise.all([IPC.nsfw.get(), IPC.settings.get()]).then(([nextShowNSFW, nextSettings]) => {
      if (!mounted) {
        return;
      }
      setShowNSFW(nextShowNSFW);
      setSettings(nextSettings);
    });

    const nsfwSubscription = IPC.common.on("showNSFW", (_event, value) => {
      setShowNSFW(value);
    });
    const settingsSubscription = IPC.settings.on("update", (_event, value) => {
      setSettings(value);
    });

    return () => {
      mounted = false;
      nsfwSubscription.off();
      settingsSubscription.off();
    };
  }, []);

  useEffect(() => {
    if (!board) {
      setSelectedPanelId("");
      return;
    }
    if (!board.petaPanels[selectedPanelId]) {
      setSelectedPanelId("");
    }
  }, [board, selectedPanelId]);

  const panels = useMemo(() => {
    if (!board) {
      return [];
    }
    return Object.values(board.petaPanels).sort((a, b) => a.index - b.index);
  }, [board]);

  const selectedPanel = selectedPanelId ? board?.petaPanels[selectedPanelId] : undefined;
  const selectedPetaFile = selectedPanel ? petaFilesById[selectedPanel.petaFileId] : undefined;

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    if (!board) {
      return;
    }
    event.preventDefault();

    const rect = viewportRef.current?.getBoundingClientRect();
    const moveScale = settings.moveSensitivity * 0.01;
    if (!rect || (!event.ctrlKey && !event.metaKey)) {
      onUpdateBoard({
        ...board,
        transform: {
          ...board.transform,
          position: {
            ...board.transform.position,
            x: board.transform.position.x - event.deltaX * moveScale,
            y: board.transform.position.y - event.deltaY * moveScale,
          },
        },
      });
      return;
    }

    const zoomScale = settings.zoomSensitivity * 0.00001;
    const currentScale = board.transform.scale;
    const nextScale = Math.max(
      BOARD_ZOOM_MIN,
      Math.min(BOARD_ZOOM_MAX, currentScale * (1 + -event.deltaY * zoomScale)),
    );
    const localX = event.clientX - rect.left - rect.width / 2;
    const localY = event.clientY - rect.top - rect.height / 2;
    const worldX = (localX - board.transform.position.x) / currentScale;
    const worldY = (localY - board.transform.position.y) / currentScale;

    onUpdateBoard({
      ...board,
      transform: {
        scale: nextScale,
        position: {
          x: localX - worldX * nextScale,
          y: localY - worldY * nextScale,
        },
      },
    });
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!board) {
      return;
    }
    if (event.target !== event.currentTarget) {
      return;
    }
    dragPointerIdRef.current = event.pointerId;
    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      positionX: board.transform.position.x,
      positionY: board.transform.position.y,
    };
    setSelectedPanelId("");
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!board || dragPointerIdRef.current !== event.pointerId || !dragStartRef.current) {
      return;
    }
    const deltaX = event.clientX - dragStartRef.current.x;
    const deltaY = event.clientY - dragStartRef.current.y;
    onUpdateBoard({
      ...board,
      transform: {
        ...board.transform,
        position: {
          x: dragStartRef.current.positionX + deltaX,
          y: dragStartRef.current.positionY + deltaY,
        },
      },
    });
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragPointerIdRef.current !== event.pointerId) {
      return;
    }
    dragPointerIdRef.current = null;
    dragStartRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  if (!board) {
    return <div className={cx(rootStyle, emptyStyle)}>board</div>;
  }

  return (
    <div className={rootStyle}>
      <div
        className={viewportStyle}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onWheel={handleWheel}
        ref={viewportRef}
        style={{
          backgroundColor: board.background.fillColor,
          backgroundImage: `linear-gradient(${board.background.lineColor}33 1px, transparent 1px), linear-gradient(90deg, ${board.background.lineColor}33 1px, transparent 1px)`,
          backgroundPosition: "center center",
          backgroundSize: `${Math.max(24, board.transform.scale * 32)}px ${Math.max(24, board.transform.scale * 32)}px`,
        }}>
        <div
          className={stageStyle}
          style={{
            transform: `translate(calc(-50% + ${board.transform.position.x}px), calc(-50% + ${board.transform.position.y}px)) scale(${board.transform.scale})`,
          }}>
          {panels.map((panel) => {
            const petaFile = petaFilesById[panel.petaFileId];
            const imageURL =
              petaFile && (!settings.loadTilesInOriginal || petaFile.metadata.type === "video")
                ? getFileURL(petaFile, "thumbnail")
                : petaFile
                  ? getFileURL(petaFile, "original")
                  : "";
            const masked = !!petaFile?.nsfw && !showNSFW;
            return (
              <button
                className={cx(
                  panelStyle,
                  selectedPanelId === panel.id && selectedPanelStyle,
                  !panel.visible && hiddenPanelStyle,
                )}
                key={panel.id}
                onClick={(event) => {
                  event.stopPropagation();
                  setSelectedPanelId(panel.id);
                }}
                onDoubleClick={(event) => {
                  event.stopPropagation();
                  if (petaFile) {
                    void IPC.windows.open("details", petaFile.id);
                  }
                }}
                style={{
                  left: `${panel.position.x}px`,
                  top: `${panel.position.y}px`,
                  width: `${panel.width}px`,
                  height: `${panel.height}px`,
                  transform: `rotate(${panel.rotation}rad) scale(${panel.flipHorizontal ? -1 : 1}, ${panel.flipVertical ? -1 : 1})`,
                  transformOrigin: "center center",
                }}
                type="button">
                {masked ? (
                  <div
                    className={imageStyle}
                    style={{
                      backgroundImage: `url(${NsfwTexture})`,
                      backgroundPosition: "center",
                      backgroundRepeat: "repeat",
                      backgroundSize: "32px 32px",
                    }}
                  />
                ) : petaFile ? (
                  <img alt={petaFile.name} className={imageStyle} draggable={false} src={imageURL} />
                ) : (
                  <div className={cx(imageStyle, emptyStyle)}>missing</div>
                )}
                <div className={topBadgesStyle}>
                  {panel.locked ? <span className={badgeStyle}>lock</span> : null}
                  {!panel.visible ? <span className={badgeStyle}>hidden</span> : null}
                </div>
                {petaFile?.metadata.type === "video" ? (
                  <span className={videoBadgeStyle}>{formatDuration(petaFile.metadata.duration)}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
      <div className={footerStyle}>
        <div className={footerItemStyle}>
          {board.name} / {panels.length} panels
        </div>
        {selectedPetaFile ? (
          <div className={footerItemStyle}>{selectedPetaFile.name}</div>
        ) : (
          <div className={footerItemStyle}>{board.transform.scale.toFixed(2)}x</div>
        )}
      </div>
    </div>
  );
}
