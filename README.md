# Taskwarrior CLI Adapter

A small, typed Node.js/TypeScript library for talking to Taskwarrior through its CLI. This is an independent package: it has no Express dependency and can be used by a backend, script, desktop app, or other Node.js project.

> **Status: early development (`0.1.0`).** This milestone is read-only. Create/update/complete/delete operations will be added after the CLI boundary is verified against Taskwarrior 3.5.0.

## Design goals

- Use Taskwarrior itself as the source of truth; do not access its internal database.
- Prefer machine-readable `task export` JSON to terminal tables.
- Preserve unknown task fields so user-defined attributes are not discarded.
- Invoke the executable with an argument array and `shell: false`.
- Use UUIDs for task identity, not volatile numeric IDs.
- Expose plain async methods without binding the package to a web framework.
- Allow a separate config/data directory for safe integration tests.

## Requirements

- Node.js 20 or later
- Taskwarrior installed and available as `task` (or provide `commandPath`)
- Taskwarrior 3.5.0 is the initial verification target

## Install for development

```bash
pnpm install
pnpm build
pnpm test
pnpm typecheck
```

## Current API

```ts
import { TaskwarriorClient } from "taskwarrior-cli-adapter";

const taskwarrior = new TaskwarriorClient();

const version = await taskwarrior.getVersion();
const tasks = await taskwarrior.listTasks();
const task = await taskwarrior.getTask("a360fc44-315c-4366-b70c-ea7e7520b749");
```

- `getVersion(): Promise<string>` runs `task --version`.
- `listTasks(): Promise<TaskwarriorTask[]>` exports the task set without applying a default status filter.
- `getTask(uuid): Promise<TaskwarriorTask | null>` selects one task by UUID.

`TaskwarriorTask` has typed common fields and an index signature to keep additional Taskwarrior attributes available. The API intentionally does not yet accept arbitrary filter strings. Filter support will get a separate design so a user-supplied string cannot accidentally be interpreted as a CLI command.

## Options

```ts
const taskwarrior = new TaskwarriorClient({
  commandPath: "task",       // default
  timeoutMs: 10_000,          // default
  maxOutputBytes: 10 * 1024 * 1024, // default
  taskrcPath: "/tmp/taskrc",  // optional: sets TASKRC
  dataLocation: "/tmp/task-data", // optional: sets TASKDATA
  env: {},                    // optional additional environment overrides
});
```

`taskrcPath` and `dataLocation` are especially useful for integration tests. Point both at a dedicated test setup; never point a test at your regular task data directory if the test will perform writes.

## Read your existing tasks (read-only example)

From the package directory:

```bash
pnpm example:read
```

This reads the configured Taskwarrior data and prints a small selection of each exported task. It does not modify tasks or Taskwarrior configuration.

## Errors

Operations throw `TaskwarriorError` with a stable `code` such as:

- `NOT_INSTALLED`
- `COMMAND_FAILED`
- `COMMAND_TIMEOUT`
- `OUTPUT_LIMIT`
- `INVALID_JSON`
- `INVALID_TASK_DATA`
- `INVALID_UUID`

The error also carries the CLI arguments, exit code/signal when available, and stderr. Do not blindly return all error details to an HTTP client; the consumer should decide what to log and what to expose.

## Planned milestones

1. **Read foundation (current):** version, export all tasks, get by UUID.
2. Safe query/filter support with a constrained API.
3. Create and update tasks using Taskwarrior's supported interfaces.
4. Complete and soft-delete operations; never use `purge` for ordinary API deletion.
5. Tags, annotations, dates, dependencies and other native operations.
6. Reporting helpers once the underlying operations are verified.

## License

MIT. See `LICENSE`.
