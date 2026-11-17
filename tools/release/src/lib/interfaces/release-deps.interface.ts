/**
 * The input and output that the release and the publication use, injected so their order, stops and undo can be tested without git or network.
 */
export interface ReleaseDeps {
  /** Runs `git` with the output captured: stdout without the trailing newline; throws on a non-zero exit. */
  git(args: string[]): string;
  /** Runs a command with the inherited terminal; throws on a non-zero exit. */
  run(command: string, args: string[], cwd?: string): void;
  /** The content of the file; `null` when it does not exist. */
  readFile(path: string): string | null;
  writeFile(path: string, content: string): void;
  removeFile(path: string): void;
  now(): Date;
  log(message: string): void;
}
