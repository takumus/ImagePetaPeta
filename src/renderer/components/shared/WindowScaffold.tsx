import { PropsWithChildren, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";

import VTitleBar from "@/renderer/components/commons/titleBar/VTitleBar";
import VContextMenu from "@/renderer/components/commons/utils/contextMenu/VContextMenu";
import { useAppInfoStore } from "@/renderer/stores/appInfoStore/useAppInfoStore";
import { useWindowNameStore } from "@/renderer/stores/windowNameStore/useWindowNameStore";
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

const placeholderStyle = css({
  display: "grid",
  height: "100%",
  placeItems: "center",
  color: "text",
  opacity: 0.56,
  fontSize: "size1",
});

export function WindowScaffold({
  hideControls = false,
  children,
}: PropsWithChildren<{
  hideControls?: boolean;
}>) {
  const { t } = useTranslation();
  const appInfoStore = useAppInfoStore();
  const windowNameStore = useWindowNameStore();
  const windowTitleStore = useWindowTitleStore();
  const title = t(`titles.${windowNameStore.windowName.value}`);
  const appName = appInfoStore.state.value.name;

  useEffect(() => {
    windowTitleStore.windowTitle.value = `${title} - ${appName}`;
  }, [appName, title, windowTitleStore]);

  return (
    <div className={rootStyle}>
      <div>
        <VTitleBar hideControls={hideControls} title={title} />
      </div>
      <div className={contentStyle}>
        {children ?? <div className={placeholderStyle}>{title}</div>}
      </div>
      <VContextMenu />
    </div>
  );
}
