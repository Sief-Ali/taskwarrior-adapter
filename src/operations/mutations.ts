import { TaskwarriorError } from "../core/errors.js";
import { TaskExecutor } from "../core/executor.js";
import {
  isSafeTaskDueValue,
  isSafeTaskFilterValue,
  isSafeTaskTag,
} from "../utils/validation.js";

export type TaskPriority = "H" | "M" | "L";

export interface TaskCreateCommand {
  description(value: string): TaskCreateCommand;
  project(value: string): TaskCreateCommand;
  priority(value: TaskPriority): TaskCreateCommand;
  due(value: string): TaskCreateCommand;
  tag(value: string): TaskCreateCommand;
  execute(): Promise<void>;
}

const TASK_PRIORITIES = new Set<TaskPriority>(["H", "M", "L"]);

/** Builds a validated Taskwarrior add command. */
class CreateTaskBuilder implements TaskCreateCommand {
  private descriptionValue: string | undefined;
  private projectValue: string | undefined;
  private priorityValue: TaskPriority | undefined;
  private dueValue: string | undefined;
  private readonly tagValues: string[] = [];

  constructor(private readonly executor: TaskExecutor) {}

  description(value: string): this {
    if (value.trim().length === 0 || value.length > 4096 || value.includes("\0")) {
      throw new TaskwarriorError(
        "INVALID_INPUT",
        "Task description must be non-empty, at most 4096 characters, and contain no NUL character.",
      );
    }
    this.descriptionValue = value;
    return this;
  }

  project(value: string): this {
    if (!isSafeTaskFilterValue(value)) {
      throw new TaskwarriorError(
        "INVALID_INPUT",
        "Project must contain only letters, numbers, spaces, '.', '_' or '-', and be at most 256 characters.",
      );
    }
    this.projectValue = value;
    return this;
  }

  priority(value: TaskPriority): this {
    if (!TASK_PRIORITIES.has(value)) {
      throw new TaskwarriorError("INVALID_INPUT", "Priority must be 'H', 'M', or 'L'.");
    }
    this.priorityValue = value;
    return this;
  }

  due(value: string): this {
    if (!isSafeTaskDueValue(value)) {
      throw new TaskwarriorError(
        "INVALID_INPUT",
        "Due date must be a single Taskwarrior date token using letters, numbers, '.', '_', '+', or '-'.",
      );
    }
    this.dueValue = value;
    return this;
  }

  tag(value: string): this {
    if (!isSafeTaskTag(value)) {
      throw new TaskwarriorError(
        "INVALID_INPUT",
        "Tag must contain only letters, numbers, '.', '_' or '-', and be at most 256 characters.",
      );
    }
    this.tagValues.push(value);
    return this;
  }

  async execute(): Promise<void> {
    if (this.descriptionValue === undefined) {
      throw new TaskwarriorError("INVALID_INPUT", "A task description is required.");
    }

    const args = ["add"];
    if (this.projectValue !== undefined) {
      args.push(`project:${this.projectValue.includes(" ") ? `'${this.projectValue}'` : this.projectValue}`);
    }
    if (this.priorityValue !== undefined) {
      args.push(`priority:${this.priorityValue}`);
    }
    if (this.dueValue !== undefined) {
      args.push(`due:${this.dueValue}`);
    }
    for (const tag of this.tagValues) {
      args.push(`+${tag}`);
    }

    args.push("--", this.descriptionValue);
    await this.executor.execute(args);
  }
}

export class TaskMutations {
  constructor(private readonly executor: TaskExecutor) {}

  create(): TaskCreateCommand {
    return new CreateTaskBuilder(this.executor);
  }
}
