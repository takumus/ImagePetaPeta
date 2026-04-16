import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { css, cx } from "styled-system/css";

import { PetaTag } from "@/commons/datas/petaTag";
import { PetaTagPartition, createPetaTagPartition } from "@/commons/datas/petaTagPartition";

import { FilterType } from "@/renderer/components/browser/filterType";
import VTextarea from "@/renderer/components/commons/utils/textarea/VTextarea";
import { appButtonStyle, textInputStyle } from "@/renderer/components/shared/controlStyles";
import { IPC } from "@/renderer/libs/ipc";
import { useTextsStore } from "@/renderer/stores/textsStore/useTextsStore";

const rootStyle = css({
  display: "flex",
  flexDirection: "column",
  width: "100%",
  height: "100%",
  minWidth: 0,
});

const tagsTopStyle = css({
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  gap: "px1",
  padding: "px1",
});

const tagsStyle = css({
  display: "flex",
  flex: 1,
  flexDirection: "column",
  gap: "px1",
  overflowY: "auto",
  paddingX: "px1",
  paddingBottom: "px1",
});

const tagCellStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "px1",
  minWidth: 0,
  width: "fit-content",
  maxWidth: "100%",
  padding: "px1",
  borderRadius: "window",
  backgroundColor: "surfaceMuted",
  boxShadow: "0 1px 2px rgba(0, 0, 0, 0.2)",
  cursor: "pointer",
});

const selectedTagCellStyle = css({
  backgroundColor: "accent",
});

const tagLabelStyle = css({
  minWidth: 0,
  overflow: "hidden",
});

const partitionStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "px2",
  width: "100%",
  paddingY: "px1",
});

const partitionLineStyle = css({
  flex: 1,
  height: "1px",
  backgroundColor: "border",
});

const partitionLabelStyle = css({
  minWidth: "80px",
  textAlign: "center",
});

const removeButtonStyle = css({
  flexShrink: 0,
  width: "24px",
  height: "24px",
  border: "none",
  borderRadius: "window",
  backgroundColor: "transparent",
  color: "inherit",
  cursor: "pointer",
  _hover: {
    backgroundColor: "surfaceEmphasis",
  },
});

const tagAddStyle = css({
  paddingTop: "px1",
  paddingRight: "px1",
});

const tagAddInnerStyle = css({
  display: "flex",
  gap: "px1",
  padding: "px1",
});

const inputWrapperStyle = css({
  flex: 1,
});

type Entry =
  | {
      type: "tag";
      id: string;
      index: number;
      tag: PetaTag;
    }
  | {
      type: "partition";
      id: string;
      index: number;
      partition: PetaTagPartition;
    };

function hasDuplicateTagName(tags: PetaTag[], name: string, currentId?: string) {
  return tags.some((tag) => tag.name === name && tag.id !== currentId);
}

