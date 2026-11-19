import type { ReleaseDeps } from './interfaces/release-deps.interface';
import { publish } from './publish';

// The commands of the plan, as the fake receives them (without shell quotes).
const STATUS: string = 'git status --porcelain --untracked-files=all';
const TAGS_AT_HEAD: string = 'git tag --points-at HEAD';
const REMOTE_TAGS: string = 'git ls-remote --tags origin nest-tools@*';
const CURRENT_COMMIT: string = 'git rev-parse HEAD';
const LOCAL_TAGS: string = 'git tag --list';
const FETCH: string = 'git fetch --quiet origin main';
const ON_MAIN: string = 'git branch --remotes --contains HEAD --list origin/main';
const BUILD: string = 'pnpm nx run nest-tools:build --skip-nx-cache --outputStyle=static';
const NPM_PUBLISH: string = 'npm publish --tag latest';

const HEAD_COMMIT: string = 'c'.repeat(40);
const OLDER_COMMIT: string = 'b'.repeat(40);
const TAG_OBJECT: string = 'e'.repeat(40);

// The precondition checks in the order of the plan, each with the commands it runs; all of them before building.
const CHECKS: [string, string[]][] = [
  ['clean working tree', [STATUS]],
  ['the current commit has a release tag', [TAGS_AT_HEAD]],
  ['nest-tools@0.1.1 is on origin at the current commit', [REMOTE_TAGS, CURRENT_COMMIT]],
  ['nest-tools@0.1.1 is the highest release', [LOCAL_TAGS]],
  ['the current commit is on origin/main', [FETCH, ON_MAIN]],
];
const BUILD_CHECK: string = 'nest-tools builds without the Nx cache';

// The two lines that `git ls-remote --tags` gives for an annotated tag: the tag object and, with `^{}`, its commit.
function remoteTag(tag: string, commit: string): string {
  return `${TAG_OBJECT}\trefs/tags/${tag}\n${commit}\trefs/tags/${tag}^{}`;
}

const PUSHED_TAGS: string = [remoteTag('nest-tools@0.1.0', OLDER_COMMIT), remoteTag('nest-tools@0.1.1', HEAD_COMMIT)].join('\n');

// A repository on the commit of nest-tools@0.1.1, the highest release, pushed with main: every check passes.
const PUBLISHABLE_REPOSITORY: Record<string, string> = {
  [TAGS_AT_HEAD]: 'nest-tools@0.1.1',
  [REMOTE_TAGS]: PUSHED_TAGS,
  [CURRENT_COMMIT]: HEAD_COMMIT,
  [LOCAL_TAGS]: 'nest-tools@0.1.0\nnest-tools@0.1.1\nv9.0.0',
  [ON_MAIN]: '  origin/main',
};

// Answers each command from the given responses (an `Error` is thrown, a missing one is an empty output) and records every call.
class FakePublishDeps implements ReleaseDeps {
  public readonly calls: string[] = [];
  // Each `run` call with its working directory (`undefined` is the repository root).
  public readonly runs: [string, string | undefined][] = [];
  public readonly logs: string[] = [];
  private readonly _responses: Record<string, string | Error>;

  constructor(overrides: Record<string, string | Error> = {}) {
    this._responses = { ...PUBLISHABLE_REPOSITORY, ...overrides };
  }

  public git(args: string[]): string {
    return this._answer(`git ${args.join(' ')}`);
  }

  public run(command: string, args: string[], cwd?: string): void {
    const call: string = `${command} ${args.join(' ')}`;

    this.runs.push([call, cwd]);
    this._answer(call);
  }

  public readFile(path: string): string | null {
    this.calls.push(`readFile ${path}`);

    return null;
  }

  public writeFile(path: string): void {
    this.calls.push(`writeFile ${path}`);
  }

  public removeFile(path: string): void {
    this.calls.push(`removeFile ${path}`);
  }

  public now(): Date {
    return new Date('2026-12-01T10:00:00Z');
  }

  public log(message: string): void {
    this.logs.push(message);
  }

  private _answer(command: string): string {
    const response: string | Error = this._responses[command] ?? '';

    this.calls.push(command);

    if (response instanceof Error) {
      throw response;
    }

    return response;
  }
}

// The message of the error that the publication throws; `null` when it does not throw.
function publishError(deps: ReleaseDeps): string | null {
  try {
    publish(deps);
  } catch (error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }

  return null;
}

// The calls that are not one of the plan's: reading the repository, building and `npm publish`. Anything else could change it.
function unexpected(calls: string[]): string[] {
  const known: string[] = [...CHECKS.flatMap(([, commands]: [string, string[]]): string[] => commands), BUILD, NPM_PUBLISH];

  return calls.filter((call: string): boolean => !known.includes(call));
}

