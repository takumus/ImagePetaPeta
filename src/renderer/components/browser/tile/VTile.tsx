import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";

import { PetaFile } from "@/commons/datas/petaFile";
import { PetaTag } from "@/commons/datas/petaTag";
import { secondsToHMS } from "@/commons/utils/secondsToHMS";

import VSelectableBox from "@/renderer/components/commons/utils/selectableBox/VSelectableBox";
import { IPC } from "@/renderer/libs/ipc";
import { getFileURL } from "@/renderer/utils/fileURL";

import NsfwTexture from "@/_public/images/textures/nsfw.png";
import TransparentTexture from "@/_public/images/textures/transparent.png";

const contentStyle = css({
  position: "relative",
  width: "100%",
  height: "100%",
});

const backgroundStyle = css({
  position: "absolute",
  inset: 0,
});

const placeholderStyle = css({
  position: "absolute",
  inset: 0,
  opacity: 0.4,
});

const imageStyle = css({
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "contain",
});

const videoStyle = css({
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "contain",
  pointerEvents: "none",
});

const nsfwStyle = css({
  position: "absolute",
  inset: 0,
  backgroundPosition: "center",
  backgroundRepeat: "repeat",
  backgroundSize: "32px 32px",
});

const innerStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "px1",
  width: "100%",
  height: "100%",
  padding: "px1",
  pointerEvents: "none",
});

const topStyle = css({
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  minHeight: "size2",
});

const tagsStyle = css({
  display: "flex",
  flexWrap: "wrap",
  gap: "4px",
  alignContent: "flex-start",
  overflow: "hidden",
});

const tagStyle = css({
  display: "inline-flex",
  maxWidth: "100%",
  paddingX: "px1",
  paddingY: "1px",
  borderRadius: "window",
  backgroundColor: "rgba(0,0,0,0.55)",
  fontSize: "size0",
  lineHeight: "size1",
  textShadow: "0 1px 2px rgba(0,0,0,0.7)",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
});

const spacerStyle = css({
  flex: 1,
  minHeight: 0,
});

const nameStyle = css({
  maxWidth: "100%",
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  textShadow: "0 1px 2px rgba(0,0,0,0.7)",
});

const badgeStyle = css({
  display: "inline-block",
  alignSelf: "flex-end",
  paddingX: "px1",
  paddingY: "px0",
  borderRadius: "window",
  backgroundColor: "surface",
  fontSize: "size0",
  lineHeight: "size1",
});

const lockStyle = css({
  display: "inline-block",
  alignSelf: "flex-start",
  paddingX: "px1",
  paddingY: "px0",
  borderRadius: "window",
  backgroundColor: "surface",
  fontSize: "size0",
  lineHeight: "size1",
});

