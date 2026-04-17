import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";

import { Settings } from "@/commons/datas/settings";

import VTextarea from "@/renderer/components/commons/utils/textarea/VTextarea";
import { appButtonStyle } from "@/renderer/components/shared/controlStyles";
import { IPC } from "@/renderer/libs/ipc";

const rootStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "px1",
});

const descriptionStyle = css({
  marginBottom: "px2",
  color: "text",
  opacity: 0.72,
});

export default function VSettingsDatas({
  settings,
}: {
  onSettingsChange: (settings: Settings) => void;
  settings: Settings;
}) {
  const { t } = useTranslation();
  const [tempPetaFileDirectory, setTempPetaFileDirectory] = useState("");

  useEffect(() => {
    setTempPetaFileDirectory(settings.petaFileDirectory.path);
  }, [settings.petaFileDirectory.path]);

  async function changePetaFileDirectory() {
    const result = await IPC.modals.open(
      t("settings.changePetaFileDirectoryDialog", [tempPetaFileDirectory]),
      [t("commons.yes"), t("commons.no")],
    );
    if (result === 0) {
      const changed = await IPC.common.changePetaFileDirectory(tempPetaFileDirectory);
      if (!changed) {
        await IPC.modals.open(
          t("settings.changePetaFileDirectoryErrorDialog", [tempPetaFileDirectory]),
          [t("commons.yes")],
        );
        setTempPetaFileDirectory(settings.petaFileDirectory.path);
      }
    } else {
      setTempPetaFileDirectory(settings.petaFileDirectory.path);
    }
  }

  async function browsePetaFileDirectory() {
    const path = await IPC.common.browsePetaFileDirectory();
    if (path) {
      setTempPetaFileDirectory(path);
    }
  }

  return (
    <div className={rootStyle}>
      <div>
        <button className={appButtonStyle} onClick={() => void browsePetaFileDirectory()} type="button">
          {t("settings.browsePetaFileDirectoryButton")}
        </button>
      </div>
      <VTextarea
        clickToEdit
        onValueChange={setTempPetaFileDirectory}
        outerStyle={{ width: "100%" }}
        textAreaStyle={{ width: "100%" }}
        trim
        type="single"
        value={tempPetaFileDirectory}
      />
      <div>
        <button
          className={appButtonStyle}
          disabled={tempPetaFileDirectory === ""}
          onClick={() => void changePetaFileDirectory()}
          type="button">
          {t("settings.changePetaFileDirectoryButton")}
        </button>
      </div>
      <p className={descriptionStyle}>{t("settings.changePetaFileDirectoryDescriptions")}</p>
    </div>
  );
}
