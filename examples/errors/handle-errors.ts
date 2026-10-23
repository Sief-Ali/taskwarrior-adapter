import { TaskwarriorClient, TaskwarriorError } from "../src/index.js";

const client = new TaskwarriorClient();

try {
  const tasks = await client.listTasks();
  console.log(`Read ${tasks.length} task(s).`);
} catch (error) {
  if (error instanceof TaskwarriorError) {
    console.error(`Taskwarrior error [${error.code}]: ${error.message}`);
    console.error("Diagnostic:", error.detail);
  } else {
    console.error("Unexpected error:", error);
  }

  process.exitCode = 1;
}
