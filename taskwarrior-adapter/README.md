# Taskwarrior CLI Adapter

A small, typed Node.js library for interacting with [Taskwarrior](https://taskwarrior.org/) through its command-line interface.

This package gives JavaScript and TypeScript applications a reusable API without tying them to Express, a database implementation, or a particular frontend. Taskwarrior remains the source of truth; the adapter invokes the `task` executable and consumes its machine-readable JSON output.

> **Status: early development — `0.1.0`.** The current release is read-only and intended for experimentation. It supports checking the installed version, listing exported tasks, and retrieving a task by UUID. Write operations and filtering are not implemented yet.

## Why this package?

- **Taskwarrior remains in control.** The adapter does not read or modify Taskwarrior's internal database.
- **Typed API.** Use familiar asynchronous TypeScript methods instead of parsing terminal tables yourself.
- **Preserves extra attributes.** Unknown fields, including user-defined attributes (UDAs), remain available on returned task objects.
- **Safer process execution.** Commands are started without a shell, with configurable timeouts and output limits.
- **Framework-independent.** Use it from an Express backend, a script, a desktop application, or another Node.js project.
- **Test-friendly configuration.** Point it at a separate Taskwarrior configuration and data directory for isolated tests.

## Requirements

- Node.js **20 or later**
- Taskwarrior installed and available as `task`, or configure a custom executable path
- Initially developed for Taskwarrior **3.5.0**; compatibility with other versions should be verified in your environment

## Installation

Once the package is published to npm:

```bash
npm install taskwarrior-cli-adapter
```

Or with pnpm:

```bash
pnpm add taskwarrior-cli-adapter
```

Taskwarrior itself is a separate system dependency. Installing this npm package does not install the Taskwarrior executable.

## Quick start

```ts
import { TaskwarriorClient } from "taskwarrior-cli-adapter";

const taskwarrior = new TaskwarriorClient();

const version = await taskwarrior.getVersion();
console.log("Taskwarrior version:", version);

const tasks = await taskwarrior.listTasks();
console.log(`Exported ${tasks.length} tasks`);

for (const task of tasks) {
  console.log(task.uuid, task.status, task.description);
}

const task = await taskwarrior.getTask(
  "a360fc44-315c-4366-b70c-ea7e7520b749",
);

if (task) {
  console.log("Found task:", task.description);
} else {
  console.log("Task not found");
}
```

The methods are asynchronous and return promises. The example UUID above is illustrative; use a UUID returned by your own Taskwarrior installation.

## API reference

### `new TaskwarriorClient(options?)`

Creates a client. Options are all optional.

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `commandPath` | `string` | `"task"` | Executable name or absolute path to the Taskwarrior CLI. |
| `timeoutMs` | `number` | `10000` | Maximum duration for a command, in milliseconds. Must be positive. |
| `maxOutputBytes` | `number` | `10485760` | Maximum combined stdout and stderr output, in bytes. Must be a positive safe integer. |
| `taskrcPath` | `string` | inherited/default | Optional path assigned to `TASKRC`. |
| `dataLocation` | `string` | inherited/default | Optional path assigned to `TASKDATA`. |
| `env` | `NodeJS.ProcessEnv` | inherited environment | Additional environment variables for the child process. |

Example using an isolated Taskwarrior setup:

```ts
import { TaskwarriorClient } from "taskwarrior-cli-adapter";

const taskwarrior = new TaskwarriorClient({
  taskrcPath: "/tmp/taskwarrior-test/taskrc",
  dataLocation: "/tmp/taskwarrior-test/data",
  timeoutMs: 5_000,
});
```

Create and configure the test Taskwarrior environment before using these paths. Do not point a test that may eventually perform writes at your everyday task data directory.

### `getVersion(): Promise<string>`

Runs `task --version` and returns the trimmed version output. Taskwarrior documents this command as a way for external applications to check the installed version.

### `listTasks(): Promise<TaskwarriorTask[]>`

Runs Taskwarrior's JSON `export` command and returns the exported task objects. The adapter requests array-form JSON and does not add a status filter of its own, so the returned set can include tasks beyond the pending list.

### `getTask(uuid: string): Promise<TaskwarriorTask | null>`

Looks up a task by UUID and returns the task or `null` if no matching task is found. The UUID must use the canonical `8-4-4-4-12` hexadecimal format. Numeric task IDs are intentionally not accepted as stable identifiers.

### `TaskwarriorTask`

`TaskwarriorTask` types common attributes such as `uuid`, `description`, `status`, `id`, `project`, `priority`, and `tags`. Taskwarrior can also return other attributes, including custom UDAs. An index signature preserves those extra attributes rather than discarding them.

The exported `id` is a Taskwarrior-generated identifier and should not be treated as a permanent identity. Prefer `uuid` when storing references to a task.

### Errors

Operations reject with `TaskwarriorError` when the CLI cannot be started, fails, times out, exceeds the output limit, or returns invalid task data. Inspect its `code` to handle known error categories:

- `NOT_INSTALLED`
- `COMMAND_FAILED`
- `COMMAND_TIMEOUT`
- `OUTPUT_LIMIT`
- `INVALID_JSON`
- `INVALID_TASK_DATA`
- `INVALID_UUID`

The error may also include the command arguments, exit code, signal, and stderr. These details can be useful for local diagnostics, but applications should not blindly expose them to end users or HTTP clients.

## Development

Clone or download the repository, then run:

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

The tests use a fake CLI executable and do not need to change your real Taskwarrior tasks. To read tasks from your configured Taskwarrior installation, run:

```bash
pnpm example:read
```

This example is read-only. It prints a small selection of fields from the tasks returned by Taskwarrior.

## Current scope and roadmap

The initial release focuses on a small, reliable read-only foundation.

- [x] Read Taskwarrior version
- [x] Export tasks as structured JSON
- [x] Retrieve a task by UUID
- [x] Preserve unknown task attributes
- [x] Configurable command path, environment, timeout, and output limit
- [ ] Structured filters and query helpers
- [ ] Create and update tasks
- [ ] Complete and soft-delete tasks
- [ ] Tags, annotations, dates, dependencies, and other native operations
- [ ] Reporting and statistics helpers

The roadmap is not a promise that every feature will be implemented in the next release. API shape and behavior may change while the package is below `1.0.0`.

## Safety and design notes

- The adapter uses the Taskwarrior CLI rather than accessing its internal database.
- The CLI is launched without a shell. Do not treat arbitrary user-provided strings as safe Taskwarrior arguments.
- This version is read-only, but `listTasks()` may return completed and deleted records as well as pending tasks. Filter by `status` in your application if you need a particular view.
- When write operations are introduced, test them against a dedicated Taskwarrior data directory first. Ordinary deletion should use Taskwarrior's reversible/soft-delete behavior, not `purge`.
- Taskwarrior configuration, active contexts, hooks, and version differences can affect CLI behavior. Verify behavior against the Taskwarrior versions you intend to support.

## Contributing and issues

Bug reports, compatibility notes, and focused contributions are welcome. Before opening an issue, include your Node.js version, Taskwarrior version, the adapter method involved, and a minimal reproduction. Redact private task descriptions, paths, and other personal data from logs.

Repository and issue-tracker links will be added here when the public repository is established.

## License

MIT. See [LICENSE](./LICENSE).

---

### A note about how this project started

I asked ChatGPT for help figuring out how to build a Taskwarrior integration. I expected guidance and a bit of code to work through together—not to be surprised with a standalone library that was already usable for reading tasks. So this package began with an unexpectedly big head start, and now I'm taking it forward one step at a time. 😅
