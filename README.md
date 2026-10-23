# Taskwarrior Adapter

A small, typed Node.js/TypeScript library for reading and creating tasks through the
[Taskwarrior](https://taskwarrior.org/) command-line interface. It can be used
from a backend, script, desktop application, or other Node.js project; it does
not depend on a web framework.

> **Status: early development (`0.2.7`).** The adapter can check the Taskwarrior
> version, list and filter exported tasks, retrieve a task by UUID, create a task,
> modify selected task fields, complete a task, mark a task deleted, and start
> or stop work on a task.

- **GitHub:** https://github.com/Sief-Ali/taskwarrior-adapter
- **npm:** https://www.npmjs.com/package/taskwarrior-adapter

## Documentation

Choose a guide:

- [Getting started](./docs/getting-started.md) — prerequisites, installation, and first use.
- [API reference](./docs/api-reference.md) — supported methods, task types, and client options.
- [Runnable examples](./examples/) — TypeScript programs grouped into `queries/`, `mutations/`, `configuration/`, and `errors/`.
- [Example guide](./docs/examples.md) — what each example demonstrates and how to run it.
- [Error handling](./docs/errors.md) — all adapter error codes and how to handle them.

## Features

- Checks the installed Taskwarrior version.
- Lists tasks using Taskwarrior's machine-readable `task export` output.
- Builds constrained queries by project, status, and required tags.
- Retrieves a task by UUID (returns `null` if there is no match).
- Creates tasks with a description and optional project, priority, due date, and tags.
- Modifies a task's description, project, priority, due date, and individual tags by UUID.
- Completes a task by UUID using Taskwarrior's completion command.
- Soft-deletes a task by UUID; the task remains in Taskwarrior data as deleted.
- Starts work on a task by UUID.
- Stops work on a task by UUID.
- Preserves additional task attributes not explicitly described in the TypeScript type.
- Executes the Taskwarrior CLI using argument arrays rather than shell command strings.
- Supports custom executable, timeout, output limit, configuration, data location, and environment options.
- Provides a typed asynchronous API without tying consumers to a web framework.
- Provides stable adapter-owned error codes and messages, with CLI diagnostics available separately.

## Requirements

- Node.js 20 or later.
- Taskwarrior installed and available as `task`, unless `commandPath` is configured.
- Taskwarrior 3.5.0 is the initial compatibility target; compatibility should be verified against your own installation.

## Installation

Install the published package from npm:

```bash
npm install taskwarrior-adapter
```

Or with pnpm:

```bash
pnpm add taskwarrior-adapter
```

Taskwarrior itself is a separate system dependency and is **not** installed by this npm package.

## Quick start

```ts
import { TaskwarriorClient } from "taskwarrior-adapter";

const taskwarrior = new TaskwarriorClient();

const version = await taskwarrior.getVersion();
console.log("Taskwarrior version:", version);

const tasks = await taskwarrior.listTasks();
console.log(`Found ${tasks.length} tasks`);

if (tasks[0]) {
  const task = await taskwarrior.getTask(tasks[0].uuid);
  console.log(task?.description ?? "Task not found");
}
```

For more examples, [read the examples guide](./docs/examples.md). For failures,
see [error handling](./docs/errors.md).

## Development

Clone the repository and install development dependencies:

```bash
git clone https://github.com/Sief-Ali/taskwarrior-adapter.git
cd taskwarrior-adapter
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

Runnable examples use the current Taskwarrior installation and data by default:

```bash
pnpm example:read
pnpm example:get-task -- <task-uuid>
pnpm example:query -- <project>
pnpm example:create -- <description...>
pnpm example:modify -- <task-uuid> <new-description...>
pnpm example:complete -- <task-uuid>
pnpm example:delete -- <task-uuid>
pnpm example:start -- <task-uuid>
pnpm example:stop -- <task-uuid>
pnpm example:configured
pnpm example:custom-attributes
pnpm example:errors
```

The create, modify, complete, delete, start, and stop examples write to the configured
Taskwarrior data. Other examples are read-only. See [the example guide](./docs/examples.md)
for details and configuration environment variables.

## Safety and design

- Taskwarrior remains the source of truth; the library does not access its internal database.
- The adapter prefers machine-readable output over parsing the human-readable terminal table.
- UUIDs are used for task identity rather than numeric task IDs.
- The executable is invoked without a shell.
- Arbitrary Taskwarrior filter expressions are not included in this release.
- Use a dedicated Taskwarrior data directory for tests; do not use everyday task data for tests that perform writes.

## Roadmap

1. **Current:** version, export, UUID lookup, constrained queries, task creation, modification, completion, soft deletion, start, and stop.
2. Add annotations, dependencies, and other native task operations.
3. Add reporting helpers after verifying the underlying operations.

## License

MIT. See [`LICENSE`](https://github.com/Sief-Ali/taskwarrior-adapter/blob/master/LICENSE).

---

## A note about this project's origin

This library started as a conversation with ChatGPT. I expected a helping response and guidance to build it step by step, but ChatGPT surprised me by producing a working first version of the library instead. That unexpected start turned into this project—and now I'm continuing to develop it, test it, and make it useful for other Taskwarrior users.
