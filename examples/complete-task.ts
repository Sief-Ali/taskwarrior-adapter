import { TaskwarriorClient } from "../src/index.js";

const uuid = process.argv[2];

if (!uuid) {
  console.error("Usage: pnpm example:complete -- <task-uuid>");
  process.exitCode = 1;
} else {
  const client = new TaskwarriorClient();

  try {
    await client.tasks.complete(uuid).execute();
    console.log(`Completed task ${uuid}.`);
  } catch (error) {
    console.error("Could not complete task:");
    console.error(error);
    process.exitCode = 1;
  }
}
