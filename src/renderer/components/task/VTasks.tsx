import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";

import { TaskStatusWithIndex } from "@/commons/datas/task";

import VTask from "@/renderer/components/task/VTask";
import { appButtonStyle } from "@/renderer/components/shared/controlStyles";
import { IPC } from "@/renderer/libs/ipc";
import * as Cursor from "@/renderer/utils/cursor";

const rootStyle = css({
  display: "flex",
  height: "100%",
  flexDirection: "column",
  textAlign: "center",
});

const tasksStyle = css({
  flex: 1,
  width: "100%",
  maxHeight: "512px",
  overflowX: "hidden",
  overflowY: "auto",
  padding: "px1",
});

const actionStyle = css({
  display: "flex",
  justifyContent: "center",
});

export default function VTasks() {
  const { t } = useTranslation();
  const [taskStatuses, setTaskStatuses] = useState<{ [key: string]: TaskStatusWithIndex }>({});

  useEffect(() => {
    let mounted = true;
    void IPC.tasks.getStatus().then((statuses) => {
      if (mounted) {
        setTaskStatuses(statuses);
      }
    });

    const subscription = IPC.tasks.on("status", (_event, tasks) => {
      setTaskStatuses(tasks);
      if (Object.values(tasks).some((task) => task.status !== "complete" && task.status !== "failed")) {
        Cursor.setCursor("wait");
      } else {
        Cursor.setDefaultCursor();
      }
    });

    return () => {
      mounted = false;
      subscription.off();
      Cursor.setDefaultCursor();
    };
  }, []);

  const taskStatusArray = useMemo(() => {
    return Object.keys(taskStatuses)
      .reverse()
      .map((id) => ({
        status: { id, ...taskStatuses[id] },
      }));
  }, [taskStatuses]);

  const closable =
    taskStatusArray.length > 0 &&
    Object.values(taskStatuses).filter((status) => status.status === "complete" || status.status === "failed").length ===
      taskStatusArray.length;

  function close() {
    void IPC.tasks.confirmFailed(Object.keys(taskStatuses));
  }

  return (
    <div className={rootStyle}>
      <div className={tasksStyle}>
        {taskStatusArray.map((task) => (
          <VTask key={task.status.id} taskStatus={task.status} />
        ))}
      </div>
      <div className={actionStyle}>
        {closable ? (
          <button className={appButtonStyle} onClick={close} tabIndex={-1} type="button">
            {t("commons.closeButton")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
