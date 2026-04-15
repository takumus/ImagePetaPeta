import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";

import { WEBHOOK_PORT } from "@/commons/defines";
import { Settings } from "@/commons/datas/settings";

import VCheckbox from "@/renderer/components/commons/utils/checkbox/VCheckbox";

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

export default function VSettingsWeb({
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
        <VCheckbox onValueChange={(web) => onSettingsChange({ ...settings, web })} value={settings.web} />
        {t("settings.web")}
      </label>
      <p className={descriptionStyle}>{t("settings.webDescriptions", [WEBHOOK_PORT])}</p>
    </div>
  );
}
