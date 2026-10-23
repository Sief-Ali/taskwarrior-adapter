import assert from "node:assert/strict";
import { chmod, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { TaskwarriorClient } from "../src/index.js";
import { TaskwarriorError } from "../src/index.js";
import type { TaskStatus } from "../src/index.js";

const sampleUuid = "a360fc44-315c-4366-b70c-ea7e7520b749";
const secondUuid = "b360fc44-315c-4366-b70c-ea7e7520b740";

async function createArgumentEchoCommand(): Promise<{
  directory: string;
  commandPath: string;
  argsPath: string;
}> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "taskwarrior-query-test-"));
  const commandPath = path.join(directory, "fake-task");
  const argsPath = path.join(directory, "args.json");
  const script = `#!/usr/bin/env node
const args = process.argv.slice(2);
if (process.env.TASKWARRIOR_TEST_ARGS) {
  require("node:fs").writeFileSync(process.env.TASKWARRIOR_TEST_ARGS, JSON.stringify(args));
}
process.stdout.write(JSON.stringify([{ uuid: "${sampleUuid}", receivedArgs: args }]));
`;
  await writeFile(commandPath, script, "utf8");
  await chmod(commandPath, 0o755);
  return { directory, commandPath, argsPath };
}

async function createFakeTaskCommand(): Promise<{ directory: string; commandPath: string }> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "taskwarrior-adapter-test-"));
  const commandPath = path.join(directory, "fake-task");
  const script = `#!/usr/bin/env node
const args = process.argv.slice(2);
const tasks = [
  { uuid: "${sampleUuid}", id: 1, description: "Buy milk", status: "pending", project: "Home", tags: ["errands"], custom_attribute: "preserved" },
  { uuid: "${secondUuid}", id: 2, description: "Read docs", status: "completed" }
];
if (args.includes("--version")) {
  process.stdout.write("Taskwarrior 3.5.0\\n");
  process.exit(0);
}
const uuidFilter = args.find((value) => value.startsWith("uuid:"));
const result = uuidFilter ? tasks.filter((task) => task.uuid === uuidFilter.slice("uuid:".length)) : tasks;
if (!args.includes("export")) {
  process.stderr.write("Unexpected fake CLI command");
  process.exit(2);
}
process.stdout.write(JSON.stringify(result));
`;
  await writeFile(commandPath, script, "utf8");
  await chmod(commandPath, 0o755);
  return { directory, commandPath };
}

test("getVersion returns Taskwarrior version", async (t) => {
  if (process.platform === "win32") {
    t.skip("The fake executable uses a POSIX shebang.");
    return;
  }

  const fake = await createFakeTaskCommand();
  t.after(() => rm(fake.directory, { recursive: true, force: true }));
  const client = new TaskwarriorClient({ commandPath: fake.commandPath });
  assert.equal(await client.getVersion(), "Taskwarrior 3.5.0");
});

test("listTasks parses JSON and preserves unknown attributes", async (t) => {
  if (process.platform === "win32") {
    t.skip("The fake executable uses a POSIX shebang.");
    return;
  }

  const fake = await createFakeTaskCommand();
  t.after(() => rm(fake.directory, { recursive: true, force: true }));
  const client = new TaskwarriorClient({ commandPath: fake.commandPath });
  const tasks = await client.listTasks();

  assert.equal(tasks.length, 2);
  assert.equal(tasks[0]?.description, "Buy milk");
  assert.deepEqual(tasks[0]?.tags, ["errands"]);
  assert.equal(tasks[0]?.custom_attribute, "preserved");
});

test("getTask returns a task by UUID and null when it does not exist", async (t) => {
  if (process.platform === "win32") {
    t.skip("The fake executable uses a POSIX shebang.");
    return;
  }

  const fake = await createFakeTaskCommand();
  t.after(() => rm(fake.directory, { recursive: true, force: true }));
  const client = new TaskwarriorClient({ commandPath: fake.commandPath });

  assert.equal((await client.getTask(sampleUuid))?.description, "Buy milk");
  assert.equal(await client.getTask("c360fc44-315c-4366-b70c-ea7e7520b741"), null);
});

test("getTask rejects malformed UUIDs before running the CLI", async () => {
  const client = new TaskwarriorClient({ commandPath: "this-command-must-not-run" });
  await assert.rejects(
    () => client.getTask("1; delete all tasks"),
    (error: unknown) => error instanceof TaskwarriorError && error.code === "INVALID_UUID",
  );
});

