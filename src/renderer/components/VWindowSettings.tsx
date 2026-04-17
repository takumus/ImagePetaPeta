import { useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";

import VTitleBar from "@/renderer/components/commons/titleBar/VTitleBar";
import VSettings from "@/renderer/components/settings/VSettings";
import { IPC } from "@/renderer/libs/ipc";
import { Keyboards } from "@/renderer/libs/keyboards";
import { useAppInfoStore } from "@/renderer/stores/appInfoStore/useAppInfoStore";
import { useWindowTitleStore } from "@/renderer/stores/windowTitleStore/useWindowTitleStore";

const rootStyle = css({
  position: "fixed",
  inset: 0,
  display: "flex",
  flexDirection: "column",
  backgroundColor: "surface",
  color: "text",
});

const contentStyle = css({
  flex: 1,
  overflow: "hidden",
  padding: "px2",
});

export default function VWindowSettings() {
  const { t } = useTranslation();
  const appInfoStore = useAppInfoStore();
  const { windowTitle } = useWindowTitleStore();
  const appName = appInfoStore.state.value.name;
  const title = useMemo(() => t("titles.settings"), [t]);

  useEffect(() => {
    windowTitle.value = `${title} - ${appName}`;
  }, [appName, title, windowTitle]);

  useEffect(() => {
    const keyboards = new Keyboards();
    keyboards.enabled = true;
    keyboards.keys("Escape").up(() => {
      void IPC.windows.close();
    });
    return () => {
      keyboards.destroy();
    };
  }, []);

  return (
    <div className={rootStyle}>
      <div>
        <VTitleBar title={title} />
      </div>
      <div className={contentStyle}>
        <VSettings />
      </div>
    </div>
  );
}
