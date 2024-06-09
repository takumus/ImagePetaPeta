import { v4 as uuid } from "uuid";

import { TaskStatus, TaskStatusWithIndex } from "@/commons/datas/task";

import { createKey, createUseFunction } from "@/main/libs/di";
import { EmitMainEventTargetType, useWindows } from "@/main/provides/windows";
import { PopupWindow } from "@/main/provides/windows/popup";

export class Tasks {
  taskIndex = 0;
  tasks: { [id: string]: TaskHandler } = {};
  popup: PopupWindow;
  constructor() {
    this.popup = new PopupWindow("task");
  }
  updateWindow() {
    if (this.getActive().length < 1) {
      this.popup.setVisible(false);
      return;
    }
    this.popup.setVisible(true);
  }
  getStatus() {
    return Object.values(this.tasks)
      .filter((t) => t.latestStatus && !t.silent)
      .reduce<{ [id: string]: TaskStatusWithIndex }>(
        (p, c) => ({ ...p, [c.id]: c.latestStatus! }),
        {},
      );
  }
  spawn(name: string, silent: boolean) {
    const id = uuid();
    let completed = false;
    const index = this.taskIndex++;
    const handler: TaskHandler = {
      name,
      isCanceled: false,
      id,
      latestStatus: undefined,
      silent,
      emitStatus: (status) => {
        handler.latestStatus = { ...status, index };
        if (completed) return;
        if (!silent) this.emit();
        if (status.status === "complete") {
          completed = true;
          this.remove(handler);
        }
      },
    };
    this.tasks[handler.id] = handler;
    this.updateWindow();
    return handler;
  }
  cancel(ids: string[]) {
    ids.forEach((id) => {
      const task = this.get(id);
      if (task !== undefined) {
        task.isCanceled = true;
        if (task.onCancel) {
          task.onCancel();
        }
      }
    });
    return true;
  }

  confirmFailed(ids: string[]) {
    ids.forEach((id) => {
      const task = this.get(id);
      if (task?.latestStatus?.status === "failed") {
        this.remove(task);
      }
    });
  }
  private emit() {
    const windows = useWindows();
    this.updateWindow();
    windows.emitMainEvent(
      { type: "windowNames", windowNames: ["task"] },
      "taskStatus",
      this.getStatus(),
    );
  }
  private remove(task: TaskHandler) {
    setTimeout(() => {
      delete this.tasks[task.id];
      if (!task.silent) {
        this.emit();
        this.updateWindow();
      }
    }, 100);
  }
  private get(id: string) {
    return this.tasks[id];
  }
  private getActive() {
    return Object.values(this.tasks).filter((t) => !t.silent);
  }
}
export interface TaskHandler {
  name: string;
  isCanceled: boolean;
  onCancel?: () => void;
  id: string;
  latestStatus?: TaskStatusWithIndex;
  silent: boolean;
  emitStatus: (status: TaskStatus) => void;
}

export const tasksKey = createKey<Tasks>("tasks");
export const useTasks = createUseFunction(tasksKey);
