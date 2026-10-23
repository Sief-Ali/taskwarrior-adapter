# Taskwarrior Adapter

A small, typed Node.js/TypeScript library for interacting with [Taskwarrior](https://taskwarrior.org/) through its command-line interface. It is independent of Express and can be used from a backend, script, desktop application, or another Node.js project.

> **Status: early development (`0.2.0`).** The current release is read-only. Create, update, complete, and delete operations are planned after the CLI boundary is verified against Taskwarrior 3.5.0.

- **GitHub:** https://github.com/Sief-Ali/taskwarrior-adapter
- **npm:** https://www.npmjs.com/package/taskwarrior-adapter

## Features

- Reads tasks using Taskwarrior's machine-readable `task export` output.
- Retrieves a task by UUID.
- Preserves additional task attributes not explicitly described in the TypeScript type.
- Executes the Taskwarrior CLI using argument arrays rather than shell command strings.
- Supports custom Taskwarrior configuration and data locations for isolated testing.
- Provides a typed asynchronous API without tying consumers to a web framework.
- Provides consistent adapter-owned error codes and stable error messages, with CLI diagnostics kept separately.

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

const task = await taskwarrior.getTask(
  "a360fc44-315c-4366-b70c-ea7e7520b749",
);

console.log(task);
```

Use a UUID from your own exported task data in the example above.

## Documentation

- [Getting started](./docs/getting-started.md): installation, prerequisites, and first use.
- [API reference](./docs/api-reference.md): methods, task types, and client options.
- [Examples](./docs/examples.md): examples for every currently supported method and setup option.
- [Error handling](./docs/errors.md): all adapter error codes, causes, and handling patterns.

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

To run the read-only example against your configured Taskwarrior installation:

```bash
pnpm example:read
```

The example reads the configured task data and prints a small selection of exported tasks. It does not intentionally modify tasks or Taskwarrior configuration.

Internally, `core/` contains process execution, shared adapter errors, and base
types; task export parsing and read operations live in `operations/queries.ts`;
shared UUID and task-export validation lives in `utils/validation.ts`. Mutation
and configuration modules will be added alongside queries when those operations
are supported. Public methods and package exports remain unchanged; this
separation is an implementation detail, not a change to the consumer API.

## Safety and design

- Taskwarrior remains the source of truth; the library does not access its internal database.
- The adapter prefers machine-readable output over parsing the human-readable terminal table.
- UUIDs are used for task identity rather than numeric task IDs.
- The executable is invoked without a shell.
- Write operations are not included in this release. When they are added, tests should use isolated Taskwarrior data and ordinary deletion should never invoke `purge`.

## Roadmap

1. **Read foundation (current):** version, export tasks, retrieve by UUID.
2. Add safe, constrained query and filtering support.
3. Add task creation and updates using supported Taskwarrior interfaces.
4. Add completion and soft deletion.
5. Add tags, annotations, dates, dependencies, and other native task operations.
6. Add reporting helpers after verifying the underlying operations.

## License

MIT. See [`LICENSE`](https://github.com/Sief-Ali/taskwarrior-adapter/blob/master/LICENSE).

---

## A note about this project's origin

This library started as a conversation with ChatGPT. I expected a helping response and guidance to build it step by step, but ChatGPT surprised me by producing a working first version of the library instead. That unexpected start turned into this project—and now I'm continuing to develop it, test it, and make it useful for other Taskwarrior users.
