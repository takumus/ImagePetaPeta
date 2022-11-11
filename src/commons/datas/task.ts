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
export enum TaskStatusCode {
  COMPLETE = "complete",
  FAILED = "failed",
  PROGRESS = "progress",
  BEGIN = "begin",
}
