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

## API

### `getVersion(): Promise<string>`

Runs `task --version` and returns the version output.

### `listTasks(): Promise<TaskwarriorTask[]>`

Returns tasks from Taskwarrior's JSON export. This does not apply an application-level status filter, so the returned set can include tasks in different statuses according to Taskwarrior's export behavior and configuration.

### `getTask(uuid): Promise<TaskwarriorTask | null>`

Looks up a task by UUID. Returns `null` when no matching task is found.

`TaskwarriorTask` describes common fields and preserves additional attributes so custom Taskwarrior fields are not discarded. The current API does not accept arbitrary filter strings; constrained filtering will be designed separately.

## Configuration

```ts
import { TaskwarriorClient } from "taskwarrior-adapter";

const taskwarrior = new TaskwarriorClient({
  commandPath: "task",                  // default
  timeoutMs: 10_000,                    // default
  maxOutputBytes: 10 * 1024 * 1024,     // default
  taskrcPath: "/tmp/taskrc",            // optional: sets TASKRC
  dataLocation: "/tmp/task-data",       // optional: sets TASKDATA
  env: {},                              // optional environment overrides
});
```

`taskrcPath` and `dataLocation` are useful for isolated integration tests. Point them at a dedicated test setup. Do not point tests that perform writes at your everyday Taskwarrior data directory.

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

## Errors

Operations can throw `TaskwarriorError` with a stable error code, including:

- `NOT_INSTALLED`
- `COMMAND_FAILED`
- `COMMAND_TIMEOUT`
- `OUTPUT_LIMIT`
- `INVALID_JSON`
- `INVALID_TASK_DATA`
- `INVALID_UUID`

`TaskwarriorError.code` and `message` provide a stable adapter-level error
classification and message. The original diagnostic message is available as `detail`,
with CLI arguments, exit code or signal when available, and standard error output.
Applications can map adapter errors to their own transport-specific error format;
avoid returning `detail`, `args`, or `stderr` directly to clients.

Internally, the public `TaskwarriorClient` delegates process execution and output
limits to a core executor, and task export parsing and read operations to a task
operations module. Its public methods remain unchanged; this separation is an
implementation detail, not a change to the consumer API.

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
