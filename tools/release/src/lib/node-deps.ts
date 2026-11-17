import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import type { ReleaseDeps } from './interfaces/release-deps.interface';

function git(args: string[]): string {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: 'pipe' }).replace(/\n$/, '');
  } catch (error: unknown) {
    // The message carries the stderr of git ("Command failed: git …\n<stderr>\n"); without the final newline it reads well inside the release error.
    throw new Error(error instanceof Error ? error.message.trimEnd() : String(error));
  }
}

// The inherited terminal shows the Nx log and lets npm ask for the 2FA (code or browser).
function run(command: string, args: string[], cwd?: string): void {
  execFileSync(command, args, { cwd, stdio: 'inherit' });
}

function readFile(path: string): string | null {
  return existsSync(path) ? readFileSync(path, 'utf8') : null;
}

function writeFile(path: string, content: string): void {
  writeFileSync(path, content);
}

function removeFile(path: string): void {
  rmSync(path, { force: true });
}

function now(): Date {
  return new Date();
}

function log(message: string): void {
  console.log(message);
}

/** The real input and output, relative to the current directory (the repository root when it runs from the root scripts). */
export const nodeDeps: ReleaseDeps = { git, run, readFile, writeFile, removeFile, now, log };
