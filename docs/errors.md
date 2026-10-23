# Error handling

Client methods reject with `TaskwarriorError` when Taskwarrior cannot be run or
its output cannot be used. The error exposes:

- `code`: stable adapter error classification (`TaskwarriorErrorCode`).
- `message`: stable, adapter-owned message suitable for consistent handling.
- `detail`: diagnostic text specific to the failure.
- `args`: command arguments, when available.
- `exitCode` and `signal`: process exit information, when available.
- `stderr`: captured standard error, when available.
- `cause`: the underlying error for failures that have one.

`message` and `code` are adapter-level values, not HTTP status codes or API
response codes. A consuming application should map them to its own transport or
presentation layer. Treat `detail`, `args`, and `stderr` as diagnostics; do not
return them to untrusted clients.

## Error codes

| Code | Stable message | Raised when |
| --- | --- | --- |
| `NOT_INSTALLED` | `Taskwarrior is not installed or is unavailable.` | The configured executable cannot be found. |
| `COMMAND_FAILED` | `Taskwarrior could not complete the requested operation.` | The process cannot start for another reason, exits unsuccessfully, or `--version` returns empty output. |
| `COMMAND_TIMEOUT` | `Taskwarrior did not respond before the command timed out.` | A command exceeds `timeoutMs`. |
| `OUTPUT_LIMIT` | `Taskwarrior returned more data than the adapter can process.` | Combined stdout and stderr exceed `maxOutputBytes`. |
| `INVALID_JSON` | `Taskwarrior returned data the adapter could not read.` | Export output is not valid JSON. |
| `INVALID_TASK_DATA` | `Taskwarrior returned task data the adapter could not read.` | JSON is not an array of objects with valid UUIDs. |
| `INVALID_UUID` | `The task UUID is invalid.` | `getTask` receives a value outside the canonical UUID format. |
| `INVALID_FILTER` | `The task query contains an invalid filter.` | A query builder project or tag value is malformed, a tag contains spaces, or the status is unsupported. |

Constructor option validation throws `RangeError` rather than `TaskwarriorError`.
A valid UUID with no matching task is not an error; `getTask` returns `null`.

## Handle adapter errors

```ts
import {
  TaskwarriorClient,
  TaskwarriorError,
  type TaskwarriorErrorCode,
} from "taskwarrior-adapter";

function describeError(code: TaskwarriorErrorCode): string {
  switch (code) {
    case "NOT_INSTALLED":
      return "Install Taskwarrior or configure commandPath.";
    case "COMMAND_FAILED":
      return "Check the Taskwarrior command and its configuration.";
    case "COMMAND_TIMEOUT":
      return "Retry later or increase timeoutMs if this is expected.";
    case "OUTPUT_LIMIT":
      return "Increase maxOutputBytes if the exported dataset is expected.";
    case "INVALID_JSON":
    case "INVALID_TASK_DATA":
      return "Check Taskwarrior's version and export configuration.";
    case "INVALID_UUID":
      return "Provide a task UUID in canonical format.";
    case "INVALID_FILTER":
      return "Use a project or tag value with supported characters.";
  }
}

const client = new TaskwarriorClient();

try {
  const tasks = await client.listTasks();
  console.log(`Read ${tasks.length} tasks.`);
} catch (error) {
  if (error instanceof TaskwarriorError) {
    console.error(error.code, error.message);
    console.error("Diagnostic:", error.detail);
    console.error(describeError(error.code));
  } else {
    throw error;
  }
}
```

Adapt the messages to your application; do not silently convert unknown errors
into successful results.
