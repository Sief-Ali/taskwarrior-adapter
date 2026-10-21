import { spawn } from "node:child_process";
import { TaskwarriorError } from "./errors.js";
import type { TaskwarriorClientOptions, TaskwarriorTask } from "./types.js";

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_OUTPUT_BYTES = 10 * 1024 * 1024;
const UUID_PATTERN = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

interface CommandResult {
  stdout: string;
  stderr: string;
}

/**
 * A small wrapper around the Taskwarrior command-line interface.
 *
 * This initial release intentionally exposes read operations only. It invokes
 * the CLI without a shell, uses JSON output rather than terminal tables, and
 * never reads or writes Taskwarrior's internal storage directly.
 */
export class TaskwarriorClient {
  private readonly commandPath: string;
  private readonly timeoutMs: number;
  private readonly maxOutputBytes: number;
  private readonly options: TaskwarriorClientOptions;

  constructor(options: TaskwarriorClientOptions = {}) {
    this.commandPath = options.commandPath ?? "task";
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxOutputBytes = options.maxOutputBytes ?? DEFAULT_MAX_OUTPUT_BYTES;
    this.options = options;

    if (!Number.isFinite(this.timeoutMs) || this.timeoutMs <= 0) {
      throw new RangeError("timeoutMs must be a positive number.");
    }

    if (!Number.isSafeInteger(this.maxOutputBytes) || this.maxOutputBytes <= 0) {
      throw new RangeError("maxOutputBytes must be a positive safe integer.");
    }
  }

  /** Returns Taskwarrior's version string without loading its task database. */
  async getVersion(): Promise<string> {
    const { stdout } = await this.execute(["--version"]);
    const version = stdout.trim();

    if (!version) {
      throw new TaskwarriorError(
        "COMMAND_FAILED",
        "Taskwarrior returned an empty version string.",
        { args: ["--version"] },
      );
    }

    return version;
  }

  /**
   * Returns exported tasks from Taskwarrior, including attributes this library
   * does not yet model. No default status filter is applied.
   */
  async listTasks(): Promise<TaskwarriorTask[]> {
    const args = ["export", "rc.json.array=on", "rc.verbose=nothing"];
    const { stdout } = await this.execute(args);
    return this.parseTaskExport(stdout, args);
  }

  /**
   * Returns one task by its stable UUID, or null when no matching task exists.
   * Numeric Taskwarrior IDs are intentionally not accepted because they can
   * change as the task working set changes.
   */
  async getTask(uuid: string): Promise<TaskwarriorTask | null> {
    if (!UUID_PATTERN.test(uuid)) {
      throw new TaskwarriorError(
        "INVALID_UUID",
        "Expected a UUID in the canonical 8-4-4-4-12 hexadecimal format.",
      );
    }

    const args = [`uuid:${uuid}`, "export", "rc.json.array=on", "rc.verbose=nothing"];
    const { stdout } = await this.execute(args);
    const tasks = this.parseTaskExport(stdout, args);
    return tasks.find((task) => task.uuid.toLowerCase() === uuid.toLowerCase()) ?? null;
  }

  private parseTaskExport(stdout: string, args: readonly string[]): TaskwarriorTask[] {
    let parsed: unknown;

    try {
      parsed = JSON.parse(stdout);
    } catch (cause) {
      throw new TaskwarriorError(
        "INVALID_JSON",
        "Taskwarrior export did not return valid JSON. Check the CLI version and configuration.",
        { args, cause },
      );
    }

    if (!Array.isArray(parsed)) {
      throw new TaskwarriorError(
        "INVALID_TASK_DATA",
        "Taskwarrior export returned JSON, but it was not an array. The adapter requests rc.json.array=on.",
        { args },
      );
    }

    return parsed.map((value: unknown, index: number): TaskwarriorTask => {
      if (value === null || typeof value !== "object" || Array.isArray(value)) {
        throw new TaskwarriorError(
          "INVALID_TASK_DATA",
          `Taskwarrior export item at index ${index} is not a task object.`,
          { args },
        );
      }

      const task = value as Record<string, unknown>;
      if (typeof task.uuid !== "string" || !UUID_PATTERN.test(task.uuid)) {
        throw new TaskwarriorError(
          "INVALID_TASK_DATA",
          `Taskwarrior export item at index ${index} has no valid UUID.`,
          { args },
        );
      }

      // Preserve Taskwarrior's full object, including any user-defined attributes.
      return task as TaskwarriorTask;
    });
  }

