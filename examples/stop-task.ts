import { TaskwarriorClient } from "../src/index.js";

const uuid = process.argv[2];

if (!uuid) {
  console.error("Usage: pnpm example:stop -- <task-uuid>");
  process.exitCode = 1;
} else {
  const client = new TaskwarriorClient();

  try {
    await client.tasks.stop(uuid).execute();
    console.log(`Stopped work on task ${uuid}.`);
  } catch (error) {
    console.error("Could not stop task:");
    console.error(error);
    process.exitCode = 1;
  }
}