export default function VTags({
  allTags,
  onFilterTypeChange,
  onTagIdsChange,
  petaFilesCount,
  selectedFilterType,
  selectedPetaTagIds,
}: {
  allTags: PetaTag[];
  onFilterTypeChange: (selectedFilterType: FilterType) => void;
  onTagIdsChange: (selectedPetaTagIds: string[]) => void;
  petaFilesCount: number;
  selectedFilterType: FilterType;
  selectedPetaTagIds: string[];
}) {
  const { t } = useTranslation();
  const textsStore = useTextsStore();
  const [newTagName, setNewTagName] = useState("");
  const [partitions, setPartitions] = useState<PetaTagPartition[]>([]);

  useEffect(() => {
    let mounted = true;
    void IPC.petaTagPartitions.getAll().then((nextPartitions) => {
      if (mounted) {
        setPartitions(nextPartitions);
      }
    });
    const subscription = IPC.petaTagPartitions.on("update", async () => {
      const nextPartitions = await IPC.petaTagPartitions.getAll();
      if (mounted) {
        setPartitions(nextPartitions);
      }
    });
    return () => {
      mounted = false;
      subscription.off();
    };
  }, []);

  const entries = useMemo<Entry[]>(
    () =>
      [
        ...allTags.map(
          (tag) =>
            ({
              type: "tag",
              id: tag.id,
              index: tag.index,
              tag,
            }) as const,
        ),
        ...partitions.map(
          (partition) =>
            ({
              type: "partition",
              id: partition.id,
              index: partition.index,
              partition,
            }) as const,
        ),
      ].sort((a, b) => a.index - b.index),
    [allTags, partitions],
  );

  async function addTag(name: string) {
    const trimmed = name.trim();
    if (trimmed === "") {
      return;
    }
    if (hasDuplicateTagName(allTags, trimmed)) {
      await IPC.modals.open(t("browser.tagAlreadyExistsDialog", [trimmed]), [t("commons.yes")]);
      return;
    }
    await IPC.petaTags.update([{ type: "name", name: trimmed }], "insert");
    setNewTagName("");
  }

  async function addPartition() {
    const nextPartition = createPetaTagPartition(t("browser.grouping"));
    nextPartition.index = Math.max(-1, ...entries.map((entry) => entry.index)) + 1;
    await IPC.petaTagPartitions.update([nextPartition], "insert");
  }

  function selectPetaTag(event: React.MouseEvent, petaTag: PetaTag) {
    onFilterTypeChange("tags");
    const nextIds = [...selectedPetaTagIds];
    const toggle = event.metaKey || event.ctrlKey || event.shiftKey;
    if (!toggle) {
      onTagIdsChange([petaTag.id]);
      return;
    }
    if (nextIds.includes(petaTag.id)) {
      onTagIdsChange(nextIds.filter((id) => id !== petaTag.id));
    } else {
      onTagIdsChange([...nextIds, petaTag.id]);
    }
  }

  async function removeTag(tag: PetaTag) {
    const result = await IPC.modals.open(t("browser.removeTagDialog", [tag.name]), [
      t("commons.yes"),
      t("commons.no"),
    ]);
    if (result !== 0) {
      return;
    }
    await IPC.petaTags.update([{ type: "id", id: tag.id }], "remove");
    onTagIdsChange(selectedPetaTagIds.filter((id) => id !== tag.id));
  }

  async function renameTag(tag: PetaTag, value: string) {
    const trimmed = value.trim();
    if (trimmed === "" || trimmed === tag.name) {
      return;
    }
    if (hasDuplicateTagName(allTags, trimmed, tag.id)) {
      await IPC.modals.open(t("browser.tagAlreadyExistsDialog", [trimmed]), [t("commons.yes")]);
      return;
    }
    await IPC.petaTags.update(
      [
        {
          type: "petaTag",
          petaTag: {
            ...tag,
            name: trimmed,
          },
        },
      ],
      "update",
    );
  }

  async function removePartition(partition: PetaTagPartition) {
    const result = await IPC.modals.open(t("browser.removeTagPartitionDialog", [partition.name]), [
      t("commons.yes"),
      t("commons.no"),
    ]);
    if (result !== 0) {
      return;
    }
    await IPC.petaTagPartitions.update([partition], "remove");
  }

  async function renamePartition(partition: PetaTagPartition, value: string) {
    const trimmed = value.trim();
    if (trimmed === "" || trimmed === partition.name) {
      return;
    }
    await IPC.petaTagPartitions.update(
      [
        {
          ...partition,
          name: trimmed,
        },
      ],
      "update",
    );
  }

  return (
    <div className={rootStyle}>
      <div className={tagsTopStyle}>
        <button
          className={cx(tagCellStyle, selectedFilterType === "all" && selectedTagCellStyle)}
          onClick={() => onFilterTypeChange("all")}
          type="button">
          {t("browser.all")}({petaFilesCount})
        </button>
        <button
          className={cx(tagCellStyle, selectedFilterType === "untagged" && selectedTagCellStyle)}
          onClick={() => onFilterTypeChange("untagged")}
          type="button">
          {t("browser.untagged")}
        </button>
      </div>
      <div className={tagsStyle}>
        {entries.map((entry) =>
          entry.type === "tag" ? (
            <div
              className={cx(
                tagCellStyle,
                selectedFilterType === "tags" &&
                  selectedPetaTagIds.includes(entry.tag.id) &&
                  selectedTagCellStyle,
              )}
              key={entry.id}
              onClick={(event) => selectPetaTag(event, entry.tag)}>
              <div className={tagLabelStyle}>
                <VTextarea
                  clickToEdit
                  onValueChange={(value) => void renameTag(entry.tag, value)}
                  trim
                  type="single"
                  value={entry.tag.name}
                />
              </div>
              <button
                className={removeButtonStyle}
                onClick={(event) => {
                  event.stopPropagation();
                  void removeTag(entry.tag);
                }}
                tabIndex={-1}
                type="button">
                ×
              </button>
            </div>
          ) : (
            <div className={partitionStyle} key={entry.id}>
              <div className={partitionLineStyle} />
              <div className={partitionLabelStyle}>
                <VTextarea
                  clickToEdit
                  onValueChange={(value) => void renamePartition(entry.partition, value)}
                  trim
                  type="single"
                  value={entry.partition.name}
                />
              </div>
              <button
                className={removeButtonStyle}
                onClick={() => void removePartition(entry.partition)}
                tabIndex={-1}
                type="button">
                ×
              </button>
              <div className={partitionLineStyle} />
            </div>
          ),
        )}
      </div>
      <div className={tagAddStyle}>
        <div className={tagAddInnerStyle}>
          <div className={inputWrapperStyle}>
            <input
              className={textInputStyle}
              onChange={(event) => setNewTagName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void addTag(newTagName);
                }
              }}
              placeholder={textsStore.state.value.plus}
              value={newTagName}
            />
          </div>
          <button className={appButtonStyle} onClick={() => void addTag(newTagName)} type="button">
            {textsStore.state.value.plus}
          </button>
          <button className={appButtonStyle} onClick={() => void addPartition()} type="button">
            {t("browser.addTagPartition")}
          </button>
        </div>
      </div>
    </div>
  );
}
