import { TaskwarriorError } from "./errors.js";
import { TaskExecutor } from "./core/executor.js";
import { TaskOperations } from "./operations/tasks.js";
import type { TaskwarriorClientOptions, TaskwarriorTask } from "./types.js";

/**
 * A small wrapper around the Taskwarrior command-line interface.
 *
 * This initial release intentionally exposes read operations only. It invokes
 * the CLI without a shell, uses JSON output rather than terminal tables, and
 * never reads or writes Taskwarrior's internal storage directly.
 */
export class TaskwarriorClient {
  private readonly executor: TaskExecutor;
  private readonly tasks: TaskOperations;

  constructor(options: TaskwarriorClientOptions = {}) {
    this.executor = new TaskExecutor(options);
    this.tasks = new TaskOperations(this.executor);
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
    return this.tasks.listTasks();
  }

  /** Returns a task by UUID, or null when no matching task exists. */
  getTask(uuid: string): Promise<TaskwarriorTask | null> {
    return this.tasks.getTask(uuid);
  }
}
