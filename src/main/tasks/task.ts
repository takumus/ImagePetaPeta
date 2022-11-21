import { TaskStatus, TaskStatusCode } from "@/commons/datas/task";
import { inject } from "@/main/utils/di";
import { emitMainEventKey } from "@/main/utils/emitMainEvent";
import { v4 as uuid } from "uuid";
const tasks: { [id: string]: TaskHandler } = {};
export async function spawn<T, K>(
  name: string,
  exec: (handler: TaskHandler, params: T) => Promise<K>,
  params: T,
  silent: boolean,
) {
  const id = uuid();
  const emitMainEvent = inject(emitMainEventKey);
  let done = false;
  const handler: TaskHandler = {
    name,
    isCanceled: false,
    id,
    emitStatus: (status) => {
      if (done) {
        return;
      }
      if (!silent) {
        emitMainEvent("taskStatus", id, status);
      }
      if (status.status === TaskStatusCode.FAILED || status.status === TaskStatusCode.COMPLETE) {
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
      status: TaskStatusCode.FAILED,
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
export interface TaskHandler {
  name: string;
  isCanceled: boolean;
  onCancel?: () => void;
  id: string;
  emitStatus: (status: TaskStatus) => void;
}
