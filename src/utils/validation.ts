import type { TaskwarriorTask } from "../core/types.js";

const UUID_PATTERN = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export type TaskExportItemValidation =
  | { valid: true; task: TaskwarriorTask }
  | { valid: false; reason: "NOT_OBJECT" | "INVALID_UUID" };

export function isTaskwarriorUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function validateTaskExportItem(value: unknown): TaskExportItemValidation {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return { valid: false, reason: "NOT_OBJECT" };
  }

  if (!isTaskwarriorUuid((value as Record<string, unknown>).uuid)) {
    return { valid: false, reason: "INVALID_UUID" };
  }

  return { valid: true, task: value as TaskwarriorTask };
}