  private buildEnvironment(): NodeJS.ProcessEnv {
    const env: NodeJS.ProcessEnv = { ...process.env, ...this.options.env };

    if (this.options.taskrcPath !== undefined) {
      env.TASKRC = this.options.taskrcPath;
    }

    if (this.options.dataLocation !== undefined) {
      env.TASKDATA = this.options.dataLocation;
    }

    return env;
  }

  private execute(args: readonly string[]): Promise<CommandResult> {
    return new Promise((resolve, reject) => {
      let stdoutBytes: Buffer[] = [];
      let stderrBytes: Buffer[] = [];
      let outputBytes = 0;
      let outputLimitExceeded = false;
      let timedOut = false;

      const child = spawn(this.commandPath, [...args], {
        env: this.buildEnvironment(),
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true,
        shell: false,
      });

      const appendOutput = (target: Buffer[], chunk: Buffer | string): void => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        outputBytes += buffer.length;

        if (outputBytes > this.maxOutputBytes) {
          if (!outputLimitExceeded) {
            outputLimitExceeded = true;
            child.kill();
          }
          return;
        }

        target.push(buffer);
      };

      child.stdout.on("data", (chunk: Buffer | string) => appendOutput(stdoutBytes, chunk));
      child.stderr.on("data", (chunk: Buffer | string) => appendOutput(stderrBytes, chunk));

      const timer = setTimeout(() => {
        timedOut = true;
        child.kill();
      }, this.timeoutMs);
      timer.unref?.();

      child.once("error", (cause: NodeJS.ErrnoException) => {
        clearTimeout(timer);
        if (cause.code === "ENOENT") {
          reject(
            new TaskwarriorError(
              "NOT_INSTALLED",
              `Could not find the Taskwarrior executable '${this.commandPath}'. Install Taskwarrior or configure commandPath.`,
              { args, cause },
            ),
          );
          return;
        }

        reject(
          new TaskwarriorError(
            "COMMAND_FAILED",
            `Could not start Taskwarrior command '${this.commandPath}'.`,
            { args, cause },
          ),
        );
      });

      child.once("close", (exitCode, signal) => {
        clearTimeout(timer);

        const stdout = Buffer.concat(stdoutBytes).toString("utf8");
        const stderr = Buffer.concat(stderrBytes).toString("utf8");
        stdoutBytes = [];
        stderrBytes = [];

        if (outputLimitExceeded) {
          reject(
            new TaskwarriorError(
              "OUTPUT_LIMIT",
              `Taskwarrior output exceeded the configured limit of ${this.maxOutputBytes} bytes.`,
              { args, exitCode, signal, stderr },
            ),
          );
          return;
        }

        if (timedOut) {
          reject(
            new TaskwarriorError(
              "COMMAND_TIMEOUT",
              `Taskwarrior command exceeded the timeout of ${this.timeoutMs} ms.`,
              { args, exitCode, signal, stderr },
            ),
          );
          return;
        }

        if (exitCode !== 0) {
          reject(
            new TaskwarriorError(
              "COMMAND_FAILED",
              `Taskwarrior command exited with code ${String(exitCode)}${signal ? ` (signal ${signal})` : ""}.`,
              { args, exitCode, signal, stderr },
            ),
          );
          return;
        }

        resolve({ stdout, stderr });
      });
    });
  }
}
