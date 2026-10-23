# Examples

Runnable TypeScript files are in the repository's [`examples/`](../examples/)
directory. Run them from the repository root with the matching pnpm script below.
They import the local source so they can be run before publishing or installing
the package. They use your configured Taskwarrior installation unless configured
otherwise. The create example writes a task; the remaining examples are read-only.

| Command | File | Demonstrates |
| --- | --- | --- |
| `pnpm example:read` | [`read-tasks.ts`](../examples/read-tasks.ts) | Get version and list tasks. |
| `pnpm example:get-task -- <task-uuid>` | [`get-task.ts`](../examples/get-task.ts) | Retrieve a task by UUID and handle no match. |
| `pnpm example:query -- <project>` | [`query-tasks.ts`](../examples/query-tasks.ts) | Combine project, status, and tag filters. |
| `pnpm example:create -- <description...>` | [`create-task.ts`](../examples/create-task.ts) | Create a task with a description. |
| `pnpm example:configured` | [`configured-client.ts`](../examples/configured-client.ts) | Configure command, time/output bounds, and environment. |
| `pnpm example:custom-attributes` | [`read-custom-attributes.ts`](../examples/read-custom-attributes.ts) | Read an additional task attribute safely. |
| `pnpm example:errors` | [`handle-errors.ts`](../examples/handle-errors.ts) | Handle `TaskwarriorError` and unexpected errors. |

Provide a UUID from your own tasks to the `get-task` example. The configured
client example honors `TASKWARRIOR_COMMAND`, `TASKRC`, and `TASKDATA` environment
variables. The create example writes to the selected Taskwarrior data; use an
isolated configuration/data directory if you do not want to change your normal
task list.

For API details see the [API reference](./api-reference.md). For all adapter
error codes and handling guidance see [error handling](./errors.md).

## Get the Taskwarrior version

```ts
import { TaskwarriorClient } from "taskwarrior-adapter";

const client = new TaskwarriorClient();
const version = await client.getVersion();
console.log(version);
```

## List exported tasks

```ts
import { TaskwarriorClient } from "taskwarrior-adapter";

const client = new TaskwarriorClient();
const tasks = await client.listTasks();

for (const task of tasks) {
  console.log({
    uuid: task.uuid,
    description: task.description ?? "(no description)",
    status: task.status ?? "unknown",
    project: task.project,
  });
}
```

This returns the tasks present in Taskwarrior's export. The adapter does not
apply an additional status filter.

## Get a task by UUID

```ts
import { TaskwarriorClient } from "taskwarrior-adapter";

const client = new TaskwarriorClient();
const task = await client.getTask("a360fc44-315c-4366-b70c-ea7e7520b749");

if (task === null) {
  console.log("No matching task was found.");
} else {
  console.log(task.description, task.status);
}
```

Replace the sample UUID with one from your own task export. Malformed UUIDs reject
with code `INVALID_UUID`; a valid UUID with no match returns `null`.

## Configure the executable, limits, and environment

```ts
import { TaskwarriorClient } from "taskwarrior-adapter";

const client = new TaskwarriorClient({
  commandPath: "/usr/local/bin/task",
  timeoutMs: 15_000,
  maxOutputBytes: 20 * 1024 * 1024,
  taskrcPath: "/tmp/task-test/taskrc",
  dataLocation: "/tmp/task-test/data",
  env: {
    TASK_COLOR: "off",
  },
});

const tasks = await client.listTasks();
console.log(`Read ${tasks.length} task(s) from the isolated data location.`);
```

Use a dedicated Taskwarrior configuration and data directory for isolated
integration tests. The adapter does not modify the parent process environment.
`taskrcPath` and `dataLocation`, when provided, take precedence over corresponding
`TASKRC` and `TASKDATA` values in `env`.

## Preserve custom Taskwarrior attributes

```ts
import { TaskwarriorClient } from "taskwarrior-adapter";

const client = new TaskwarriorClient();
const tasks = await client.listTasks();

for (const task of tasks) {
  const customValue = task["my_custom_attribute"];
  if (customValue !== undefined) {
    console.log(task.uuid, customValue);
  }
}
```

Known task fields are typed. Additional Taskwarrior attributes are retained and
typed as `unknown`, so narrow or validate them before relying on their shape.
