export type TaskwarriorErrorCode =
  | "NOT_INSTALLED"
  | "COMMAND_FAILED"
  | "COMMAND_TIMEOUT"
  | "OUTPUT_LIMIT"
  | "INVALID_JSON"
  | "INVALID_TASK_DATA"
  | "INVALID_UUID";

const taskwarriorErrorMessages: Record<TaskwarriorErrorCode, string> = {
  NOT_INSTALLED: "Taskwarrior is not installed or is unavailable.",
  COMMAND_FAILED: "Taskwarrior could not complete the requested operation.",
  COMMAND_TIMEOUT: "Taskwarrior did not respond before the command timed out.",
  OUTPUT_LIMIT: "Taskwarrior returned more data than the adapter can process.",
  INVALID_JSON: "Taskwarrior returned data the adapter could not read.",
  INVALID_TASK_DATA: "Taskwarrior returned task data the adapter could not read.",
  INVALID_UUID: "The task UUID is invalid.",
};

export interface TaskwarriorErrorOptions {
  args?: readonly string[];
  exitCode?: number | null;
  signal?: NodeJS.Signals | null;
  stderr?: string;
  cause?: unknown;
}

/** Error raised when the Taskwarrior CLI cannot be run or its output is invalid. */
export class TaskwarriorError extends Error {
  readonly code: TaskwarriorErrorCode;
  readonly detail: string;
  readonly args: readonly string[];
  readonly exitCode: number | null | undefined;
  readonly signal: NodeJS.Signals | null | undefined;
  readonly stderr: string | undefined;

  constructor(
    code: TaskwarriorErrorCode,
    message: string,
    options: TaskwarriorErrorOptions = {},
  ) {
    super(
      taskwarriorErrorMessages[code],
      options.cause === undefined ? undefined : { cause: options.cause },
    );
    this.name = "TaskwarriorError";
    this.code = code;
    this.detail = message;
    this.args = options.args ?? [];
    this.exitCode = options.exitCode;
    this.signal = options.signal;
    this.stderr = options.stderr;
  }
}
