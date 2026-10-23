# API reference

The package exports `TaskwarriorClient`, `TaskwarriorError`,
`TaskwarriorErrorCode`, `TaskwarriorErrorOptions`, `TaskwarriorClientOptions`, and
`TaskwarriorTask` from `taskwarrior-adapter`.

## `new TaskwarriorClient(options?)`

Creates a client. Options are optional:

| Option | Type | Default | Description |
| --- | --- | --- | --- |
| `commandPath` | `string` | `"task"` | Taskwarrior executable name or path. |
| `timeoutMs` | `number` | `10_000` | Maximum duration of each command. Must be finite and positive. |
| `maxOutputBytes` | `number` | `10 * 1024 * 1024` | Maximum combined stdout and stderr. Must be a positive safe integer. |
| `taskrcPath` | `string` | unset | Sets `TASKRC` for the child process. |
| `dataLocation` | `string` | unset | Sets `TASKDATA` for the child process. |
| `env` | `NodeJS.ProcessEnv` | inherited process environment | Additional child-process environment variables. |

`taskrcPath` overrides `TASKRC` from `env`, and `dataLocation` overrides
`TASKDATA` from `env`. Options are applied to each Taskwarrior command without
mutating the parent process environment. Invalid timeout or output-limit values
throw `RangeError` from the constructor.

## `getVersion(): Promise<string>`

Runs `task --version` and returns the trimmed output. A missing executable,
non-zero exit, timeout, or empty version output rejects with `TaskwarriorError`.

## `listTasks(): Promise<TaskwarriorTask[]>`

Runs a JSON export and returns all tasks included by Taskwarrior's export behavior
and configuration. It does not add an application-level status filter. Invalid
JSON or invalid task objects reject with `TaskwarriorError`.

## `getTask(uuid: string): Promise<TaskwarriorTask | null>`

Requires a canonical 8-4-4-4-12 hexadecimal UUID. An invalid UUID rejects with
`TaskwarriorError` code `INVALID_UUID` before starting the CLI. A valid UUID that
does not match an exported task returns `null`.

## `TaskwarriorTask`

The type describes common fields (`uuid`, `description`, `status`, `id`, `entry`,
`modified`, `due`, `project`, `priority`, and `tags`). Taskwarrior can return
additional fields, including user-defined attributes; the type's index signature
preserves those values as `unknown`.

## `client.tasks.query()`

Creates a fluent query builder. Supported filters are combined with AND semantics:

```ts
const tasks = await client.tasks
  .query()
  .project("Work")
  .status("pending")
  .tag("urgent")
  .execute();
```

- `project(value)` selects tasks in the project. Project names can contain spaces.
- `status(value)` accepts `pending`, `completed`, `deleted`, `waiting`, or `recurring`.
- `tag(value)` requires a tag; repeated calls require every listed tag. Tag values
  cannot contain spaces.
- `execute()` runs the query and returns `Promise<TaskwarriorTask[]>`.

Calling `project()` repeatedly replaces the previous project filter. Calling
`status()` repeatedly replaces the previous status filter. Project values must
contain only letters, numbers, spaces, `.`, `_`, or `-`; tag values allow the same
characters except spaces. Both are limited to 256 characters. Invalid values throw
`TaskwarriorError` with code `INVALID_FILTER`. The builder intentionally does not
accept arbitrary Taskwarrior filter expressions.

## Current scope

The client does not currently expose mutations or configuration get/set commands.
See [examples](./examples.md) for complete usage patterns for the supported methods.
