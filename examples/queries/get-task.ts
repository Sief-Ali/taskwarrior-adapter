import { TaskwarriorClient } from "../src/index.js";

const uuid = process.argv[2];

if (!uuid) {
  console.error("Usage: pnpm example:get-task -- <task-uuid>");
  process.exitCode = 1;
} else {
  const client = new TaskwarriorClient();

  try {
    const task = await client.getTask(uuid);

    if (task === null) {
      console.log(`No task found with UUID ${uuid}.`);
    } else {
      console.log(task);
    }
  } catch (error) {
    console.error("Could not retrieve task:");
    console.error(error);
    process.exitCode = 1;
  }
}
