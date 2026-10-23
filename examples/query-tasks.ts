import { TaskwarriorClient } from "../src/index.js";

const project = process.argv[2];

if (!project) {
  console.error("Usage: pnpm example:query -- <project>");
  process.exitCode = 1;
} else {
  const client = new TaskwarriorClient();

  try {
    const tasks = await client.tasks
      .query()
      .project(project)
      .status("pending")
      .tag("urgent")
      .execute();

    console.log(`Found ${tasks.length} urgent pending task(s) in ${project}.`);
    for (const task of tasks) {
      console.log(`${task.uuid}: ${task.description ?? "(no description)"}`);
    }
  } catch (error) {
    console.error("Could not query tasks:");
    console.error(error);
    process.exitCode = 1;
  }
}
