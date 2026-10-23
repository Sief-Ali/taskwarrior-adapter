import type { TaskwarriorTask } from "../core/types.js";

const UUID_PATTERN = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;
const TASK_FILTER_VALUE_PATTERN = /^[\p{L}\p{N}_.-]+(?: [\p{L}\p{N}_.-]+)*$/u;
const TASK_TAG_PATTERN = /^[\p{L}\p{N}_.-]+$/u;
const TASK_DUE_VALUE_PATTERN = /^[\p{L}\p{N}_.+-]+$/u;

export type TaskExportItemValidation =
  | { valid: true; task: TaskwarriorTask }
  | { valid: false; reason: "NOT_OBJECT" | "INVALID_UUID" };

export function isTaskwarriorUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function isSafeTaskFilterValue(value: string): boolean {
  return value.length <= 256 && TASK_FILTER_VALUE_PATTERN.test(value);
}

export function isSafeTaskTag(value: string): boolean {
  return value.length <= 256 && TASK_TAG_PATTERN.test(value);
}

export function isSafeTaskDueValue(value: string): boolean {
  return value.length <= 128 && TASK_DUE_VALUE_PATTERN.test(value);
}

export function isValidTaskDescription(value: string): boolean {
  return value.trim().length > 0 && value.length <= 4096 && !value.includes("\0");
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
