import { TaskwarriorClient } from "../src/index.js";

const uuid = process.argv[2];

if (!uuid) {
  console.error("Usage: pnpm example:delete -- <task-uuid>");
  process.exitCode = 1;
} else {
  const client = new TaskwarriorClient();

  try {
    await client.tasks.delete(uuid).execute();
    console.log(`Marked task ${uuid} as deleted.`);
  } catch (error) {
    console.error("Could not delete task:");
    console.error(error);
    process.exitCode = 1;
  }
}
