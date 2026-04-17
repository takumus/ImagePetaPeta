import { ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";

import { Settings } from "@/commons/datas/settings";

import VCheckbox from "@/renderer/components/commons/utils/checkbox/VCheckbox";
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

export default function VSettingsOthers({
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
        <VCheckbox
          onValueChange={(alwaysShowNSFW) => onSettingsChange({ ...settings, alwaysShowNSFW })}
          value={settings.alwaysShowNSFW}
        />
        {t("settings.alwaysShowNSFW")}
      </label>
      <p className={descriptionStyle}>{t("settings.alwaysShowNSFWDescriptions")}</p>
      <label className={labelStyle}>
        <VCheckbox onValueChange={(showFPS) => onSettingsChange({ ...settings, showFPS })} value={settings.showFPS} />
        {t("settings.showFPS")}
      </label>
      <p className={descriptionStyle}>{t("settings.showFPSDescriptions")}</p>
      <label className={labelStyle}>
        {t("settings.gamutMapSampling")}:
        <input
          className={`${textInputStyle} ${inputStyle}`}
          max={65536}
          min={100}
          onChange={(event) =>
            onSettingsChange({
              ...settings,
              gamutMapSampling: parseNumber(event, settings.gamutMapSampling),
            })
          }
          type="number"
          value={settings.gamutMapSampling}
        />
      </label>
      <p className={descriptionStyle}>{t("settings.gamutMapSamplingDescriptions")}</p>
      <label className={labelStyle}>
        <VCheckbox
          onValueChange={(disableAcceleratedVideoDecode) =>
            onSettingsChange({
              ...settings,
              disableAcceleratedVideoDecode,
            })
          }
          value={settings.disableAcceleratedVideoDecode}
        />
        {t("settings.disableAcceleratedVideoDecode")}
      </label>
      <p className={descriptionStyle}>{t("settings.disableAcceleratedVideoDecodeDescriptions")}</p>
    </div>
  );
}
