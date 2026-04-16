import { useMemo } from "react";
import { css } from "styled-system/css";

import { PetaFile } from "@/commons/datas/petaFile";
import { secondsToHMS } from "@/commons/utils/secondsToHMS";

import VSelectableBox from "@/renderer/components/commons/utils/selectableBox/VSelectableBox";
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
  justifyContent: "space-between",
  width: "100%",
  height: "100%",
  padding: "px1",
  pointerEvents: "none",
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
  onDoubleClick,
  onContextMenu,
  onSelect,
  original,
  petaFile,
  selected,
  showNSFW,
}: {
  onDoubleClick: (petaFile: PetaFile) => void;
  onContextMenu: (event: React.MouseEvent, petaFile: PetaFile) => void;
  onSelect: (event: React.MouseEvent, petaFile: PetaFile) => void;
  original: boolean;
  petaFile: PetaFile;
  selected: boolean;
  showNSFW: boolean;
}) {
  const masked = petaFile.nsfw && !showNSFW;
  const placeholderColor = useMemo(() => {
    const petaColor = petaFile.metadata.palette[0];
    return petaColor ? `rgb(${petaColor.r}, ${petaColor.g}, ${petaColor.b})` : "#ffffff";
  }, [petaFile.metadata.palette]);
  const src =
    original && petaFile.metadata.type === "image"
      ? getFileURL(petaFile, "original")
      : getFileURL(petaFile, "thumbnail");

  return (
    <VSelectableBox
      inner={
        <div className={innerStyle}>
          <div>{petaFile.encrypted ? <div className={lockStyle}>lock</div> : null}</div>
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
        onClick={(event) => onSelect(event, petaFile)}
        onContextMenu={(event) => onContextMenu(event, petaFile)}
        onDoubleClick={() => onDoubleClick(petaFile)}
        type="button">
        <div className={backgroundStyle} style={{ backgroundImage: `url(${TransparentTexture})` }} />
        <div className={placeholderStyle} style={{ backgroundColor: placeholderColor }} />
        {masked ? (
          <div className={nsfwStyle} style={{ backgroundImage: `url(${NsfwTexture})` }} />
        ) : (
          <img alt={petaFile.name} className={imageStyle} draggable={false} loading="lazy" src={src} />
        )}
      </button>
    </VSelectableBox>
  );
}
