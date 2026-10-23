import { TaskQueries } from "./queries.js";
import type { TaskQuery } from "./queries.js";
import type { TaskwarriorTask } from "../core/types.js";
import { TaskExecutor } from "../core/executor.js";

/** Public task namespace that composes the supported task operations. */
export class TaskOperations {
  private readonly queries: TaskQueries;

  constructor(executor: TaskExecutor) {
    this.queries = new TaskQueries(executor);
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
}
