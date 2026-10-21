export type TaskwarriorErrorCode =
  | "NOT_INSTALLED"
  | "COMMAND_FAILED"
  | "COMMAND_TIMEOUT"
  | "OUTPUT_LIMIT"
  | "INVALID_JSON"
  | "INVALID_TASK_DATA"
  | "INVALID_UUID";

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
  readonly args: readonly string[];
  readonly exitCode: number | null | undefined;
  readonly signal: NodeJS.Signals | null | undefined;
  readonly stderr: string | undefined;

  constructor(
    code: TaskwarriorErrorCode,
    message: string,
    options: TaskwarriorErrorOptions = {},
  ) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = "TaskwarriorError";
    this.code = code;
    this.args = options.args ?? [];
    this.exitCode = options.exitCode;
    this.signal = options.signal;
    this.stderr = options.stderr;
  }
}
