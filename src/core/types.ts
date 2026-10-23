/**
 * A Taskwarrior task as returned by `task export`.
 *
 * Taskwarrior supports user-defined attributes and may add fields over time.
 * The index signature deliberately preserves forward compatibility: consumers
 * can read known fields safely without throwing away fields they do not know.
 */
export interface TaskwarriorTask {
  uuid: string;
  description?: string;
  status?: string;
  id?: number;
  entry?: string;
  modified?: string;
  due?: string;
  project?: string;
  priority?: string;
  tags?: string[];
  [attribute: string]: unknown;
}

export type TaskStatus = "pending" | "completed" | "deleted" | "waiting" | "recurring";

export interface TaskwarriorClientOptions {
  /** CLI executable name or absolute path. Defaults to `task`. */
  commandPath?: string;
  /** Maximum time allowed for one Taskwarrior command. Defaults to 10 seconds. */
  timeoutMs?: number;
  /** Maximum combined stdout/stderr in bytes. Defaults to 10 MiB. */
  maxOutputBytes?: number;
  /** Optional path to a Taskwarrior configuration file, passed as TASKRC. */
  taskrcPath?: string;
  /** Optional data directory, passed as TASKDATA. Useful for isolated tests. */
  dataLocation?: string;
  /** Additional environment overrides for the Taskwarrior subprocess. */
  env?: NodeJS.ProcessEnv;
}
