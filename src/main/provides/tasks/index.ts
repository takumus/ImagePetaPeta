import { v4 as uuid } from "uuid";

import { TaskStatus, TaskStatusCode } from "@/commons/datas/task";

import { createKey, createUseFunction } from "@/main/libs/di";
import { EmitMainEventTargetType, useWindows } from "@/main/provides/windows";

export class Tasks {
  tasks: { [id: string]: TaskHandler } = {};
  async spawn<T, K>(
    name: string,
    exec: (handler: TaskHandler, params: T) => Promise<K>,
    params: T,
    silent: boolean,
  ) {
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
        if (status.status === TaskStatusCode.FAILED || status.status === TaskStatusCode.COMPLETE) {
          done = true;
        }
      },
    };
    this.addTask(handler);
    try {
      const result = await exec(handler, params);
      this.removeTask(handler);
      return result;
    } catch (error) {
      //
      handler.emitStatus({
        i18nKey: "tasks.error",
        log: [String(error)],
        status: TaskStatusCode.FAILED,
      });
      this.removeTask(handler);
      throw error;
    }
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
