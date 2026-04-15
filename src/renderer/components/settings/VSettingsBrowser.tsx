import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";

import { Settings } from "@/commons/datas/settings";

import VCheckbox from "@/renderer/components/commons/utils/checkbox/VCheckbox";
import { appButtonStyle } from "@/renderer/components/shared/controlStyles";
import { IPC } from "@/renderer/libs/ipc";

const rootStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "px1",
});

const labelStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "px1",
});

const descriptionStyle = css({
  marginBottom: "px2",
  color: "text",
  opacity: 0.72,
});

export default function VSettingsBrowser({
  onSettingsChange,
  settings,
}: {
  onSettingsChange: (settings: Settings) => void;
  settings: Settings;
}) {
  const { t } = useTranslation();
  const [regenerateCompleted, setRegenerateCompleted] = useState(true);
  const [regenerateDone, setRegenerateDone] = useState(0);
  const [regenerateCount, setRegenerateCount] = useState(0);

  useEffect(() => {
    const progressSubscription = IPC.petaFiles.on("regenerateProgress", (_event, done, count) => {
      setRegenerateDone(done);
      setRegenerateCount(count);
      setRegenerateCompleted(false);
    });
    const beginSubscription = IPC.petaFiles.on("regenerateBegin", () => {
      setRegenerateCompleted(false);
    });
    const completeSubscription = IPC.petaFiles.on("regenerateComplete", () => {
      setRegenerateCompleted(true);
    });

    return () => {
      progressSubscription.off();
      beginSubscription.off();
      completeSubscription.off();
    };
  }, []);

  async function regeneratePetaFiles() {
    const result = await IPC.modals.open(t("settings.regeneratePetaFilesConfirm"), [
      t("commons.yes"),
      t("commons.no"),
    ]);
    if (result === 0) {
      await IPC.petaFiles.regenerate();
    }
  }

  return (
    <div className={rootStyle}>
      {regenerateCompleted ? (
        <div>
          <button className={appButtonStyle} onClick={() => void regeneratePetaFiles()} type="button">
            {t("settings.regeneratePetaFilesButton")}
          </button>
        </div>
      ) : (
        <label className={labelStyle}>
          {regenerateDone}/{regenerateCount}
        </label>
      )}
      <p className={descriptionStyle}>{t("settings.regeneratePetaFilesDescriptions")}</p>
      <label className={labelStyle}>
        <VCheckbox
          onValueChange={(loadTilesInOriginal) =>
            onSettingsChange({
              ...settings,
              loadTilesInOriginal,
            })
          }
          value={settings.loadTilesInOriginal}
        />
        {t("settings.loadTilesInOriginal")}
      </label>
      <p className={descriptionStyle}>{t("settings.loadTilesInOriginalDescriptions")}</p>
      <label className={labelStyle}>
        <VCheckbox
          onValueChange={(showTagsOnTile) =>
            onSettingsChange({
              ...settings,
              showTagsOnTile,
            })
          }
          value={settings.showTagsOnTile}
        />
        {t("settings.showTagsOnTile")}
      </label>
      <p className={descriptionStyle}>{t("settings.showTagsOnTileDescriptions")}</p>
    </div>
  );
}
