import { TaskwarriorClient } from "../../src/index.js";

const description = process.argv.slice(2).join(" ");

if (description.trim().length === 0) {
  console.error("Usage: pnpm example:create -- <description...>");
  process.exitCode = 1;
} else {
  const client = new TaskwarriorClient();

  try {
    await client.tasks.create().description(description).execute();
    console.log("Task created.");
  } catch (error) {
    console.error("Could not create task:");
    console.error(error);
    process.exitCode = 1;
  }
}