test("task query builder maps supported filters to individual CLI arguments", async (t) => {
  if (process.platform === "win32") {
    t.skip("The fake executable uses a POSIX shebang.");
    return;
  }

  const fake = await createArgumentEchoCommand();
  t.after(() => rm(fake.directory, { recursive: true, force: true }));
  const client = new TaskwarriorClient({
    commandPath: fake.commandPath,
    env: { TASKWARRIOR_TEST_ARGS: fake.argsPath },
  });
  const tasks = await client.tasks
    .query()
    .project("Work Project")
    .status("pending")
    .tag("urgent")
    .tag("on-hold")
    .execute();

  assert.deepEqual(tasks[0]?.receivedArgs, [
    "project:'Work Project'",
    "status:pending",
    "+urgent",
    "+on-hold",
    "export",
    "rc.json.array=on",
    "rc.verbose=nothing",
  ]);
});

test("task query builder rejects unsafe filter values before running the CLI", async () => {
  const client = new TaskwarriorClient({ commandPath: "this-command-must-not-run" });

  assert.throws(
    () => client.tasks.query().project("Home or project:Secret"),
    (error: unknown) =>
      error instanceof TaskwarriorError && error.code === "INVALID_FILTER",
  );

  assert.throws(
    () => client.tasks.query().tag("urgent work"),
    (error: unknown) =>
      error instanceof TaskwarriorError && error.code === "INVALID_FILTER",
  );

  assert.throws(
    // Simulate an untyped JavaScript caller bypassing the public TaskStatus type.
    () => client.tasks.query().status("active" as TaskStatus),
    (error: unknown) =>
      error instanceof TaskwarriorError && error.code === "INVALID_FILTER",
  );
});

test("task create builder safely adds a description with supported attributes", async (t) => {
  if (process.platform === "win32") {
    t.skip("The fake executable uses a POSIX shebang.");
    return;
  }

  const fake = await createArgumentEchoCommand();
  t.after(() => rm(fake.directory, { recursive: true, force: true }));
  const client = new TaskwarriorClient({
    commandPath: fake.commandPath,
    env: { TASKWARRIOR_TEST_ARGS: fake.argsPath },
  });

  await client.tasks
    .create()
    .description("Buy bread & milk")
    .project("Work Project")
    .priority("H")
    .due("tomorrow")
    .tag("urgent")
    .execute();

  const args = JSON.parse(await readFile(fake.argsPath, "utf8"));
  assert.deepEqual(args, [
    "add",
    "project:'Work Project'",
    "priority:H",
    "due:tomorrow",
    "+urgent",
    "--",
    "Buy bread & milk",
  ]);
});

test("task create builder rejects invalid or missing input before running the CLI", async () => {
  const client = new TaskwarriorClient({ commandPath: "this-command-must-not-run" });

  assert.throws(
    () => client.tasks.create().description(" \n "),
    (error: unknown) =>
      error instanceof TaskwarriorError && error.code === "INVALID_INPUT",
  );
  await assert.rejects(
    () => client.tasks.create().execute(),
    (error: unknown) =>
      error instanceof TaskwarriorError && error.code === "INVALID_INPUT",
  );
});

test("task modify builder targets one UUID and applies partial field/tag changes", async (t) => {
  if (process.platform === "win32") {
    t.skip("The fake executable uses a POSIX shebang.");
    return;
  }

  const fake = await createArgumentEchoCommand();
  t.after(() => rm(fake.directory, { recursive: true, force: true }));
  const client = new TaskwarriorClient({
    commandPath: fake.commandPath,
    env: { TASKWARRIOR_TEST_ARGS: fake.argsPath },
  });

  await client.tasks
    .modify(sampleUuid)
    .description("New description & notes")
    .project("Work Project")
    .priority("M")
    .due("tomorrow")
    .addTag("follow-up")
    .removeTag("urgent")
    .execute();

  const args = JSON.parse(await readFile(fake.argsPath, "utf8"));
  assert.deepEqual(args, [
    `uuid:${sampleUuid}`,
    "modify",
    "project:'Work Project'",
    "priority:M",
    "due:tomorrow",
    "+follow-up",
    "-urgent",
    "--",
    "New description & notes",
  ]);
});

