export interface Task {
  i18nKey: string,
  progress: {
    current: number
    all: number
  }
  log: string[],
  status: TaskStatus
}
export enum TaskStatus {
  COMPLETE = "complete",
  FAILED = "failed",
  PROGRESS = "progress",
  BEGIN = "begin"
}