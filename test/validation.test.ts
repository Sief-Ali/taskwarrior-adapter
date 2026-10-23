import assert from "node:assert/strict";
import test from "node:test";
import {
  isTaskwarriorUuid,
  validateTaskExportItem,
} from "../src/utils/validation.js";

const validUuid = "a360fc44-315c-4366-b70c-ea7e7520b749";

test("isTaskwarriorUuid accepts canonical UUIDs case-insensitively", () => {
  assert.equal(isTaskwarriorUuid(validUuid), true);
  assert.equal(isTaskwarriorUuid(validUuid.toUpperCase()), true);
});

test("isTaskwarriorUuid rejects malformed values", () => {
  assert.equal(isTaskwarriorUuid("not-a-uuid"), false);
  assert.equal(isTaskwarriorUuid(undefined), false);
});

test("validateTaskExportItem requires an object with a valid UUID", () => {
  assert.deepEqual(validateTaskExportItem(null), {
    valid: false,
    reason: "NOT_OBJECT",
  });
  assert.deepEqual(validateTaskExportItem({ description: "Missing UUID" }), {
    valid: false,
    reason: "INVALID_UUID",
  });

  const task = { uuid: validUuid, custom_attribute: true };
  assert.deepEqual(validateTaskExportItem(task), { valid: true, task });
});
