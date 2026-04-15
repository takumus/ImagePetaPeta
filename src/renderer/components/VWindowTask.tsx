import { useEffect } from "react";
import { css } from "styled-system/css";

import VTitleBar from "@/renderer/components/commons/titleBar/VTitleBar";
import VTasks from "@/renderer/components/task/VTasks";
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
  display: "flex",
  flex: 1,
  flexDirection: "column",
  overflow: "hidden",
  padding: "px2",
});

export default function VWindowTask() {
  const { windowTitle } = useWindowTitleStore();

  useEffect(() => {
    windowTitle.value = "";
  }, [windowTitle]);

  return (
    <div className={rootStyle}>
      <div>
        <VTitleBar hideControls title="" />
      </div>
      <div className={contentStyle}>
        <VTasks />
      </div>
    </div>
  );
}
