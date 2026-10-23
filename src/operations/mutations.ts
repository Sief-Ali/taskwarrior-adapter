import { TaskwarriorError } from "../core/errors.js";
import { TaskExecutor } from "../core/executor.js";
import {
  isSafeTaskDueValue,
  isSafeTaskFilterValue,
  isSafeTaskTag,
  isTaskwarriorUuid,
  isValidTaskDescription,
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

export interface TaskModifyCommand {
  description(value: string): TaskModifyCommand;
  project(value: string): TaskModifyCommand;
  priority(value: TaskPriority): TaskModifyCommand;
  due(value: string): TaskModifyCommand;
  addTag(value: string): TaskModifyCommand;
  removeTag(value: string): TaskModifyCommand;
  execute(): Promise<void>;
}

export interface TaskLifecycleCommand {
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
    if (!isValidTaskDescription(value)) {
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

/** Builds a validated Taskwarrior modify command for one task UUID. */
class ModifyTaskBuilder implements TaskModifyCommand {
  private descriptionValue: string | undefined;
  private projectValue: string | undefined;
  private priorityValue: TaskPriority | undefined;
  private dueValue: string | undefined;
  private readonly tagChanges: string[] = [];

  constructor(
    private readonly executor: TaskExecutor,
    private readonly uuid: string,
  ) {}

  description(value: string): this {
    if (!isValidTaskDescription(value)) {
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

  addTag(value: string): this {
    this.validateTag(value);
    this.tagChanges.push(`+${value}`);
    return this;
  }

  removeTag(value: string): this {
    this.validateTag(value);
    this.tagChanges.push(`-${value}`);
    return this;
  }

  async execute(): Promise<void> {
    const args = [`uuid:${this.uuid}`, "modify"];
    let hasChanges = false;

    if (this.projectValue !== undefined) {
      args.push(`project:${this.projectValue.includes(" ") ? `'${this.projectValue}'` : this.projectValue}`);
      hasChanges = true;
    }
    if (this.priorityValue !== undefined) {
      args.push(`priority:${this.priorityValue}`);
      hasChanges = true;
    }
    if (this.dueValue !== undefined) {
      args.push(`due:${this.dueValue}`);
      hasChanges = true;
    }
    if (this.tagChanges.length > 0) {
      args.push(...this.tagChanges);
      hasChanges = true;
    }
    if (this.descriptionValue !== undefined) {
      args.push("--", this.descriptionValue);
      hasChanges = true;
    }

    if (!hasChanges) {
      throw new TaskwarriorError("INVALID_INPUT", "At least one task change is required.");
    }

    await this.executor.execute(args);
  }

  private validateTag(value: string): void {
    if (!isSafeTaskTag(value)) {
      throw new TaskwarriorError(
        "INVALID_INPUT",
        "Tag must contain only letters, numbers, '.', '_' or '-', and be at most 256 characters.",
      );
    }
  }
}

/** Runs a single UUID-targeted Taskwarrior lifecycle command. */
class TaskLifecycleBuilder implements TaskLifecycleCommand {
  constructor(
    private readonly executor: TaskExecutor,
    private readonly uuid: string,
    private readonly command: "done" | "delete" | "start" | "stop",
  ) {}

  async execute(): Promise<void> {
    const args =
      this.command === "delete"
        ? ["rc.confirmation=no", `uuid:${this.uuid}`, this.command]
        : [`uuid:${this.uuid}`, this.command];
    await this.executor.execute(args);
  }
}

export class TaskMutations {
  constructor(private readonly executor: TaskExecutor) {}

  create(): TaskCreateCommand {
    return new CreateTaskBuilder(this.executor);
  }

  modify(uuid: string): TaskModifyCommand {
    if (!isTaskwarriorUuid(uuid)) {
      throw new TaskwarriorError(
        "INVALID_UUID",
        "Expected a UUID in the canonical 8-4-4-4-12 hexadecimal format.",
      );
    }
    return new ModifyTaskBuilder(this.executor, uuid);
  }

  complete(uuid: string): TaskLifecycleCommand {
    if (!isTaskwarriorUuid(uuid)) {
      throw new TaskwarriorError(
        "INVALID_UUID",
        "Expected a UUID in the canonical 8-4-4-4-12 hexadecimal format.",
      );
    }
    return new TaskLifecycleBuilder(this.executor, uuid, "done");
  }

  delete(uuid: string): TaskLifecycleCommand {
    if (!isTaskwarriorUuid(uuid)) {
      throw new TaskwarriorError(
        "INVALID_UUID",
        "Expected a UUID in the canonical 8-4-4-4-12 hexadecimal format.",
      );
    }
    return new TaskLifecycleBuilder(this.executor, uuid, "delete");
  }

  start(uuid: string): TaskLifecycleCommand {
    if (!isTaskwarriorUuid(uuid)) {
      throw new TaskwarriorError(
        "INVALID_UUID",
        "Expected a UUID in the canonical 8-4-4-4-12 hexadecimal format.",
      );
    }
    return new TaskLifecycleBuilder(this.executor, uuid, "start");
  }

  stop(uuid: string): TaskLifecycleCommand {
    if (!isTaskwarriorUuid(uuid)) {
      throw new TaskwarriorError(
        "INVALID_UUID",
        "Expected a UUID in the canonical 8-4-4-4-12 hexadecimal format.",
      );
    }
    return new TaskLifecycleBuilder(this.executor, uuid, "stop");
  }
}