test("task modify builder rejects invalid UUIDs and empty modifications", async () => {
  const client = new TaskwarriorClient({ commandPath: "this-command-must-not-run" });

  assert.throws(
    () => client.tasks.modify("not-a-uuid"),
    (error: unknown) => error instanceof TaskwarriorError && error.code === "INVALID_UUID",
  );
  await assert.rejects(
    () => client.tasks.modify(sampleUuid).execute(),
    (error: unknown) =>
      error instanceof TaskwarriorError && error.code === "INVALID_INPUT",
  );
});

test("complete command completes one task by UUID", async (t) => {
  if (process.platform === "win32") {
    t.skip("The fake executable uses a POSIX shebang.");
    return;
  }

  const fake = await createArgumentEchoCommand();
  t.after(() => rm(fake.directory, { recursive: true, force: true }));
  const client = new TaskwarriorClient({
    commandPath: fake.commandPath,
    env: { TASKWARRIOR_TEST_ARGS: fake.argsPath },
  });

  await client.tasks.complete(sampleUuid).execute();

  const args = JSON.parse(await readFile(fake.argsPath, "utf8"));
  assert.deepEqual(args, [`uuid:${sampleUuid}`, "done"]);
});

test("complete command rejects malformed UUIDs before running the CLI", async () => {
  const client = new TaskwarriorClient({ commandPath: "this-command-must-not-run" });

  assert.throws(
    () => client.tasks.complete("not-a-uuid"),
    (error: unknown) => error instanceof TaskwarriorError && error.code === "INVALID_UUID",
  );
});

test("delete command marks one UUID deleted and disables confirmation", async (t) => {
  if (process.platform === "win32") {
    t.skip("The fake executable uses a POSIX shebang.");
    return;
  }

  const fake = await createArgumentEchoCommand();
  t.after(() => rm(fake.directory, { recursive: true, force: true }));
  const client = new TaskwarriorClient({
    commandPath: fake.commandPath,
    env: { TASKWARRIOR_TEST_ARGS: fake.argsPath },
  });

  await client.tasks.delete(sampleUuid).execute();

  const args = JSON.parse(await readFile(fake.argsPath, "utf8"));
  assert.deepEqual(args, ["rc.confirmation=no", `uuid:${sampleUuid}`, "delete"]);
});

test("delete command rejects malformed UUIDs before running the CLI", async () => {
  const client = new TaskwarriorClient({ commandPath: "this-command-must-not-run" });

  assert.throws(
    () => client.tasks.delete("not-a-uuid"),
    (error: unknown) => error instanceof TaskwarriorError && error.code === "INVALID_UUID",
  );
});

test("start command starts one task by UUID", async (t) => {
  if (process.platform === "win32") {
    t.skip("The fake executable uses a POSIX shebang.");
    return;
  }

  const fake = await createArgumentEchoCommand();
  t.after(() => rm(fake.directory, { recursive: true, force: true }));
  const client = new TaskwarriorClient({
    commandPath: fake.commandPath,
    env: { TASKWARRIOR_TEST_ARGS: fake.argsPath },
  });

  await client.tasks.start(sampleUuid).execute();

  const args = JSON.parse(await readFile(fake.argsPath, "utf8"));
  assert.deepEqual(args, [`uuid:${sampleUuid}`, "start"]);
});

test("start command rejects malformed UUIDs before running the CLI", async () => {
  const client = new TaskwarriorClient({ commandPath: "this-command-must-not-run" });

  assert.throws(
    () => client.tasks.start("not-a-uuid"),
    (error: unknown) => error instanceof TaskwarriorError && error.code === "INVALID_UUID",
  );
});

test("stop command stops one task by UUID", async (t) => {
  if (process.platform === "win32") {
    t.skip("The fake executable uses a POSIX shebang.");
    return;
  }

  const fake = await createArgumentEchoCommand();
  t.after(() => rm(fake.directory, { recursive: true, force: true }));
  const client = new TaskwarriorClient({
    commandPath: fake.commandPath,
    env: { TASKWARRIOR_TEST_ARGS: fake.argsPath },
  });

  await client.tasks.stop(sampleUuid).execute();

  const args = JSON.parse(await readFile(fake.argsPath, "utf8"));
  assert.deepEqual(args, [`uuid:${sampleUuid}`, "stop"]);
});

test("stop command rejects malformed UUIDs before running the CLI", async () => {
  const client = new TaskwarriorClient({ commandPath: "this-command-must-not-run" });

  assert.throws(
    () => client.tasks.stop("not-a-uuid"),
    (error: unknown) => error instanceof TaskwarriorError && error.code === "INVALID_UUID",
  );
});
