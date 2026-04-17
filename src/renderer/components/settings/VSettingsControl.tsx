import { ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";

import { Settings } from "@/commons/datas/settings";

import { textInputStyle } from "@/renderer/components/shared/controlStyles";

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

const inputStyle = css({
  width: "120px",
});

function parseNumber(event: ChangeEvent<HTMLInputElement>, fallback: number) {
  const next = Number(event.target.value);
  return Number.isNaN(next) ? fallback : next;
}

export default function VSettingsControl({
  onSettingsChange,
  settings,
}: {
  onSettingsChange: (settings: Settings) => void;
  settings: Settings;
}) {
  const { t } = useTranslation();

  return (
    <div className={rootStyle}>
      <label className={labelStyle}>
        {t("settings.zoomSensitivity")}:
        <input
          className={`${textInputStyle} ${inputStyle}`}
          onChange={(event) =>
            onSettingsChange({
              ...settings,
              zoomSensitivity: parseNumber(event, settings.zoomSensitivity),
            })
          }
          type="number"
          value={settings.zoomSensitivity}
        />
      </label>
      <p className={descriptionStyle}>{t("settings.zoomSensitivityDescriptions")}</p>
      <label className={labelStyle}>
        {t("settings.moveSensitivity")}:
        <input
          className={`${textInputStyle} ${inputStyle}`}
          onChange={(event) =>
            onSettingsChange({
              ...settings,
              moveSensitivity: parseNumber(event, settings.moveSensitivity),
            })
          }
          type="number"
          value={settings.moveSensitivity}
        />
      </label>
      <p className={descriptionStyle}>{t("settings.moveSensitivityDescriptions")}</p>
    </div>
  );
}
