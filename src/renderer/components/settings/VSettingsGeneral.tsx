import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";

import VCheckbox from "@/renderer/components/commons/utils/checkbox/VCheckbox";
import VSelect from "@/renderer/components/commons/utils/select/VSelect";
import { Settings } from "@/commons/datas/settings";

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

export default function VSettingsGeneral({
  onSettingsChange,
  settings,
}: {
  onSettingsChange: (settings: Settings) => void;
  settings: Settings;
}) {
  const { t } = useTranslation();

  const showItems = useMemo(
    () => [
      { value: "board", label: t("settings.showBoard") },
      { value: "browser", label: t("settings.showBrowser") },
      { value: "both", label: t("settings.showBoth") },
    ],
    [t],
  );

  return (
    <div className={rootStyle}>
      <label className={labelStyle}>
        <VCheckbox
          disabled={settings.autoDarkMode}
          onValueChange={(darkMode) => onSettingsChange({ ...settings, darkMode })}
          value={settings.darkMode}
        />
        {t("settings.darkMode")}
      </label>
      <label className={labelStyle}>
        <VCheckbox
          onValueChange={(autoDarkMode) => onSettingsChange({ ...settings, autoDarkMode })}
          value={settings.autoDarkMode}
        />
        {t("settings.autoDarkMode")}
      </label>
      <p className={descriptionStyle}>{t("settings.autoDarkModeDescriptions")}</p>
      <label className={labelStyle}>
        <VSelect
          items={showItems}
          onValueChange={(show) => onSettingsChange({ ...settings, show: show as Settings["show"] })}
          value={settings.show}
        />
        {t("settings.show")}
      </label>
      <p className={descriptionStyle}>{t("settings.showDescriptions")}</p>
    </div>
  );
}
