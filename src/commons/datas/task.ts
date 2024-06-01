export interface TaskStatus {
  i18nKey: string;
  progress?: {
    current: number;
    all: number;
  };
  log?: string[];
  status: TaskStatusCode;
  cancelable?: boolean;
}
export interface TaskStatusWithIndex extends TaskStatus {
  index: number;
}
export type TaskStatusCode = "complete" | "failed" | "progress" | "begin";
