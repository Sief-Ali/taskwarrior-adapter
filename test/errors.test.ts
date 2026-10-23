import assert from "node:assert/strict";
import test from "node:test";
import { TaskwarriorError } from "../src/index.js";

test("TaskwarriorError exposes a stable adapter message and retains diagnostics", () => {
  const error = new TaskwarriorError(
    "COMMAND_FAILED",
    "Taskwarrior command exited with code 2.",
    { args: ["export"], stderr: "internal CLI output" },
  );

  assert.equal(error.message, "Taskwarrior could not complete the requested operation.");
  assert.equal(error.code, "COMMAND_FAILED");
  assert.equal(error.detail, "Taskwarrior command exited with code 2.");
  assert.deepEqual(error.args, ["export"]);
  assert.equal(error.stderr, "internal CLI output");
});

test("TaskwarriorError exposes a stable message for invalid UUIDs", () => {
  const error = new TaskwarriorError("INVALID_UUID", "Invalid UUID format.");

  assert.equal(error.message, "The task UUID is invalid.");
  assert.equal(error.code, "INVALID_UUID");
});
