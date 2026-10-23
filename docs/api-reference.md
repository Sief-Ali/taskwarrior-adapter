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

## `client.tasks.create()`

Creates a fluent add-command builder. A description is required; project, priority,
due date, and tags are optional:

```ts
await client.tasks
  .create()
  .description("Buy bread and milk")
  .project("Home")
  .priority("H")
  .due("tomorrow")
  .tag("errands")
  .execute();
```

`execute()` resolves to `Promise<void>` after Taskwarrior successfully adds the
task. It does not parse human-readable CLI output to guess the generated ID or UUID.
Descriptions are passed after Taskwarrior's `--` delimiter so description text is
not interpreted as filters or attributes. The operation writes to the configured
Taskwarrior data and should be treated as a real mutation.

Project values allow letters, numbers, spaces, `.`, `_`, and `-` (up to 256
characters). Tags allow the same characters except spaces (up to 256 characters).
Priority is `H`, `M`, or `L`. Due values are single Taskwarrior date tokens using
letters, numbers, `.`, `_`, `+`, or `-` (up to 128 characters). Descriptions must
be non-empty, no longer than 4096 characters, and contain no NUL character.
Invalid inputs throw `TaskwarriorError` with code `INVALID_INPUT`.

## `client.tasks.modify(uuid)`

Creates a fluent command to modify one task by canonical UUID. Only fields added
to the builder are changed; unspecified values are left untouched:

```ts
await client.tasks
  .modify(taskUuid)
  .description("Buy bread and milk")
  .project("Home")
  .priority("M")
  .due("tomorrow")
  .addTag("errands")
  .removeTag("shopping")
  .execute();
```

Supported updates are description, project, priority, due date, and tags. Use
`addTag()` and `removeTag()` to adjust tags individually. `execute()` returns
`Promise<void>` after Taskwarrior successfully modifies the matching task. An
invalid UUID throws `TaskwarriorError` with code `INVALID_UUID`; an empty update
throws `INVALID_INPUT`.

The same value constraints as task creation apply: description must be non-empty,
at most 4096 characters, and contain no NUL; project/tag/date values must use
their documented safe characters; priority is `H`, `M`, or `L`.

## Current scope

The client does not yet expose completion, deletion, start/stop, or configuration
get/set commands. See [examples](./examples.md) for runnable usage patterns.
