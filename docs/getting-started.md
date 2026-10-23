# Getting started

## Requirements

- Node.js 20 or later.
- Taskwarrior installed and available as `task`, or a configured executable path.
- Taskwarrior 3.5.0 is the initial compatibility target.

The npm package does not install Taskwarrior.

## Install

```bash
npm install taskwarrior-adapter
```

## First read

```ts
import { TaskwarriorClient } from "taskwarrior-adapter";

const taskwarrior = new TaskwarriorClient();
const version = await taskwarrior.getVersion();
const tasks = await taskwarrior.listTasks();

console.log(`Taskwarrior ${version}: ${tasks.length} exported task(s)`);
```

The client reads Taskwarrior's machine-readable export. This package is read-only:
it does not create, modify, complete, or delete tasks.

See the [API reference](./api-reference.md), [examples](./examples.md), and
[error handling guide](./errors.md) for more.