export default function VTile({
  allTags,
  onDoubleClick,
  onContextMenu,
  onDragStart,
  onSelect,
  original,
  petaFile,
  selected,
  showNSFW,
  showTagsOnTile,
  tagsRevision,
}: {
  allTags: PetaTag[];
  onDoubleClick: (petaFile: PetaFile) => void;
  onContextMenu: (event: React.MouseEvent, petaFile: PetaFile) => void;
  onDragStart: (event: React.DragEvent, petaFile: PetaFile) => void;
  onSelect: (event: React.MouseEvent, petaFile: PetaFile) => void;
  original: boolean;
  petaFile: PetaFile;
  selected: boolean;
  showNSFW: boolean;
  showTagsOnTile: boolean;
  tagsRevision: number;
}) {
  const { t } = useTranslation();
  const masked = petaFile.nsfw && !showNSFW;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [myPetaTagIds, setMyPetaTagIds] = useState<string[]>([]);
  const [loadingTags, setLoadingTags] = useState(false);
  const [showVideoPreview, setShowVideoPreview] = useState(false);
  const placeholderColor = useMemo(() => {
    const petaColor = petaFile.metadata.palette[0];
    return petaColor ? `rgb(${petaColor.r}, ${petaColor.g}, ${petaColor.b})` : "#ffffff";
  }, [petaFile.metadata.palette]);
  const myPetaTags = useMemo(() => {
    return allTags.filter((petaTag) => myPetaTagIds.includes(petaTag.id)).reverse();
  }, [allTags, myPetaTagIds]);
  const src =
    original && petaFile.metadata.type === "image"
      ? getFileURL(petaFile, "original")
      : getFileURL(petaFile, "thumbnail");

  useEffect(() => {
    let active = true;

    if (!showTagsOnTile) {
      setMyPetaTagIds([]);
      setLoadingTags(false);
      return () => {
        active = false;
      };
    }

    setLoadingTags(true);
    void IPC.petaFilePetaTags.getPetaTagIdsByPetaFileIds([petaFile.id]).then((ids) => {
      if (!active) {
        return;
      }
      setMyPetaTagIds(ids);
      setLoadingTags(false);
    });

    return () => {
      active = false;
    };
  }, [petaFile.id, showTagsOnTile, tagsRevision]);

  useEffect(() => {
    if (petaFile.metadata.type !== "video") {
      return;
    }
    if (masked) {
      setShowVideoPreview(false);
    }
  }, [masked, petaFile.metadata.type]);

  function seekVideo(event: React.PointerEvent<HTMLButtonElement>) {
    if (petaFile.metadata.type !== "video" || masked) {
      return;
    }
    const video = videoRef.current;
    if (!video || video.readyState < 2 || !Number.isFinite(video.duration) || video.duration <= 0) {
      return;
    }
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width <= 0) {
      return;
    }
    const progress = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
    video.currentTime = progress * video.duration;
  }

  return (
    <VSelectableBox
      inner={
        <div className={innerStyle}>
          <div className={topStyle}>{petaFile.encrypted ? <div className={lockStyle}>lock</div> : <div />}</div>
          {showTagsOnTile ? (
            <div className={tagsStyle}>
              {myPetaTags.map((petaTag) => (
                <div className={tagStyle} key={petaTag.id}>
                  {petaTag.name}
                </div>
              ))}
              {myPetaTags.length === 0 && !loadingTags ? (
                <div className={tagStyle}>{t("browser.untagged")}</div>
              ) : null}
            </div>
          ) : null}
          <div className={spacerStyle} />
          <div className={nameStyle}>{petaFile.name}</div>
          {petaFile.metadata.type === "video" ? (
            <div className={badgeStyle}>{secondsToHMS(petaFile.metadata.duration)}</div>
          ) : null}
        </div>
      }
      selected={selected}
      zoom>
      <button
        className={contentStyle}
        draggable
        onClick={(event) => onSelect(event, petaFile)}
        onContextMenu={(event) => onContextMenu(event, petaFile)}
        onDragStart={(event) => onDragStart(event, petaFile)}
        onDoubleClick={() => onDoubleClick(petaFile)}
        onPointerEnter={() => {
          if (petaFile.metadata.type === "video" && !masked) {
            setShowVideoPreview(true);
          }
        }}
        onPointerLeave={() => setShowVideoPreview(false)}
        onPointerMove={seekVideo}
        type="button">
        <div className={backgroundStyle} style={{ backgroundImage: `url(${TransparentTexture})` }} />
        <div className={placeholderStyle} style={{ backgroundColor: placeholderColor }} />
        {masked ? (
          <div className={nsfwStyle} style={{ backgroundImage: `url(${NsfwTexture})` }} />
        ) : (
          <>
            <img alt={petaFile.name} className={imageStyle} draggable={false} loading="lazy" src={src} />
            {petaFile.metadata.type === "video" && showVideoPreview ? (
              <video
                className={videoStyle}
                draggable={false}
                muted
                playsInline
                preload="metadata"
                ref={videoRef}
                src={getFileURL(petaFile, "original")}
              />
            ) : null}
          </>
        )}
      </button>
    </VSelectableBox>
  );
}
