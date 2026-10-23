import { TaskwarriorClient } from "../../src/index.js";

const uuid = process.argv[2];

if (!uuid) {
  console.error("Usage: pnpm example:start -- <task-uuid>");
  process.exitCode = 1;
} else {
  const client = new TaskwarriorClient();

  try {
    await client.tasks.start(uuid).execute();
    console.log(`Started work on task ${uuid}.`);
  } catch (error) {
    console.error("Could not start task:");
    console.error(error);
    process.exitCode = 1;
  }
}
