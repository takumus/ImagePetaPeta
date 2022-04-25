export interface TaskStatus {
  i18nKey: string,
  progress?: {
    current: number
    all: number
  }
  log?: string[],
  status: TaskStatusCode,
  cancelable?: boolean
}
export type TaskStatusCode = "complete" | "failed" | "progress" | "begin";