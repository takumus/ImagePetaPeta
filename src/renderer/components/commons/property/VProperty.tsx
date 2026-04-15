import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";

import { PetaFile } from "@/commons/datas/petaFile";
import { PetaTag } from "@/commons/datas/petaTag";

import VCheckbox from "@/renderer/components/commons/utils/checkbox/VCheckbox";
import VTextarea from "@/renderer/components/commons/utils/textarea/VTextarea";
import { appButtonStyle, textInputStyle } from "@/renderer/components/shared/controlStyles";
import { IPC } from "@/renderer/libs/ipc";

const rootStyle = css({
  display: "flex",
  flexDirection: "column",
  width: "100%",
  height: "100%",
  overflowY: "auto",
});

const sectionStyle = css({
  display: "flex",
  flexDirection: "column",
  marginBottom: "px2",
});

const headingStyle = css({
  margin: "px2",
  fontWeight: "bold",
  textDecoration: "underline",
});

const rowStyle = css({
  display: "flex",
  gap: "px1",
  marginY: "px1",
});

const nameStyle = css({
  display: "block",
  width: "35%",
});

const valueStyle = css({
  display: "block",
  flex: 1,
});

const tagsStyle = css({
  display: "flex",
  flexWrap: "wrap",
  gap: "px1",
});

const tagStyle = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "px1",
  borderRadius: "window",
  backgroundColor: "surfaceMuted",
  paddingX: "px1",
  paddingY: "px0",
});

const tagInputRowStyle = css({
  display: "flex",
  gap: "px1",
  marginTop: "px1",
});

const noteStyle = {
  width: "100%",
  minHeight: "96px",
  overflowY: "auto",
} as const;

function formatDate(value: number) {
  return new Date(value).toLocaleString("ja-JP");
}

export default function VProperty({
  onPetaFileChange,
  petaFile,
}: {
  onPetaFileChange: (petaFile: PetaFile) => void;
  petaFile?: PetaFile;
}) {
  const { t } = useTranslation();
  const [allTags, setAllTags] = useState<PetaTag[]>([]);
  const [currentTags, setCurrentTags] = useState<PetaTag[]>([]);
  const [newTagName, setNewTagName] = useState("");

  useEffect(() => {
    let mounted = true;

    const refresh = async () => {
      if (petaFile === undefined) {
        if (mounted) {
          setAllTags([]);
          setCurrentTags([]);
        }
        return;
      }
      const [tags, tagIds] = await Promise.all([
        IPC.petaTags.getAll(),
        IPC.petaFilePetaTags.getPetaTagIdsByPetaFileIds([petaFile.id]),
      ]);
      if (!mounted) {
        return;
      }
      setAllTags(tags);
      setCurrentTags(tags.filter((tag) => tagIds.includes(tag.id)));
    };

    void refresh();
    const tagsSubscription = IPC.petaTags.on("update", () => {
      void refresh();
    });
    const petaFilesSubscription = IPC.petaFiles.on("update", () => {
      void refresh();
    });

    return () => {
      mounted = false;
      tagsSubscription.off();
      petaFilesSubscription.off();
    };
  }, [petaFile]);

  const complementItems = useMemo(
    () =>
      allTags
        .filter((tag) => !currentTags.some((currentTag) => currentTag.id === tag.id))
        .map((tag) => tag.name),
    [allTags, currentTags],
  );

  async function updatePetaFile(nextPetaFile: PetaFile) {
    const success = await IPC.petaFiles.update([nextPetaFile], "update");
    if (success) {
      onPetaFileChange(nextPetaFile);
    }
  }

  async function addTag() {
    const name = newTagName.trim();
    if (petaFile === undefined || name === "") {
      return;
    }
    await IPC.petaFilePetaTags.update([petaFile.id], [{ type: "name", name }], "insert");
    setNewTagName("");
  }

  async function removeTag(tag: PetaTag) {
    if (petaFile === undefined) {
      return;
    }
    await IPC.petaFilePetaTags.update([petaFile.id], [{ type: "id", id: tag.id }], "remove");
  }

  if (petaFile === undefined) {
    return <div className={rootStyle} />;
  }

  return (
    <div className={rootStyle}>
      <div className={sectionStyle}>
        <p className={headingStyle}>{t("browser.property.infos.label")}</p>
        <div className={rowStyle}>
          <div className={nameStyle}>{t("browser.property.infos.name")}:</div>
          <div className={valueStyle}>
            <VTextarea
              allowEmpty
              clickToEdit
              onValueChange={(name) => void updatePetaFile({ ...petaFile, name })}
              outerStyle={{ width: "100%" }}
              textAreaStyle={{ width: "100%" }}
              type="single"
              value={petaFile.name}
            />
          </div>
        </div>
        <div className={rowStyle}>
          <div className={nameStyle}>{t("browser.property.infos.note")}:</div>
          <div className={valueStyle}>
            <VTextarea
              allowEmpty
              clickToEdit
              onValueChange={(note) => void updatePetaFile({ ...petaFile, note })}
              outerStyle={{ width: "100%" }}
              textAreaStyle={noteStyle}
              type="multi"
              value={petaFile.note}
            />
          </div>
        </div>
        <div className={rowStyle}>
          <div className={nameStyle}>{t("browser.property.infos.size")}:</div>
          <div className={valueStyle}>
            {petaFile.metadata.width}px, {petaFile.metadata.height}px
          </div>
        </div>
        <div className={rowStyle}>
          <div className={nameStyle}>{t("browser.property.infos.mimeType")}:</div>
          <div className={valueStyle}>{petaFile.metadata.mimeType}</div>
        </div>
        <div className={rowStyle}>
          <div className={nameStyle}>{t("browser.property.infos.addDate")}:</div>
          <div className={valueStyle}>{formatDate(petaFile.addDate)}</div>
        </div>
      </div>

      <div className={sectionStyle}>
        <p className={headingStyle}>{t("browser.property.tags")}</p>
        <div className={tagsStyle}>
          {currentTags.map((tag) => (
            <div className={tagStyle} key={tag.id}>
              <span>{tag.name}</span>
              <button className={appButtonStyle} onClick={() => void removeTag(tag)} type="button">
                x
              </button>
            </div>
          ))}
        </div>
        <div className={tagInputRowStyle}>
          <input
            className={textInputStyle}
            list="details-tag-complements"
            onChange={(event) => setNewTagName(event.target.value)}
            value={newTagName}
          />
          <datalist id="details-tag-complements">
            {complementItems.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
          <button className={appButtonStyle} onClick={() => void addTag()} type="button">
            {t("browser.property.clickToAddTag")}
          </button>
        </div>
      </div>

      <div className={sectionStyle}>
        <p className={headingStyle}>{t("browser.property.nsfw.label")}</p>
        <label>
          <VCheckbox
            onValueChange={(nsfw) => void updatePetaFile({ ...petaFile, nsfw })}
            value={petaFile.nsfw}
          />
        </label>
      </div>
    </div>
  );
}
