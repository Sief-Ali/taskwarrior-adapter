import { TaskwarriorClient } from "../src/index.js";

const client = new TaskwarriorClient({
  commandPath: process.env.TASKWARRIOR_COMMAND ?? "task",
  timeoutMs: 15_000,
  maxOutputBytes: 20 * 1024 * 1024,
  ...(process.env.TASKRC ? { taskrcPath: process.env.TASKRC } : {}),
  ...(process.env.TASKDATA ? { dataLocation: process.env.TASKDATA } : {}),
  env: {
    TASK_COLOR: "off",
  },
});

try {
  const version = await client.getVersion();
  const tasks = await client.listTasks();

  console.log(`Taskwarrior ${version}: ${tasks.length} exported task(s).`);
} catch (error) {
  console.error("Could not read from the configured Taskwarrior installation:");
  console.error(error);
  process.exitCode = 1;
}
