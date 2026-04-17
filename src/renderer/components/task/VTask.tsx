import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { css } from "styled-system/css";

import { TaskStatusCode, TaskStatusWithIndex } from "@/commons/datas/task";

import VProgressBar from "@/renderer/components/commons/utils/progressBar/VProgressBar";
import { appButtonStyle } from "@/renderer/components/shared/controlStyles";
import { IPC } from "@/renderer/libs/ipc";

const rootStyle = css({
  display: "block",
  textAlign: "center",
});

const titleStyle = css({
  marginBottom: "px1",
  wordBreak: "break-word",
});

const logStyle = css({
  width: "100%",
  height: "64px",
  overflowX: "hidden",
  overflowY: "auto",
  fontSize: "size0",
  textAlign: "left",
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
});

const cancelStyle = css({
  display: "flex",
  justifyContent: "center",
});

export default function VTask({
  taskStatus,
}: {
  taskStatus: TaskStatusWithIndex & { id: string };
}) {
  const { t } = useTranslation();
  const [log, setLog] = useState("");
  const currentTaskId = useRef("");

  const progress = useMemo(() => {
    return taskStatus.progress
      ? Math.floor((taskStatus.progress.current / taskStatus.progress.all) * 100)
      : taskStatus.status === "complete"
        ? 100
        : 0;
  }, [taskStatus.progress, taskStatus.status]);

  const cancelable =
    taskStatus.cancelable === true &&
    taskStatus.status !== "complete" &&
    taskStatus.status !== "failed";

  const name = `${taskStatus.i18nKey}.name`;

  useEffect(() => {
    const task = taskStatus;
    const changedTask = currentTaskId.current !== task.id;
    currentTaskId.current = task.id;
    const i18nKey = `${task.i18nKey}.logs.${task.status}`;
    const localized = t(i18nKey, task.log ?? []);
    const prefix =
      task.status === "progress" && task.progress
        ? `(${task.progress.current}/${task.progress.all})`
        : "";

    setLog((prev) => {
      const currentLog = changedTask || task.status === "begin" ? "" : prev;
      return `${prefix}${localized}\n${currentLog}`;
    });
  }, [
    taskStatus.id,
    taskStatus.i18nKey,
    taskStatus.log,
    taskStatus.progress,
    taskStatus.status,
    t,
  ]);

  return (
    <div className={rootStyle}>
      {name !== "" ? <p className={titleStyle}>{t(name)}({Math.floor(progress)}%)</p> : null}
      <VProgressBar progress={progress} />
      <pre className={logStyle}>{log}</pre>
      <div className={cancelStyle}>
        {cancelable ? (
          <button className={appButtonStyle} onClick={() => IPC.tasks.cancel([taskStatus.id])} tabIndex={-1} type="button">
            {t("fileImporter.cancel")}
          </button>
        ) : null}
      </div>
    </div>
  );
}
