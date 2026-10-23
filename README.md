# Taskwarrior Adapter

A small, typed Node.js/TypeScript library for reading task data through the
[Taskwarrior](https://taskwarrior.org/) command-line interface. It can be used
from a backend, script, desktop application, or other Node.js project; it does
not depend on a web framework.

> **Status: early development (`0.2.1`).** The adapter is read-only: it can check
> the Taskwarrior version, list and filter exported tasks, and retrieve a task by
> UUID. It does not create, modify, complete, or delete tasks.

- **GitHub:** https://github.com/Sief-Ali/taskwarrior-adapter
- **npm:** https://www.npmjs.com/package/taskwarrior-adapter

## Documentation

Choose a guide:

- [Getting started](./docs/getting-started.md) — prerequisites, installation, and first use.
- [API reference](./docs/api-reference.md) — supported methods, task types, and client options.
- [Runnable examples](./examples/) — TypeScript programs for the supported methods and options.
- [Example guide](./docs/examples.md) — what each example demonstrates and how to run it.
- [Error handling](./docs/errors.md) — all adapter error codes and how to handle them.

## Features

- Checks the installed Taskwarrior version.
- Lists tasks using Taskwarrior's machine-readable `task export` output.
- Builds constrained queries by project, status, and required tags.
- Retrieves a task by UUID (returns `null` if there is no match).
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
pnpm example:configured
pnpm example:custom-attributes
pnpm example:errors
```

The examples are read-only. See [the example guide](./docs/examples.md) for
details and configuration environment variables.

## Safety and design

- Taskwarrior remains the source of truth; the library does not access its internal database.
- The adapter prefers machine-readable output over parsing the human-readable terminal table.
- UUIDs are used for task identity rather than numeric task IDs.
- The executable is invoked without a shell.
- Mutations and arbitrary Taskwarrior filter expressions are not included in this release.
- Use a dedicated Taskwarrior data directory for tests; do not use everyday task data for tests that perform writes.

## Roadmap

1. **Read foundation (current):** version, export tasks, retrieve by UUID, and constrained queries.
2. Add task creation and updates using supported Taskwarrior interfaces.
3. Add completion and soft deletion.
4. Add tags, annotations, dates, dependencies, and other native task operations.
5. Add reporting helpers after verifying the underlying operations.

## License

MIT. See [`LICENSE`](https://github.com/Sief-Ali/taskwarrior-adapter/blob/master/LICENSE).

---

## A note about this project's origin

This library started as a conversation with ChatGPT. I expected a helping response and guidance to build it step by step, but ChatGPT surprised me by producing a working first version of the library instead. That unexpected start turned into this project—and now I'm continuing to develop it, test it, and make it useful for other Taskwarrior users.
