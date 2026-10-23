import { TaskQueries } from "./queries.js";
import type { TaskQuery } from "./queries.js";
import { TaskMutations } from "./mutations.js";
import type { TaskCreateCommand } from "./mutations.js";
import type { TaskModifyCommand } from "./mutations.js";
import type { TaskLifecycleCommand } from "./mutations.js";
import type { TaskwarriorTask } from "../core/types.js";
import { TaskExecutor } from "../core/executor.js";

/** Public task namespace that composes the supported task operations. */
export class TaskOperations {
  private readonly queries: TaskQueries;
  private readonly mutations: TaskMutations;

  constructor(executor: TaskExecutor) {
    this.queries = new TaskQueries(executor);
    this.mutations = new TaskMutations(executor);
  }

  query(): TaskQuery {
    return this.queries.query();
  }

  listTasks(): Promise<TaskwarriorTask[]> {
    return this.queries.listTasks();
  }

  getTask(uuid: string): Promise<TaskwarriorTask | null> {
    return this.queries.getTask(uuid);
  }

  create(): TaskCreateCommand {
    return this.mutations.create();
  }

  modify(uuid: string): TaskModifyCommand {
    return this.mutations.modify(uuid);
  }

  complete(uuid: string): TaskLifecycleCommand {
    return this.mutations.complete(uuid);
  }

  delete(uuid: string): TaskLifecycleCommand {
    return this.mutations.delete(uuid);
  }
}
