import { WheelEvent, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";

import { GetPetaFileIdsParams } from "@/commons/datas/getPetaFileIdsParams";
import { PetaFile } from "@/commons/datas/petaFile";
import { PetaTag } from "@/commons/datas/petaTag";
import { realESRGANModelNames } from "@/commons/datas/realESRGANModelName";
import { browserTileViewMode, defaultStates, States } from "@/commons/datas/states";
import {
  BROWSER_THUMBNAIL_SIZE,
  BROWSER_THUMBNAIL_ZOOM_MAX,
  BROWSER_THUMBNAIL_ZOOM_MIN,
  INTERNAL_DRAG_PETA_FILE_IDS_MIME,
} from "@/commons/defines";
import { ciede, hex2rgb } from "@/commons/utils/colors";
import { Vec2 } from "@/commons/utils/vec2";

import { FilterType } from "@/renderer/components/browser/filterType";
import VSearch from "@/renderer/components/browser/search/VSearch";
import VTags from "@/renderer/components/browser/tags/VTags";
import VTile from "@/renderer/components/browser/tile/VTile";
import VPreview from "@/renderer/components/commons/property/VPreview";
import VProperty from "@/renderer/components/commons/property/VProperty";
import VSelect from "@/renderer/components/commons/utils/select/VSelect";
import VSlider from "@/renderer/components/commons/utils/slider/VSlider";
import { IPC } from "@/renderer/libs/ipc";
import { useComponentsStore } from "@/renderer/stores/componentsStore/useComponentsStore";
import { isKeyboardLocked } from "@/renderer/utils/isKeyboardLocked";

const rootStyle = css({
  display: "flex",
  gap: "px2",
  width: "100%",
  height: "100%",
  overflow: "hidden",
});

const sidebarStyle = css({
  display: "flex",
  width: "250px",
  minWidth: "250px",
});

const rightStyle = css({
  display: "flex",
  flexDirection: "column",
  width: "250px",
  minWidth: "250px",
});

const centerStyle = css({
  display: "flex",
  flex: 1,
  flexDirection: "column",
  height: "100%",
});

const contentStyle = css({
  display: "flex",
  position: "relative",
  flex: 1,
  flexDirection: "column",
  gap: "px2",
  width: "100%",
  height: "100%",
  overflow: "hidden",
});

const topStyle = css({
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  alignItems: "center",
  width: "100%",
});

const searchStyle = css({
  display: "block",
  flex: 1,
  minWidth: "200px",
  paddingX: "px2",
});

const buttonsStyle = css({
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  alignItems: "center",
});

const tilesStyle = css({
  flex: 1,
  overflowX: "hidden",
  overflowY: "auto",
});

const tileGridStyle = css({
  display: "grid",
  gap: "px2",
  width: "100%",
  padding: "px1",
});

const bottomStyle = css({
  display: "flex",
  width: "100%",
  paddingX: "px2",
});

const spacerStyle = css({
  flex: 1,
});

const sortModes = ["ADD_DATE", "COLOR_NUM", "SIMILAR"] as const;
type SortMode = (typeof sortModes)[number];

function updatePetaFileMap(
  current: Record<string, PetaFile>,
  updated: PetaFile[],
  mode: "insert" | "update" | "remove",
) {
  const next = { ...current };
  updated.forEach((petaFile) => {
    if (mode === "remove") {
      delete next[petaFile.id];
    } else {
      next[petaFile.id] = petaFile;
    }
  });
  return next;
}

export default function VBrowser() {
  const { t } = useTranslation();
  const components = useComponentsStore();
  const [petaFilesById, setPetaFilesById] = useState<Record<string, PetaFile>>({});
  const [allTags, setAllTags] = useState<PetaTag[]>([]);
  const [showTagsOnTile, setShowTagsOnTile] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedPetaTagIds, setSelectedPetaTagIds] = useState<string[]>([]);
  const [selectedFilterType, setSelectedFilterType] = useState<FilterType>("all");
  const [sortMode, setSortMode] = useState<SortMode>("ADD_DATE");
  const [currentColor, setCurrentColor] = useState("#ffffff");
  const [showNSFW, setShowNSFW] = useState(false);
  const [states, setStates] = useState<States>(defaultStates);
  const [filteredIds, setFilteredIds] = useState<string[]>([]);
  const [tileTagsRevision, setTileTagsRevision] = useState(0);
  const filterRequestRef = useRef(0);

  useEffect(() => {
    let mounted = true;

    const refreshTags = async () => {
      const tags = await IPC.petaTags.getAll();
      if (mounted) {
        setAllTags(tags);
      }
    };

    void Promise.all([
      IPC.petaFiles.getAll(),
      IPC.petaTags.getAll(),
      IPC.settings.get(),
      IPC.states.get(),
      IPC.nsfw.get(),
    ]).then(([petaFiles, tags, settings, nextStates, nextShowNSFW]) => {
      if (!mounted) {
        return;
      }
      setPetaFilesById(petaFiles);
      setAllTags(tags);
      setShowTagsOnTile(settings.showTagsOnTile);
      setStates(nextStates);
      setShowNSFW(nextShowNSFW);
    });

    const petaFilesSubscription = IPC.petaFiles.on("update", (_event, updated, mode) => {
      setPetaFilesById((current) => updatePetaFileMap(current, updated, mode));
      if (mode === "insert") {
        setSelectedPetaTagIds([]);
        setSelectedFilterType("all");
      }
      if (mode === "remove") {
        setSelectedIds((current) => current.filter((id) => !updated.some((petaFile) => petaFile.id === id)));
      }
    });
    const tagsSubscription = IPC.petaTags.on("update", () => {
      void refreshTags();
      setTileTagsRevision((current) => current + 1);
    });
    const settingsSubscription = IPC.settings.on("update", (_event, nextSettings) => {
      setShowTagsOnTile(nextSettings.showTagsOnTile);
    });
    const statesSubscription = IPC.states.on("update", (_event, nextStates) => {
      setStates(nextStates);
    });
    const nsfwSubscription = IPC.common.on("showNSFW", (_event, value) => {
      setShowNSFW(value);
    });
    const openInBrowserSubscription = IPC.common.on("openInBrowser", (_event, petaFileID) => {
      if (petaFileID) {
        setSelectedIds([petaFileID]);
      }
    });

    void IPC.common.getOpenInBrowserID().then((id) => {
      if (id && mounted) {
        setSelectedIds([id]);
      }
    });

    return () => {
      mounted = false;
      petaFilesSubscription.off();
      tagsSubscription.off();
      settingsSubscription.off();
      statesSubscription.off();
      nsfwSubscription.off();
      openInBrowserSubscription.off();
    };
  }, []);

  useEffect(() => {
    const requestId = ++filterRequestRef.current;
    const params: GetPetaFileIdsParams =
      selectedFilterType === "untagged"
        ? { type: "untagged" }
        : selectedFilterType === "tags" && selectedPetaTagIds.length > 0
          ? { type: "petaTag", petaTagIds: selectedPetaTagIds }
          : { type: "all" };

    void IPC.petaFiles.getIDs(params).then((ids) => {
      if (filterRequestRef.current !== requestId) {
        return;
      }
      setFilteredIds(ids);
    });
  }, [selectedFilterType, selectedPetaTagIds, petaFilesById]);

  const filteredPetaFiles = useMemo(() => {
    const color = hex2rgb(currentColor);
    return Array.from(
      new Set(
        filteredIds
          .map((id) => petaFilesById[id])
          .filter((petaFile): petaFile is PetaFile => petaFile !== undefined),
      ),
    ).sort((a, b) => {
      if (sortMode === "ADD_DATE") {
        if (a.addDate === b.addDate) {
          return b.fileDate - a.fileDate;
        }
        return b.addDate - a.addDate;
      }
      if (sortMode === "COLOR_NUM") {
        return b.metadata.palette.length - a.metadata.palette.length;
      }
      const distanceA = Math.min(
        ...a.metadata.palette.map((palette) => ciede(palette, color)),
      );
      const distanceB = Math.min(
        ...b.metadata.palette.map((palette) => ciede(palette, color)),
      );
      return distanceA - distanceB;
    });
  }, [currentColor, filteredIds, petaFilesById, sortMode]);

  const selectedPetaFiles = useMemo(
    () =>
      selectedIds
        .map((id) => petaFilesById[id])
        .filter((petaFile): petaFile is PetaFile => petaFile !== undefined),
    [petaFilesById, selectedIds],
  );

  const original = states.browserTileSize > BROWSER_THUMBNAIL_SIZE;

  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (event.code !== "KeyA") {
        return;
      }
      if (!(event.ctrlKey || event.metaKey) || isKeyboardLocked()) {
        return;
      }
      const activeElement = document.activeElement as HTMLElement | null;
      if (
        activeElement &&
        (activeElement.tagName === "INPUT" ||
          activeElement.tagName === "TEXTAREA" ||
          activeElement.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      setSelectedIds(filteredPetaFiles.map((petaFile) => petaFile.id));
    }

    window.addEventListener("keydown", keydown);
    return () => {
      window.removeEventListener("keydown", keydown);
    };
  }, [filteredPetaFiles]);

  function clearSelectionAll() {
    setSelectedIds([]);
  }

  async function updateStates(nextStates: States) {
    setStates(nextStates);
    await IPC.states.update(nextStates);
  }

  async function openDetail(petaFile: PetaFile) {
    await IPC.details.set(petaFile.id);
    await IPC.windows.open("details");
  }

  function openContextMenu(event: React.MouseEvent, petaFile: PetaFile) {
    event.preventDefault();
    const targetFiles = selectedIds.includes(petaFile.id) ? selectedPetaFiles : [petaFile];
    if (!selectedIds.includes(petaFile.id)) {
      setSelectedIds([petaFile.id]);
    }
    components.contextMenu.open(
      [
        {
          label: t("browser.petaFileMenu.remove", [targetFiles.length]),
          click: async () => {
            const result = await IPC.modals.open(t("browser.removeImageDialog", [targetFiles.length]), [
              t("commons.yes"),
              t("commons.no"),
            ]);
            if (result === 0) {
              await IPC.petaFiles.update(targetFiles, "remove");
            }
          },
        },
        {
          label: t("browser.petaFileMenu.openFile"),
          click: async () => {
            await IPC.common.openFile(petaFile);
          },
        },
        ...realESRGANModelNames.map((modelName) => ({
          label: `${t("browser.petaFileMenu.realESRGAN")}(${modelName})`,
          click: async () => {
            await IPC.common.realESRGANConvert(targetFiles, modelName);
          },
        })),
        {
          label: t("browser.petaFileMenu.searchImageByGoogle"),
          click: async () => {
            await IPC.common.searchImageByGoogle(petaFile);
          },
          skip: petaFile.metadata.type !== "image",
        },
        {
          label: t("browser.petaFileMenu.encodeVideo"),
          click: async () => {
            await IPC.common.encodeVideo(targetFiles);
          },
        },
      ],
      new Vec2(event.clientX, event.clientY),
    );
  }

  function handleTilesWheel(event: WheelEvent<HTMLDivElement>) {
    if (!(event.ctrlKey || event.metaKey)) {
      return;
    }
    event.preventDefault();
    const nextSize = Math.floor(
      Math.max(
        BROWSER_THUMBNAIL_ZOOM_MIN,
        Math.min(
          BROWSER_THUMBNAIL_ZOOM_MAX,
          states.browserTileSize - event.deltaY * 0.001 * 100,
        ),
      ),
    );
    if (nextSize === states.browserTileSize) {
      return;
    }
    setStates((current) => ({
      ...current,
      browserTileSize: nextSize,
    }));
    void IPC.states.update({
      ...states,
      browserTileSize: nextSize,
    });
  }

  function handleTileDragStart(event: React.DragEvent, petaFile: PetaFile) {
    const targetFiles = selectedIds.includes(petaFile.id) ? selectedPetaFiles : [petaFile];
    if (!selectedIds.includes(petaFile.id)) {
      setSelectedIds([petaFile.id]);
    }
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = "copy";
      event.dataTransfer.setData(
        INTERNAL_DRAG_PETA_FILE_IDS_MIME,
        JSON.stringify(targetFiles.map((file) => file.id)),
      );
      event.dataTransfer.setData("text/plain", targetFiles.map((file) => file.name).join(", "));
    }
  }

  return (
    <div className={rootStyle}>
      <div className={sidebarStyle}>
        <VTags
          allTags={allTags}
          onFilterTypeChange={setSelectedFilterType}
          onTagIdsChange={setSelectedPetaTagIds}
          petaFilesCount={Object.keys(petaFilesById).length}
          selectedFilterType={selectedFilterType}
          selectedPetaTagIds={selectedPetaTagIds}
        />
      </div>
      <div className={centerStyle}>
        <div className={contentStyle}>
          <div className={topStyle}>
            <div className={searchStyle}>
              <VSearch
                allTags={allTags}
                onFilterTypeChange={setSelectedFilterType}
                onTagIdsChange={setSelectedPetaTagIds}
                selectedFilterType={selectedFilterType}
                selectedPetaTagIds={selectedPetaTagIds}
              />
            </div>
            <div className={buttonsStyle}>
              <VSelect
                items={browserTileViewMode.map((mode) => ({ value: mode, label: mode }))}
                minWidth="120px"
                onValueChange={(value) =>
                  void updateStates({
                    ...states,
                    browserTileViewMode: value as States["browserTileViewMode"],
                  })
                }
                value={states.browserTileViewMode}
              />
              <VSelect
                items={sortModes.map((mode) => ({ value: mode, label: mode }))}
                minWidth="120px"
                onValueChange={(value) => setSortMode(value as SortMode)}
                value={sortMode}
              />
              {sortMode === "SIMILAR" ? (
                <input onChange={(event) => setCurrentColor(event.target.value)} type="color" value={currentColor} />
              ) : null}
            </div>
          </div>
          <div className={tilesStyle} onWheel={handleTilesWheel}>
            <div
              className={tileGridStyle}
              style={{ gridTemplateColumns: `repeat(auto-fill, minmax(${states.browserTileSize}px, 1fr))` }}>
              {filteredPetaFiles.map((petaFile) => (
                <VTile
                  allTags={allTags}
                  key={petaFile.id}
                  onDoubleClick={(next) => void openDetail(next)}
                  onContextMenu={(event, next) => openContextMenu(event, next)}
                  onDragStart={(event, next) => handleTileDragStart(event, next)}
                  onSelect={(event, next) => {
                    if (event.metaKey || event.ctrlKey) {
                      setSelectedIds((current) =>
                        current.includes(next.id)
                          ? current.filter((id) => id !== next.id)
                          : [...current, next.id],
                      );
                    } else {
                      setSelectedIds([next.id]);
                    }
                  }}
                  original={original}
                  petaFile={petaFile}
                  selected={selectedIds.includes(petaFile.id)}
                  showNSFW={showNSFW}
                  showTagsOnTile={showTagsOnTile}
                  tagsRevision={tileTagsRevision}
                />
              ))}
            </div>
          </div>
          <div className={bottomStyle}>
            <div className={spacerStyle} />
            <VSlider
              max={512}
              min={64}
              onChange={(value) =>
                void updateStates({
                  ...states,
                  browserTileSize: value,
                })
              }
              onValueChange={(value) =>
                setStates((current) => ({
                  ...current,
                  browserTileSize: value,
                }))
              }
              value={states.browserTileSize}
            />
          </div>
        </div>
      </div>
      <div className={rightStyle}>
        <VPreview onClearSelectionAll={clearSelectionAll} petaFiles={selectedPetaFiles} showNSFW={showNSFW} />
        <VProperty
          onPetaFileChange={(petaFile) => {
            setPetaFilesById((current) => ({
              ...current,
              [petaFile.id]: petaFile,
            }));
          }}
          petaFile={selectedPetaFiles[0]}
        />
      </div>
    </div>
  );
}
