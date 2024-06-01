import { v4 as uuid } from "uuid";

import { TaskStatus } from "@/commons/datas/task";

import { createKey, createUseFunction } from "@/main/libs/di";
import { EmitMainEventTargetType, useWindows } from "@/main/provides/windows";

export class Tasks {
  tasks: { [id: string]: TaskHandler } = {};
  spawn(name: string, silent: boolean) {
    const id = uuid();
    let done = false;
    const handler: TaskHandler = {
      name,
      isCanceled: false,
      id,
      emitStatus: (status) => {
        const windows = useWindows();
        if (done) {
          return;
        }
        if (!silent) {
          windows.emitMainEvent({ type: EmitMainEventTargetType.ALL }, "taskStatus", id, status);
        }
        if (status.status === "failed" || status.status === "complete") {
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
  removeTask(task: TaskHandler) {
    delete this.tasks[task.id];
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
  getTask(id: string) {
    return this.tasks[id];
  }
}
export interface TaskHandler {
  name: string;
  isCanceled: boolean;
  onCancel?: () => void;
  id: string;
  emitStatus: (status: TaskStatus) => void;
}

export const tasksKey = createKey<Tasks>("tasks");
export const useTasks = createUseFunction(tasksKey);