describe('spec 002 publish', (): void => {
  it('FR-9 stops without publishing when a precondition fails', (): void => {
    // [case, responses, index of the failing check in CHECKS, commands it runs before failing, what the error says is missing]
    const failures: [string, Record<string, string | Error>, number, number, string][] = [
      ['modified file', { [STATUS]: ' M libs/nest-tools/src/index.ts' }, 0, 1, 'Commit, stash or remove'],
      ['untracked file', { [STATUS]: '?? notes.txt' }, 0, 1, 'Commit, stash or remove'],
      ['no release tag on HEAD', { [TAGS_AT_HEAD]: 'v0.1.1\nnest-tools@0.1' }, 1, 1, 'git checkout nest-tools@x.y.z'],
      ['tag not on origin', { [REMOTE_TAGS]: remoteTag('nest-tools@0.1.0', OLDER_COMMIT) }, 2, 2, 'git push --atomic origin main nest-tools@0.1.1'],
      ['remote tag on another commit', { [REMOTE_TAGS]: [remoteTag('nest-tools@0.1.0', OLDER_COMMIT), remoteTag('nest-tools@0.1.1', OLDER_COMMIT)].join('\n') }, 2, 2, 'another commit'],
      ['a higher local version', { [LOCAL_TAGS]: 'nest-tools@0.1.0\nnest-tools@0.1.1\nnest-tools@0.2.0' }, 3, 1, 'Only the highest release'],
      ['a higher remote version', { [REMOTE_TAGS]: `${PUSHED_TAGS}\n${remoteTag('nest-tools@0.1.10', 'd'.repeat(40))}` }, 3, 1, 'Only the highest release'],
      ['HEAD not on origin/main', { [ON_MAIN]: '' }, 4, 2, 'git push --atomic origin main nest-tools@0.1.1'],
      ['fetch fails', { [FETCH]: new Error('Could not resolve host: github.com') }, 4, 1, '(Could not resolve host: github.com)'],
    ];

    for (const [name, responses, failing, commandsRun, missing] of failures) {
      const deps: FakePublishDeps = new FakePublishDeps(responses);
      const [failingCheck, failingCommands]: [string, string[]] = CHECKS[failing];
      const passedChecks: [string, string[]][] = CHECKS.slice(0, failing);
      const error: string | null = publishError(deps);

      // Each expectation carries the case name, so a failure says which case it is.
      expect([name, error]).toEqual([name, expect.stringContaining(`Publish stopped: the check "${failingCheck}" failed`)]);
      expect([name, error]).toEqual([name, expect.stringContaining('nothing was published')]);
      expect([name, error]).toEqual([name, expect.stringContaining(missing)]);
      expect([name, deps.calls]).toEqual([name, [...passedChecks.flatMap(([, commands]: [string, string[]]): string[] => commands), ...failingCommands.slice(0, commandsRun)]]);
      expect([name, deps.logs]).toEqual([name, [...passedChecks, CHECKS[failing]].map(([check]: [string, string[]]): string => `Check: ${check}`)]);
      // Neither the build nor npm.
      expect([name, deps.runs]).toEqual([name, []]);
    }
  });

  it('FR-9 builds without cache and publishes from dist with the latest tag', (): void => {
    // With two release tags on HEAD, the highest is the one published: nest-tools@0.1.0 is on origin at another commit.
    const deps: FakePublishDeps = new FakePublishDeps({ [TAGS_AT_HEAD]: 'nest-tools@0.1.0\nnest-tools@0.1.1' });

    expect(publishError(deps)).toBeNull();
    expect(deps.calls).toEqual([...CHECKS.flatMap(([, commands]: [string, string[]]): string[] => commands), BUILD, NPM_PUBLISH]);
    expect(deps.runs).toEqual([
      [BUILD, undefined],
      [NPM_PUBLISH, 'dist/libs/nest-tools'],
    ]);
    expect(deps.logs).toEqual([...CHECKS.map(([check]: [string, string[]]): string => `Check: ${check}`), `Check: ${BUILD_CHECK}`, 'Published nest-tools@0.1.1 to npm with the latest tag']);
  });

  it('FR-10 a failed or repeated publish creates no commit, tag or version', (): void => {
    const published: FakePublishDeps = new FakePublishDeps();
    // npm rejects a version it already has, as it does a publish that fails for any other reason.
    const repeated: FakePublishDeps = new FakePublishDeps({ [NPM_PUBLISH]: new Error('npm error 403 You cannot publish over the previously published versions: 0.1.1.') });
    const buildFailed: FakePublishDeps = new FakePublishDeps({ [BUILD]: new Error('Command failed: pnpm nx run nest-tools:build') });

    publish(published);

    const repeatedError: string | null = publishError(repeated);

    expect(repeatedError).toContain('npm did not publish nest-tools@0.1.1 (npm error 403 You cannot publish over the previously published versions: 0.1.1.)');
    expect(repeatedError).toContain('pnpm run release:publish');
    // Retrying is the same publication of the same version, from the commit of its tag.
    expect(repeated.calls).toEqual(published.calls);
    expect(publishError(buildFailed)).toContain(`Publish stopped: the check "${BUILD_CHECK}" failed (Command failed: pnpm nx run nest-tools:build)`);
    expect(buildFailed.runs).toEqual([[BUILD, undefined]]);

    for (const deps of [published, repeated, buildFailed]) {
      expect(unexpected(deps.calls)).toEqual([]);
    }
  });

  it('NFR-1 publishes with the maintainer session only', (): void => {
    const deps: FakePublishDeps = new FakePublishDeps();

    publish(deps);

    // npm asks the maintainer for the 2FA in the inherited terminal: no `--otp`, token or registry configuration.
    expect(deps.runs.filter(([call]: [string, string | undefined]): boolean => call.startsWith('npm '))).toEqual([[NPM_PUBLISH, 'dist/libs/nest-tools']]);
    expect(deps.calls.join('\n')).not.toMatch(/--otp|token|_auth|npmrc|--registry|npm (login|adduser|config)/i);
    // No file read or written, so no `.npmrc` with credentials either.
    expect(deps.calls.filter((call: string): boolean => /^(readFile|writeFile|removeFile)/.test(call))).toEqual([]);
  });
});
