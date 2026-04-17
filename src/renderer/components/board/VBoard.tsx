import {
  PointerEvent as ReactPointerEvent,
  WheelEvent as ReactWheelEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Buffer } from "buffer";
import { useTranslation } from "react-i18next";
import { css, cx } from "styled-system/css";

import { PetaFile } from "@/commons/datas/petaFile";
import { RPetaBoard } from "@/commons/datas/rPetaBoard";
import { createRPetaPanel } from "@/commons/datas/rPetaPanel";
import { RPetaPanel } from "@/commons/datas/rPetaPanel";
import { Settings, getDefaultSettings } from "@/commons/datas/settings";
import {
  BOARD_ADD_MULTIPLE_OFFSET_X,
  BOARD_ADD_MULTIPLE_OFFSET_Y,
  BOARD_DEFAULT_IMAGE_SIZE,
  BOARD_ZOOM_MAX,
  BOARD_ZOOM_MIN,
  INTERNAL_DRAG_PETA_FILE_IDS_MIME,
} from "@/commons/defines";
import { resizeImage } from "@/commons/utils/resizeImage";
import { Vec2 } from "@/commons/utils/vec2";

import { IPC } from "@/renderer/libs/ipc";
import { useComponentsStore } from "@/renderer/stores/componentsStore/useComponentsStore";
import { getFileURL } from "@/renderer/utils/fileURL";
import { getURLFromHTML } from "@/renderer/utils/getURLFromHTML";

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
  const { t } = useTranslation();
  const components = useComponentsStore();
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragPointerIdRef = useRef<number | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; positionX: number; positionY: number } | null>(
    null,
  );
  const panelDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    panelIds: string[];
    positions: Record<string, Vec2>;
  } | null>(null);
  const lastPointerClientPositionRef = useRef<Vec2 | null>(null);
  const [selectedPanelIds, setSelectedPanelIds] = useState<string[]>([]);
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
    async function importExternalData(
      fileList?: FileList | null,
      html?: string,
    ) {
      const groups =
        (await getImportGroupsFromFileList(fileList)) ??
        getImportGroupsFromHTML(html);
      if (!groups || groups.length === 0) {
        return;
      }
      const ids = await IPC.importer.import(groups);
      const position = getPlacementClientPosition();
      addPanelsAtClientPosition(ids, position.x, position.y);
    }

    function handlePaste(event: ClipboardEvent) {
      if (!event.clipboardData) {
        return;
      }
      const hasFiles = event.clipboardData.files.length > 0;
      const html = event.clipboardData.getData("text/html");
      if (!hasFiles && html === "") {
        return;
      }
      event.preventDefault();
      void importExternalData(event.clipboardData.files, html);
    }

    document.addEventListener("paste", handlePaste);
    return () => {
      document.removeEventListener("paste", handlePaste);
    };
  }, [board, petaFilesById]);

  useEffect(() => {
    if (!board) {
      setSelectedPanelIds([]);
      return;
    }
    setSelectedPanelIds((current) => current.filter((panelId) => board.petaPanels[panelId] !== undefined));
  }, [board]);

  const panels = useMemo(() => {
    if (!board) {
      return [];
    }
    return Object.values(board.petaPanels).sort((a, b) => a.index - b.index);
  }, [board]);

  const selectedPanel = selectedPanelIds[0] ? board?.petaPanels[selectedPanelIds[0]] : undefined;
  const selectedPetaFile = selectedPanel ? petaFilesById[selectedPanel.petaFileId] : undefined;

  function getNextSelectedPanelIds(
    panelId: string,
    event: Pick<ReactPointerEvent<HTMLElement>, "ctrlKey" | "metaKey" | "shiftKey">,
  ) {
    const additive = event.ctrlKey || event.metaKey || event.shiftKey;
    const alreadySelected = selectedPanelIds.includes(panelId);
    if (additive) {
      return alreadySelected ? selectedPanelIds : [...selectedPanelIds, panelId];
    }
    if (alreadySelected && selectedPanelIds.length > 1) {
      return selectedPanelIds;
    }
    return [panelId];
  }

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
    setSelectedPanelIds([]);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    lastPointerClientPositionRef.current = new Vec2(event.clientX, event.clientY);
    if (!board) {
      return;
    }
    if (panelDragRef.current && panelDragRef.current.pointerId === event.pointerId) {
      const deltaX = (event.clientX - panelDragRef.current.startX) / board.transform.scale;
      const deltaY = (event.clientY - panelDragRef.current.startY) / board.transform.scale;
      const nextPanels = { ...board.petaPanels };
      let moved = false;
      panelDragRef.current.panelIds.forEach((panelId) => {
        const currentPanel = board.petaPanels[panelId];
        const startPosition = panelDragRef.current?.positions[panelId];
        if (!currentPanel || !startPosition) {
          return;
        }
        nextPanels[currentPanel.id] = {
          ...currentPanel,
          position: new Vec2(startPosition.x + deltaX, startPosition.y + deltaY),
        };
        moved = true;
      });
      if (!moved) {
        return;
      }
      onUpdateBoard({
        ...board,
        petaPanels: nextPanels,
      });
      return;
    }
    if (dragPointerIdRef.current !== event.pointerId || !dragStartRef.current) {
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
    if (panelDragRef.current?.pointerId === event.pointerId) {
      panelDragRef.current = null;
    }
    if (dragPointerIdRef.current !== event.pointerId) {
      return;
    }
    dragPointerIdRef.current = null;
    dragStartRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function getPlacementClientPosition() {
    if (lastPointerClientPositionRef.current) {
      return lastPointerClientPositionRef.current.clone();
    }
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect) {
      return new Vec2(0, 0);
    }
    return new Vec2(rect.left + rect.width / 2, rect.top + rect.height / 2);
  }

  async function getImportGroupsFromFileList(fileList?: FileList | null) {
    const files = Array.from(fileList ?? []);
    if (files.length === 0) {
      return undefined;
    }
    const firstPath = IPC.electronWebUtils.getPathForFile(files[0]);
    if (firstPath !== "") {
      return files
        .map((file) => IPC.electronWebUtils.getPathForFile(file))
        .filter((filePath) => filePath !== "")
        .map((filePath) => [{ type: "filePath", filePath }] as const);
    }
    const buffers = (
      await Promise.all(
        files.map(async (file) => {
          const data = await file.arrayBuffer();
          return Buffer.from(data);
        }),
      )
    ).filter((buffer) => buffer.byteLength > 0);
    return buffers.map((buffer) => [{ type: "buffer", buffer }] as const);
  }

  function getImportGroupsFromHTML(html?: string) {
    const urls = html ? getURLFromHTML(html) : undefined;
    if (!urls || urls.length === 0) {
      return undefined;
    }
    return [
      urls.map(
        (url) =>
          ({
            type: "url",
            url,
          }) as const,
      ),
    ];
  }

  function addPanelsAtClientPosition(ids: string[], clientX: number, clientY: number) {
    if (!board || !viewportRef.current) {
      return;
    }
    const petaFiles = ids
      .map((id) => petaFilesById[id])
      .filter((petaFile): petaFile is PetaFile => petaFile !== undefined);
    if (petaFiles.length === 0) {
      return;
    }
    const rect = viewportRef.current.getBoundingClientRect();
    const localX = clientX - rect.left - rect.width / 2;
    const localY = clientY - rect.top - rect.height / 2;
    const worldX = (localX - board.transform.position.x) / board.transform.scale;
    const worldY = (localY - board.transform.position.y) / board.transform.scale;
    const nextPanels = { ...board.petaPanels };
    let nextIndex = Math.max(-1, ...Object.values(nextPanels).map((panel) => panel.index)) + 1;
    const createdPanelIds: string[] = [];
    petaFiles.forEach((petaFile, index) => {
      const panel = createRPetaPanel(
        petaFile,
        new Vec2(
          worldX + BOARD_ADD_MULTIPLE_OFFSET_X * index,
          worldY + BOARD_ADD_MULTIPLE_OFFSET_Y * index,
        ),
        BOARD_DEFAULT_IMAGE_SIZE,
      );
      panel.index = nextIndex++;
      nextPanels[panel.id] = panel;
      createdPanelIds.push(panel.id);
    });
    if (createdPanelIds.length > 0) {
      setSelectedPanelIds(createdPanelIds);
    }
    onUpdateBoard({
      ...board,
      petaPanels: nextPanels,
    });
  }

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    lastPointerClientPositionRef.current = new Vec2(event.clientX, event.clientY);
    if (
      event.dataTransfer.types.includes(INTERNAL_DRAG_PETA_FILE_IDS_MIME) ||
      event.dataTransfer.files.length > 0 ||
      event.dataTransfer.types.includes("text/html")
    ) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "copy";
    }
  }

  async function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer.types.includes(INTERNAL_DRAG_PETA_FILE_IDS_MIME)) {
      const raw = event.dataTransfer.getData(INTERNAL_DRAG_PETA_FILE_IDS_MIME);
      try {
        const ids = JSON.parse(raw) as string[];
        addPanelsAtClientPosition(ids, event.clientX, event.clientY);
      } catch {
        //
      }
      return;
    }
    const groups =
      (await getImportGroupsFromFileList(event.dataTransfer.files)) ??
      getImportGroupsFromHTML(event.dataTransfer.getData("text/html"));
    if (!groups || groups.length === 0) {
      return;
    }
    const ids = await IPC.importer.import(groups);
    addPanelsAtClientPosition(ids, event.clientX, event.clientY);
  }

  if (!board) {
    return <div className={cx(rootStyle, emptyStyle)}>board</div>;
  }

  function normalizePanels(nextPanels: RPetaPanel[]) {
    return nextPanels
      .sort((a, b) => a.index - b.index)
      .reduce(
        (mapped, panel, index) => ({
          ...mapped,
          [panel.id]: {
            ...panel,
            index,
          },
        }),
        {} as Record<string, RPetaPanel>,
      );
  }

  function updatePanel(
    panelId: string,
    updater: (panel: RPetaPanel, petaFile?: PetaFile) => RPetaPanel,
  ) {
    if (!board) {
      return;
    }
    const targetPanel = board.petaPanels[panelId];
    if (!targetPanel) {
      return;
    }
    const petaFile = petaFilesById[targetPanel.petaFileId];
    const nextPanel = updater(targetPanel, petaFile);
    onUpdateBoard({
      ...board,
      petaPanels: {
        ...board.petaPanels,
        [targetPanel.id]: nextPanel,
      },
    });
  }

  function openPanelContextMenu(event: React.MouseEvent, panel: RPetaPanel, petaFile?: PetaFile) {
    event.preventDefault();
    event.stopPropagation();
    if (!selectedPanelIds.includes(panel.id)) {
      setSelectedPanelIds([panel.id]);
    }
    components.contextMenu.open(
      [
        {
          label: t("boards.panelMenu.toFront"),
          click: () => {
            if (!board) {
              return;
            }
            const maxIndex = Math.max(...panels.map((current) => current.index), 0);
            onUpdateBoard({
              ...board,
              petaPanels: normalizePanels(
                panels.map((current) =>
                  current.id === panel.id ? { ...current, index: maxIndex + 1 } : current,
                ),
              ),
            });
          },
        },
        {
          label: t("boards.panelMenu.toBack"),
          click: () => {
            if (!board) {
              return;
            }
            const minIndex = Math.min(...panels.map((current) => current.index), 0);
            onUpdateBoard({
              ...board,
              petaPanels: normalizePanels(
                panels.map((current) =>
                  current.id === panel.id ? { ...current, index: minIndex - 1 } : current,
                ),
              ),
            });
          },
        },
        {
          label: t("boards.panelMenu.flipHorizontal"),
          click: () => {
            updatePanel(panel.id, (current) => ({
              ...current,
              flipHorizontal: !current.flipHorizontal,
            }));
          },
        },
        {
          label: t("boards.panelMenu.flipVertical"),
          click: () => {
            updatePanel(panel.id, (current) => ({
              ...current,
              flipVertical: !current.flipVertical,
            }));
          },
        },
        {
          label: t("boards.panelMenu.reset"),
          click: () => {
            updatePanel(panel.id, (current, selectedPetaFile) => {
              if (!selectedPetaFile) {
                return current;
              }
              const maxWidth = current.width;
              const maxHeight = current.height;
              const resized =
                maxWidth > maxHeight
                  ? resizeImage(selectedPetaFile.metadata.width, selectedPetaFile.metadata.height, maxWidth, "width")
                  : resizeImage(selectedPetaFile.metadata.width, selectedPetaFile.metadata.height, maxHeight, "height");
              return {
                ...current,
                width: resized.width,
                height: resized.height,
                flipHorizontal: false,
                flipVertical: false,
                rotation: 0,
                crop: {
                  ...current.crop,
                  position: new Vec2(0, 0),
                  width: 1,
                  height: 1,
                },
              };
            });
          },
        },
        {
          label: t("boards.panelMenu.details"),
          click: async () => {
            if (!petaFile) {
              return;
            }
            await IPC.details.set(petaFile.id);
            await IPC.windows.open("details");
          },
        },
        {
          label: t("boards.panelMenu.openInBrowser"),
          click: async () => {
            await IPC.common.openInBrowser(panel.petaFileId);
          },
        },
        {
          label: t("boards.panelMenu.remove"),
          click: () => {
            if (!board) {
              return;
            }
            const nextPanels = { ...board.petaPanels };
            delete nextPanels[panel.id];
            setSelectedPanelIds((current) => current.filter((panelId) => panelId !== panel.id));
            onUpdateBoard({
              ...board,
              petaPanels: normalizePanels(Object.values(nextPanels)),
            });
          },
        },
      ],
      new Vec2(event.clientX, event.clientY),
    );
  }

  return (
    <div className={rootStyle}>
      <div
        className={viewportStyle}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
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
                  selectedPanelIds.includes(panel.id) && selectedPanelStyle,
                  !panel.visible && hiddenPanelStyle,
                )}
                key={panel.id}
                onClick={(event) => {
                  event.stopPropagation();
                }}
                onContextMenu={(event) => openPanelContextMenu(event, panel, petaFile)}
                onDoubleClick={(event) => {
                  event.stopPropagation();
                  if (petaFile) {
                    void IPC.details.set(petaFile.id).then(() => IPC.windows.open("details"));
                  }
                }}
                onPointerDown={(event) => {
                  if (event.button !== 0) {
                    return;
                  }
                  event.stopPropagation();
                  const nextSelectedPanelIds = getNextSelectedPanelIds(panel.id, event);
                  setSelectedPanelIds(nextSelectedPanelIds);
                  panelDragRef.current = {
                    pointerId: event.pointerId,
                    startX: event.clientX,
                    startY: event.clientY,
                    panelIds: nextSelectedPanelIds,
                    positions: nextSelectedPanelIds.reduce(
                      (positions, panelId) => {
                        const currentPanel = board.petaPanels[panelId];
                        if (!currentPanel) {
                          return positions;
                        }
                        return {
                          ...positions,
                          [panelId]: currentPanel.position.clone(),
                        };
                      },
                      {} as Record<string, Vec2>,
                    ),
                  };
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
