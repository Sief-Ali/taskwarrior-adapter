import { TaskwarriorClient } from "../../src/index.js";

const client = new TaskwarriorClient();

try {
  const version = await client.getVersion();
  const tasks = await client.listTasks();

  console.log(`Connected to ${version}`);
  console.log(`Exported ${tasks.length} task(s).`);

  for (const task of tasks) {
    console.log({
      uuid: task.uuid,
      status: task.status ?? "unknown",
      description: task.description ?? "(no description)",
      project: task.project,
      priority: task.priority,
      due: task.due,
    });
  }
} catch (error) {
  console.error("Could not read tasks from Taskwarrior:");
  console.error(error);
  process.exitCode = 1;
}
