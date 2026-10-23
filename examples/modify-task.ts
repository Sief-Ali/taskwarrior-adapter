import { TaskwarriorClient } from "../src/index.js";

const [uuid, ...descriptionParts] = process.argv.slice(2);
const description = descriptionParts.join(" ");

if (!uuid || description.trim().length === 0) {
  console.error("Usage: pnpm example:modify -- <task-uuid> <new-description...>");
  process.exitCode = 1;
} else {
  const client = new TaskwarriorClient();

  try {
    await client.tasks.modify(uuid).description(description).execute();
    console.log(`Updated task ${uuid}.`);
  } catch (error) {
    console.error("Could not modify task:");
    console.error(error);
    process.exitCode = 1;
  }
}
