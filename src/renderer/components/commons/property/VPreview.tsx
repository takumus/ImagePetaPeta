import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";

import { PetaFile } from "@/commons/datas/petaFile";
import { BROWSER_MAX_PREVIEW_COUNT } from "@/commons/defines";

import { appButtonStyle } from "@/renderer/components/shared/controlStyles";
import { IPC } from "@/renderer/libs/ipc";
import { getFileURL } from "@/renderer/utils/fileURL";

import NsfwTexture from "@/_public/images/textures/nsfw.png";
import TransparentTexture from "@/_public/images/textures/transparent.png";

const rootStyle = css({
  display: "flex",
  flexDirection: "column",
  flexShrink: 0,
  width: "100%",
});

const previewsStyle = css({
  position: "relative",
  width: "100%",
  height: "150px",
  overflow: "hidden",
});

const previewItemStyle = css({
  position: "absolute",
  top: "50%",
  overflow: "hidden",
  borderRadius: "window",
  backgroundPosition: "center",
  backgroundRepeat: "repeat",
  backgroundSize: "16px 16px",
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.25)",
  transform: "translateY(-50%)",
});

const previewImageStyle = css({
  display: "block",
  width: "100%",
  height: "100%",
  objectFit: "contain",
});

const nsfwStyle = css({
  width: "100%",
  height: "100%",
  backgroundPosition: "center",
  backgroundRepeat: "repeat",
  backgroundSize: "32px 32px",
});

const countStyle = css({
  marginY: "px1",
  textAlign: "center",
});

const buttonsStyle = css({
  display: "block",
  textAlign: "center",
});

export default function VPreview({
  onClearSelectionAll,
  petaFiles,
  showNSFW,
}: {
  onClearSelectionAll: () => void;
  petaFiles: PetaFile[];
  showNSFW: boolean;
}) {
  const { t } = useTranslation();

  const previewFiles = useMemo(
    () => petaFiles.slice(Math.max(0, petaFiles.length - BROWSER_MAX_PREVIEW_COUNT)),
    [petaFiles],
  );

  async function openDetails() {
    const petaFile = petaFiles[0];
    if (petaFile === undefined) {
      return;
    }
    await IPC.details.set(petaFile.id);
    await IPC.windows.open("details");
  }

  return (
    <div className={rootStyle}>
      <div className={previewsStyle}>
        {previewFiles.map((petaFile, index) => {
          const width = previewFiles.length === 1 ? 180 : 120;
          const height = previewFiles.length === 1 ? 140 : 100;
          const left =
            previewFiles.length === 1
              ? "50%"
              : `${10 + (index / Math.max(previewFiles.length - 1, 1)) * 55}%`;
          const masked = petaFile.nsfw && !showNSFW;
          return (
            <div
              className={previewItemStyle}
              key={petaFile.id}
              style={{
                left,
                width: `${width}px`,
                height: `${height}px`,
                backgroundImage: `url(${TransparentTexture})`,
                transform:
                  previewFiles.length === 1
                    ? "translate(-50%, -50%)"
                    : `translate(-50%, -50%) rotate(${(index - previewFiles.length / 2) * 2}deg)`,
              }}>
              {masked ? (
                <div className={nsfwStyle} style={{ backgroundImage: `url(${NsfwTexture})` }} />
              ) : (
                <img
                  alt={petaFile.name}
                  className={previewImageStyle}
                  draggable={false}
                  src={getFileURL(petaFile, "thumbnail")}
                />
              )}
            </div>
          );
        })}
      </div>
      <p className={countStyle}>{t("browser.property.selectedImage", [petaFiles.length])}</p>
      {petaFiles.length > 0 ? (
        <div className={buttonsStyle}>
          <button className={appButtonStyle} onClick={onClearSelectionAll} type="button">
            {t("browser.property.clearSelectionButton")}
          </button>
          {petaFiles.length === 1 ? (
            <button className={appButtonStyle} onClick={() => void openDetails()} type="button">
              {t("browser.property.openDetailsButton")}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
