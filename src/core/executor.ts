import { spawn } from "node:child_process";
import { TaskwarriorError } from "../errors.js";
import type { TaskwarriorClientOptions } from "../types.js";

const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_MAX_OUTPUT_BYTES = 10 * 1024 * 1024;

interface CommandResult {
  stdout: string;
  stderr: string;
}

/** Runs Taskwarrior commands with bounded output and execution time. */
export class TaskExecutor {
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

  execute(args: readonly string[]): Promise<CommandResult> {
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
}
