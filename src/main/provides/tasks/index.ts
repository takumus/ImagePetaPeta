import { v4 as uuid } from "uuid";

import { TaskStatus, TaskStatusWithIndex } from "@/commons/datas/task";

import { createKey, createUseFunction } from "@/main/libs/di";
import { EmitMainEventTargetType, useWindows } from "@/main/provides/windows";

export class Tasks {
  tasks: { [id: string]: TaskHandler } = {};
  emit() {
    const windows = useWindows();
    windows.emitMainEvent(
      { type: EmitMainEventTargetType.ALL },
      "taskStatus",
      Object.values(this.tasks)
        .filter((t) => t.latestStatus && !t.silent)
        .reduce<{ [id: string]: TaskStatusWithIndex }>(
          (p, c) => ({ ...p, [c.id]: c.latestStatus! }),
          {},
        ),
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
