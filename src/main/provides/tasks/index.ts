import { BrowserWindow } from "electron";
import { throttle } from "throttle-debounce";
import { v4 as uuid } from "uuid";

import { TaskStatus, TaskStatusWithIndex } from "@/commons/datas/task";
import { WINDOW_MODAL_UPDATE_INTERVAL } from "@/commons/defines";

import { createKey, createUseFunction } from "@/main/libs/di";
import { windowIs } from "@/main/provides/utils/windowIs";
import { EmitMainEventTargetType, useWindows } from "@/main/provides/windows";

export class Tasks {
  tasks: { [id: string]: TaskHandler } = {};
  constructor() {
    setInterval(() => {
      this.updateWindow();
      const windows = useWindows();
      if (
        windows.windows.task !== undefined &&
        windowIs.alive(windows.windows.task) &&
        windows.mainWindowName !== undefined &&
        windows.windows[windows.mainWindowName] !== undefined &&
        windows.windows.task.getParentWindow() !== windows.windows[windows.mainWindowName]
      ) {
        console.log("update task window parent");
        windows.windows.task.setParentWindow(windows.windows[windows.mainWindowName]!);
      }
    }, 10);
  }
  visibleWindow = throttle(100, (visible: boolean) => {
    const windows = useWindows();
    if (visible) {
      const parent =
        windows.mainWindowName !== undefined ? windows.windows[windows.mainWindowName] : undefined;
      if (parent === undefined) {
        return;
      }
      if (windowIs.dead(windows.windows.task)) {
        windows.openWindow("task", parent).setSkipTaskbar(true);
      }
      if (windowIs.alive(windows.windows.task) && windows.windows.task !== undefined) {
        windows.windows.task.setIgnoreMouseEvents(false);
        windows.windows.task.setOpacity(1);
      }
    } else {
      if (windows.windows.task === undefined || windowIs.dead(windows.windows.task)) {
        return;
      }
      windows.windows.task.setIgnoreMouseEvents(true);
      windows.windows.task.setOpacity(0);
    }
  });
  updateWindow() {
    // console.log(this.getActiveTasks());
    if (this.getActiveTasks().length < 1) {
      this.visibleWindow(false);
      return;
    }
    this.visibleWindow(true);
  }
  emit() {
    const windows = useWindows();
    windows.emitMainEvent(
      { type: EmitMainEventTargetType.WINDOW_NAMES, windowNames: ["task"] },
      "taskStatus",
      this.getStatus(),
    );
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
    let done = false;
    let index = 0;
    const handler: TaskHandler = {
      name,
      isCanceled: false,
      id,
      latestStatus: undefined,
      silent,
      emitStatus: (status) => {
        console.log(status);
        handler.latestStatus = { ...status, index };
        index++;
        if (done) {
          return;
        }
        if (!silent) {
          this.emit();
        }
        if (status.status === "complete") {
          done = true;
          this.removeTask(handler);
        }
      },
    };
    this.addTask(handler);
    this.updateWindow();
    return handler;
  }
  addTask(task: TaskHandler) {
    this.tasks[task.id] = task;
  }
  private removeTask(task: TaskHandler) {
    setTimeout(() => {
      delete this.tasks[task.id];
      if (!task.silent) {
        this.emit();
        this.updateWindow();
      }
    }, 100);
  }
  cancel(id: string) {
    const task = this.getTask(id);
    if (task) {
      task.isCanceled = true;
      if (task.onCancel) {
        task.onCancel();
      }
      return true;
    }
    return false;
  }
  confirmFailed(id: string) {
    const task = this.getTask(id);
    if (task?.latestStatus?.status === "failed") {
      this.removeTask(task);
    }
  }
  getTask(id: string) {
    return this.tasks[id];
  }
  getActiveTasks() {
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
