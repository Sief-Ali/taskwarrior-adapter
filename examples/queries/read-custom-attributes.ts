import { TaskwarriorClient } from "../../src/index.js";

const client = new TaskwarriorClient();

try {
  const tasks = await client.listTasks();

  for (const task of tasks) {
    const customValue = task["my_custom_attribute"];
    if (typeof customValue === "string") {
      console.log(`${task.uuid}: ${customValue}`);
    }
  }
} catch (error) {
  console.error("Could not read custom task attributes:");
  console.error(error);
  process.exitCode = 1;
}
