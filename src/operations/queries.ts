import { TaskwarriorError } from "../core/errors.js";
import { TaskExecutor } from "../core/executor.js";
import {
  isSafeTaskFilterValue,
  isSafeTaskTag,
  isTaskwarriorUuid,
  validateTaskExportItem,
} from "../utils/validation.js";
import type { TaskStatus, TaskwarriorTask } from "../core/types.js";

const TASK_STATUSES = new Set<TaskStatus>([
  "pending",
  "completed",
  "deleted",
  "waiting",
  "recurring",
]);

interface TaskQueryFilters {
  project?: string;
  status?: TaskStatus;
  tags: string[];
}

type TaskQueryExecutor = (filters: TaskQueryFilters) => Promise<TaskwarriorTask[]>;

export interface TaskQuery {
  project(value: string): TaskQuery;
  status(value: TaskStatus): TaskQuery;
  tag(value: string): TaskQuery;
  execute(): Promise<TaskwarriorTask[]>;
}

/** Builds a typed task query from supported Taskwarrior filter fields. */
class TaskQueryBuilder implements TaskQuery {
  private projectName: string | undefined;
  private taskStatus: TaskStatus | undefined;
  private readonly tags: string[] = [];

  constructor(private readonly executeQuery: TaskQueryExecutor) {}

  project(value: string): this {
    this.validateValue(value, "project");
    this.projectName = value;
    return this;
  }

  status(value: TaskStatus): this {
    if (!TASK_STATUSES.has(value)) {
      throw new TaskwarriorError(
        "INVALID_FILTER",
        "The status filter must be pending, completed, deleted, waiting, or recurring.",
      );
    }
    this.taskStatus = value;
    return this;
  }

  tag(value: string): this {
    if (!isSafeTaskTag(value)) {
      throw new TaskwarriorError(
        "INVALID_FILTER",
        "The tag filter must contain only letters, numbers, '.', '_' or '-', and be at most 256 characters.",
      );
    }
    this.tags.push(value);
    return this;
  }

  execute(): Promise<TaskwarriorTask[]> {
    return this.executeQuery({
      ...(this.projectName === undefined ? {} : { project: this.projectName }),
      ...(this.taskStatus === undefined ? {} : { status: this.taskStatus }),
      tags: [...this.tags],
    });
  }

  private validateValue(value: string, field: string): void {
    if (!isSafeTaskFilterValue(value)) {
      throw new TaskwarriorError(
        "INVALID_FILTER",
        `The ${field} filter must contain only letters, numbers, spaces, '.', '_' or '-', and be at most 256 characters.`,
      );
    }
  }
}

/** Implements task queries and validates Taskwarrior task exports. */
export class TaskQueries {
  constructor(private readonly executor: TaskExecutor) {}

  query(): TaskQuery {
    return new TaskQueryBuilder((filters) => this.executeTaskQuery(filters));
  }

  async listTasks(): Promise<TaskwarriorTask[]> {
    return this.executeTaskExport([]);
  }

  async getTask(uuid: string): Promise<TaskwarriorTask | null> {
    if (!isTaskwarriorUuid(uuid)) {
      throw new TaskwarriorError(
        "INVALID_UUID",
        "Expected a UUID in the canonical 8-4-4-4-12 hexadecimal format.",
      );
    }

    const tasks = await this.executeTaskExport([`uuid:${uuid}`]);
    return tasks.find((task) => task.uuid.toLowerCase() === uuid.toLowerCase()) ?? null;
  }

  private executeTaskQuery(filters: TaskQueryFilters): Promise<TaskwarriorTask[]> {
    const args: string[] = [];

    if (filters.project !== undefined) {
      args.push(`project:${this.quoteFilterValue(filters.project)}`);
    }

    if (filters.status !== undefined) {
      args.push(`status:${filters.status}`);
    }

    for (const tag of filters.tags) {
      args.push(`+${tag}`);
    }

    return this.executeTaskExport(args);
  }

  private quoteFilterValue(value: string): string {
    return value.includes(" ") ? `'${value}'` : value;
  }

  private async executeTaskExport(filters: readonly string[]): Promise<TaskwarriorTask[]> {
    const args = [...filters, "export", "rc.json.array=on", "rc.verbose=nothing"];
    const { stdout } = await this.executor.execute(args);
    return this.parseTaskExport(stdout, args);
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
