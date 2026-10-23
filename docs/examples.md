# Examples

All examples use the public package exports. `TaskwarriorClient` methods are
asynchronous and reject on command or output errors; see
[error handling](./errors.md).

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
