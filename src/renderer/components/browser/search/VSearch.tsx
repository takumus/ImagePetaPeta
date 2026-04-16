import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";

import { PetaTag } from "@/commons/datas/petaTag";

import { FilterType } from "@/renderer/components/browser/filterType";
import { VTextareaHandle } from "@/renderer/components/commons/utils/textarea/VTextarea";
import VTextarea from "@/renderer/components/commons/utils/textarea/VTextarea";
import { textInputStyle } from "@/renderer/components/shared/controlStyles";
import { useTextsStore } from "@/renderer/stores/textsStore/useTextsStore";

const rootStyle = css({
  display: "block",
  width: "100%",
  textAlign: "center",
});

const searchBoxStyle = css({
  display: "flex",
  flexWrap: "wrap",
  justifyContent: "center",
  width: "100%",
  height: "100%",
  paddingTop: "px1",
  paddingRight: "px1",
  borderWidth: "window",
  borderStyle: "solid",
  borderColor: "border",
  borderRadius: "window",
  textAlign: "left",
  wordBreak: "break-word",
});

const tagStyle = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "px1",
  marginBottom: "px1",
  marginLeft: "px1",
  borderRadius: "window",
  backgroundColor: "surfaceMuted",
  padding: "px1",
});

const lastStyle = css({
  flex: "1 1 64px",
  marginBottom: "px1",
  marginLeft: "px1",
  backgroundColor: "transparent",
});

const removeButtonStyle = css({
  border: "none",
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
  padding: 0,
});

export default function VSearch({
  allTags,
  onFilterTypeChange,
  onTagIdsChange,
  selectedFilterType,
  selectedPetaTagIds,
}: {
  allTags: PetaTag[];
  onFilterTypeChange: (selectedFilterType: FilterType) => void;
  onTagIdsChange: (value: string[]) => void;
  selectedFilterType: FilterType;
  selectedPetaTagIds: string[];
}) {
  const { t } = useTranslation();
  const textsStore = useTextsStore();
  const searchInputRef = useRef<VTextareaHandle>(null);
  const [inputValue, setInputValue] = useState("");

  const selectedPetaTags = useMemo(
    () =>
      selectedFilterType !== "tags"
        ? []
        : selectedPetaTagIds
            .map((id) => allTags.find((tag) => tag.id === id))
            .filter((tag): tag is PetaTag => tag !== undefined),
    [allTags, selectedFilterType, selectedPetaTagIds],
  );

  const complementItems = useMemo(
    () =>
      (selectedFilterType !== "tags"
        ? allTags
        : allTags.filter((tag) => !selectedPetaTagIds.includes(tag.id))).map((tag) => tag.name),
    [allTags, selectedFilterType, selectedPetaTagIds],
  );

  function editSearchTag(tag: PetaTag, value: string) {
    const index = selectedPetaTagIds.findIndex((id) => id === tag.id);
    const nextIds = [...selectedPetaTagIds];
    nextIds.splice(index, 1);
    if (value !== "") {
      const petaTag = allTags.find((candidate) => candidate.name === value);
      if (petaTag && !nextIds.includes(petaTag.id)) {
        nextIds.splice(index, 0, petaTag.id);
      }
    }
    onTagIdsChange(nextIds);
  }

  function removeLastPetaTag() {
    if (selectedFilterType !== "tags") {
      onFilterTypeChange("tags");
    }
    const last = selectedPetaTagIds[selectedPetaTagIds.length - 1];
    if (!last) {
      return;
    }
    const petaTag = allTags.find((tag) => tag.id === last);
    if (petaTag !== undefined) {
      editSearchTag(petaTag, "");
    }
  }

  function addSelectedTag(tagName: string) {
    if (selectedFilterType !== "tags") {
      onFilterTypeChange("tags");
    }
    const petaTag = allTags.find((tag) => tag.name === tagName);
    if (petaTag && !selectedPetaTagIds.includes(petaTag.id)) {
      onTagIdsChange([...selectedPetaTagIds, petaTag.id]);
      setInputValue("");
    }
    setTimeout(() => {
      searchInputRef.current?.edit();
    });
  }

  return (
    <div className={rootStyle}>
      <div className={searchBoxStyle}>
        {selectedPetaTags.map((tag) => (
          <div className={tagStyle} key={tag.id}>
            <VTextarea
              allowEmpty
              blurToReset
              clickToEdit
              complements={complementItems}
              onDeleteOfEmpty={() => editSearchTag(tag, "")}
              onValueChange={(value) => editSearchTag(tag, value)}
              trim
              type="single"
              value={tag.name}
            />
            <button className={removeButtonStyle} onClick={() => editSearchTag(tag, "")} type="button">
              x
            </button>
          </div>
        ))}
        {selectedFilterType === "all" ? (
          <div className={tagStyle}>
            <VTextarea readOnly trim type="single" value={t("browser.all")} />
          </div>
        ) : null}
        {selectedFilterType === "untagged" ? (
          <div className={tagStyle}>
            <VTextarea readOnly trim type="single" value={t("browser.untagged")} />
          </div>
        ) : null}
        <div className={lastStyle}>
          <VTextarea
            blurToReset
            clickToEdit
            complements={complementItems}
            look={textsStore.state.value.plus}
            noOutline
            onDeleteOfEmpty={removeLastPetaTag}
            onValueChange={addSelectedTag}
            outerStyle={{ width: "100%" }}
            ref={searchInputRef}
            textAreaStyle={{ width: "100%" }}
            trim
            type="single"
            value={inputValue}
          />
          <input className={textInputStyle} list="browser-search-tags" onChange={() => undefined} style={{ display: "none" }} />
          <datalist id="browser-search-tags">
            {complementItems.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </div>
      </div>
    </div>
  );
}
