import { TaskwarriorError } from "./core/errors.js";
import { TaskExecutor } from "./core/executor.js";
import type { TaskwarriorClientOptions, TaskwarriorTask } from "./core/types.js";
import { TaskQueries } from "./operations/queries.js";

/**
 * A small wrapper around the Taskwarrior command-line interface.
 *
 * This initial release intentionally exposes read operations only. It invokes
 * the CLI without a shell, uses JSON output rather than terminal tables, and
 * never reads or writes Taskwarrior's internal storage directly.
 */
export class TaskwarriorClient {
  private readonly executor: TaskExecutor;
  private readonly queries: TaskQueries;

  constructor(options: TaskwarriorClientOptions = {}) {
    this.executor = new TaskExecutor(options);
    this.queries = new TaskQueries(this.executor);
  }

  /** Returns Taskwarrior's version string without loading its task database. */
  async getVersion(): Promise<string> {
    const args = ["--version"];
    const { stdout } = await this.executor.execute(args);
    const version = stdout.trim();

    if (!version) {
      throw new TaskwarriorError(
        "COMMAND_FAILED",
        "Taskwarrior returned an empty version string.",
        { args },
      );
    }

    return version;
  }

  /** Returns exported tasks without applying a default status filter. */
  listTasks(): Promise<TaskwarriorTask[]> {
    return this.queries.listTasks();
  }

  /** Returns a task by UUID, or null when no matching task exists. */
  getTask(uuid: string): Promise<TaskwarriorTask | null> {
    return this.queries.getTask(uuid);
  }
}
