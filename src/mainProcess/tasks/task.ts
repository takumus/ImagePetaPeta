import { TaskStatus } from "@/commons/api/interfaces/task";
import { v4 as uuid } from "uuid";
const tasks: { [id: string]: TaskHandler } = {};
let emitStatusCallback: ((taskId: string, status: TaskStatus) => void) | undefined;
export async function spawn<T, K>(
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
      if (silent) {
        return;
      }
      if (done) {
        return;
      }
      if (emitStatusCallback) {
        emitStatusCallback(id, status);
      }
      if (status.status === "failed" || status.status === "complete") {
        done = true;
      }
    },
  };
  addTask(handler);
  try {
    const result = await exec(handler, params);
    removeTask(handler);
    return result;
  } catch (error) {
    //
    handler.emitStatus({
      i18nKey: "tasks.error",
      log: [String(error)],
      status: "failed",
    });
    removeTask(handler);
    throw error;
  }
}
function addTask(task: TaskHandler) {
  tasks[task.id] = task;
}
function removeTask(task: TaskHandler) {
  delete tasks[task.id];
}
export function cancel(id: string) {
  const task = getTask(id);
  if (task) {
    task.isCanceled = true;
    if (task.onCancel) {
      task.onCancel();
    }
    return true;
  }
  return false;
}
export function getTask(id: string) {
  return tasks[id];
}
export function onEmitStatus(callback: typeof emitStatusCallback) {
  emitStatusCallback = callback;
}
export interface TaskHandler {
  name: string;
  isCanceled: boolean;
  onCancel?: () => void;
  id: string;
  emitStatus: (status: TaskStatus) => void;
}
