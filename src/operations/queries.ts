import { TaskwarriorError } from "../core/errors.js";
import { TaskExecutor } from "../core/executor.js";
import { isTaskwarriorUuid, validateTaskExportItem } from "../utils/validation.js";
import type { TaskwarriorTask } from "../core/types.js";

/** Implements task queries and validates Taskwarrior task exports. */
export class TaskQueries {
  constructor(private readonly executor: TaskExecutor) {}

  async listTasks(): Promise<TaskwarriorTask[]> {
    const args = ["export", "rc.json.array=on", "rc.verbose=nothing"];
    const { stdout } = await this.executor.execute(args);
    return this.parseTaskExport(stdout, args);
  }

  async getTask(uuid: string): Promise<TaskwarriorTask | null> {
    if (!isTaskwarriorUuid(uuid)) {
      throw new TaskwarriorError(
        "INVALID_UUID",
        "Expected a UUID in the canonical 8-4-4-4-12 hexadecimal format.",
      );
    }

    const args = [`uuid:${uuid}`, "export", "rc.json.array=on", "rc.verbose=nothing"];
    const { stdout } = await this.executor.execute(args);
    const tasks = this.parseTaskExport(stdout, args);
    return tasks.find((task) => task.uuid.toLowerCase() === uuid.toLowerCase()) ?? null;
  }

  private parseTaskExport(stdout: string, args: readonly string[]): TaskwarriorTask[] {
    let parsed: unknown;

    try {
      parsed = JSON.parse(stdout);
    } catch (cause) {
      throw new TaskwarriorError(
        "INVALID_JSON",
        "Taskwarrior export did not return valid JSON. Check the CLI version and configuration.",
        { args, cause },
      );
    }

    if (!Array.isArray(parsed)) {
      throw new TaskwarriorError(
        "INVALID_TASK_DATA",
        "Taskwarrior export returned JSON, but it was not an array. The adapter requests rc.json.array=on.",
        { args },
      );
    }

    return parsed.map((value: unknown, index: number): TaskwarriorTask => {
      const validation = validateTaskExportItem(value);
      if (!validation.valid && validation.reason === "NOT_OBJECT") {
        throw new TaskwarriorError(
          "INVALID_TASK_DATA",
          `Taskwarrior export item at index ${index} is not a task object.`,
          { args },
        );
      }

      if (!validation.valid) {
        throw new TaskwarriorError(
          "INVALID_TASK_DATA",
          `Taskwarrior export item at index ${index} has no valid UUID.`,
          { args },
        );
      }

      // Preserve Taskwarrior's full object, including user-defined attributes.
      return validation.task;
    });
  }
}
