import type { ReleaseDeps } from './interfaces/release-deps.interface';
import { release } from './release';

const RELEASE_DATE: Date = new Date('2026-12-01T10:00:00Z');

// The commands of the plan, as the fake receives them (without shell quotes).
const LAST_TAGS: string = 'git tag --list nest-tools@*';
const STATUS: string = 'git status --porcelain --untracked-files=all';
const CURRENT_BRANCH: string = 'git branch --show-current';
const FETCH: string = 'git fetch --quiet origin main';
const MISSING_COMMITS: string = 'git rev-list --count HEAD..origin/main';
const RUN_MANY: string = 'pnpm nx run-many -t lint test build e2e --outputStyle=static';
const LOCAL_TAGS: string = 'git tag --list';
const REMOTE_TAGS: string = 'git ls-remote --tags origin nest-tools@*';

// The checks in the order of the plan, each with the commands it runs.
const CHECKS: [string, string[]][] = [
  ['clean working tree', [STATUS]],
  ['on the main branch', [CURRENT_BRANCH]],
  ['up to date with origin/main', [FETCH, MISSING_COMMITS]],
  ['lint, test, build and e2e pass', [RUN_MANY]],
  ['tag nest-tools@0.1.1 does not exist yet', [LOCAL_TAGS, REMOTE_TAGS]],
];

// The output of `git log --format=%H%x1f%B%x1e` for these messages.
function gitLog(...messages: string[]): string {
  return messages.map((message: string, index: number): string => `${String(index).padStart(40, '0')}\x1f${message}\n\x1e`).join('\n');
}

const LOG_SINCE_0_1_0: string = 'git log nest-tools@0.1.0..HEAD --format=%H%x1f%B%x1e -- libs/nest-tools/';

// A repository with nest-tools@0.1.0 (local and pushed) and a fix of the library since then: every check passes and the release is 0.1.1.
const PASSING_REPOSITORY: Record<string, string> = {
  [LAST_TAGS]: 'nest-tools@0.1.0',
  [LOG_SINCE_0_1_0]: gitLog('fix(filter): keep the status code'),
  [CURRENT_BRANCH]: 'main',
  [MISSING_COMMITS]: '0',
  [LOCAL_TAGS]: 'nest-tools@0.1.0',
  [REMOTE_TAGS]: 'aaa\trefs/tags/nest-tools@0.1.0\nbbb\trefs/tags/nest-tools@0.1.0^{}',
};

// The same repository before the first release: no tags, so the release is 0.1.0.
const FIRST_RELEASE: Record<string, string> = { [LAST_TAGS]: '', [LOCAL_TAGS]: '', [REMOTE_TAGS]: '' };

const MANIFEST: string = 'libs/nest-tools/package.json';
const CHANGELOG: string = 'libs/nest-tools/CHANGELOG.md';
const PREVIOUS_HEAD: string = '1'.repeat(40);
const RELEASE_COMMIT: string = '2'.repeat(40);

// A manifest like the library's, in its format (2 spaces and a final newline), with `private` as it is before the first release.
function manifest(version: string, withPrivate: boolean): string {
  return [
    '{',
    '  "name": "@brickstodev/nest-tools",',
    `  "version": "${version}",`,
    ...(withPrivate ? ['  "private": true,'] : []),
    '  "description": "Small, opt-in utilities for NestJS applications.",',
    '  "keywords": [',
    '    "nestjs",',
    '    "tools"',
    '  ],',
    '  "exports": {',
    '    ".": {',
    '      "types": "./src/index.d.ts",',
    '      "default": "./src/index.js"',
    '    },',
    '    "./package.json": "./package.json"',
    '  },',
    '  "peerDependencies": {',
    '    "@nestjs/common": "^11.0.0 || ^12.0.0"',
    '  }',
    '}',
    '',
  ].join('\n');
}

const FIRST_CHANGELOG: string = '# Changelog\n\n## 0.1.0 (2026-11-20)\n\n- Initial release\n';

// The files of the library after its first release.
const RELEASED_FILES: Record<string, string> = { [MANIFEST]: manifest('0.1.0', false), [CHANGELOG]: FIRST_CHANGELOG };

// The steps after the checks for nest-tools@0.1.1, and the commands that undo them.
const SAVE: string[] = ['git rev-parse HEAD', `readFile ${MANIFEST}`, `readFile ${CHANGELOG}`];
const WRITE_MANIFEST: string = `writeFile ${MANIFEST}`;
const WRITE_CHANGELOG: string = `writeFile ${CHANGELOG}`;
const ADD: string = `git add ${MANIFEST} ${CHANGELOG}`;
const COMMIT: string = 'git commit -m chore(release): nest-tools@0.1.1';
const TAG: string = 'git tag -a nest-tools@0.1.1 -m nest-tools@0.1.1';
const UNCOMMIT: string = `git reset --soft ${PREVIOUS_HEAD}`;
const UNSTAGE: string = `git reset -q ${PREVIOUS_HEAD} -- ${MANIFEST} ${CHANGELOG}`;

// Answers each command from the given responses (an `Error` is thrown, a missing one is an empty output), records every call
// and keeps the state that the release changes and its undo restores: HEAD, the tags it creates and the files.
class FakeReleaseDeps implements ReleaseDeps {
  public readonly calls: string[] = [];
  // The arguments of each `git` call, to check which ones are a single argument.
  public readonly gitArgs: string[][] = [];
  public readonly logs: string[] = [];
  public head: string = PREVIOUS_HEAD;
  public readonly tags: Set<string> = new Set<string>();
  public readonly files: Map<string, string>;
  private readonly responses: Record<string, string | Error>;

  constructor(overrides: Record<string, string | Error> = {}, files: Record<string, string> = RELEASED_FILES) {
    this.responses = { ...PASSING_REPOSITORY, ...overrides };
    this.files = new Map<string, string>(Object.entries(files));
  }

  public git(args: string[]): string {
    const output: string = this.answer(`git ${args.join(' ')}`);
    const [command, option, target]: string[] = args;

    this.gitArgs.push(args);

    if (command === 'rev-parse') {
      return this.head;
    }

    if (command === 'commit') {
      this.head = RELEASE_COMMIT;
    } else if (command === 'reset' && option === '--soft') {
      this.head = target;
    } else if (command === 'tag' && option === '-a') {
      this.tags.add(target);
    } else if (command === 'tag' && option === '-d') {
      this.tags.delete(target);
    }

    return output;
  }

  public run(command: string, args: string[]): void {
    this.answer(`${command} ${args.join(' ')}`);
  }

  public readFile(path: string): string | null {
    this.calls.push(`readFile ${path}`);

    return this.files.get(path) ?? null;
  }

  public writeFile(path: string, content: string): void {
    this.answer(`writeFile ${path}`);
    this.files.set(path, content);
  }

  public removeFile(path: string): void {
    this.answer(`removeFile ${path}`);
    this.files.delete(path);
  }

  public now(): Date {
    return RELEASE_DATE;
  }

  public log(message: string): void {
    this.logs.push(message);
  }

  private answer(command: string): string {
    const response: string | Error = this.responses[command] ?? '';

    this.calls.push(command);

    if (response instanceof Error) {
      throw response;
    }

    return response;
  }
}

// The message of the error that the release (not the dry run) throws; `null` when it does not throw.
function releaseError(deps: ReleaseDeps): string | null {
  try {
    release(deps, false);
  } catch (error: unknown) {
    return error instanceof Error ? error.message : String(error);
  }

  return null;
}

// The calls after the checks: from saving `HEAD` on.
function afterChecks(calls: string[]): string[] {
  const start: number = calls.indexOf(SAVE[0]);

  return start === -1 ? [] : calls.slice(start);
}

// The calls that would change files, commits or tags (`git tag --list` only reads).
function changes(calls: string[]): string[] {
  return calls.filter((call: string): boolean => /^(writeFile|removeFile|git add|git commit|git tag (?!--list))/.test(call));
}

describe('spec 002 release', (): void => {
  it('FR-2 first release uses 0.1.0 without reading commits', (): void => {
    const dryRun: FakeReleaseDeps = new FakeReleaseDeps({ [LAST_TAGS]: '' });
    // The release itself stops at the tag check, which proves the version it would tag.
    const tagTaken: FakeReleaseDeps = new FakeReleaseDeps({ [LAST_TAGS]: '', [LOCAL_TAGS]: '', [REMOTE_TAGS]: 'ccc\trefs/tags/nest-tools@0.1.0\nddd\trefs/tags/nest-tools@0.1.0^{}' });

    release(dryRun, true);

    expect(dryRun.calls).toEqual([LAST_TAGS]);
    expect(dryRun.logs.join('\n')).toContain('nest-tools@0.1.0');
    expect(dryRun.logs.join('\n')).toContain('## 0.1.0 (2026-12-01)\n\n- Initial release');

    expect(releaseError(tagTaken)).toContain('check "tag nest-tools@0.1.0 does not exist yet" failed');
    expect(tagTaken.calls.filter((call: string): boolean => call.startsWith('git log'))).toEqual([]);
    expect(changes(tagTaken.calls)).toEqual([]);
  });

  it('FR-3 stops before the checks when nothing bumps the version', (): void => {
    const notBumping: string = gitLog('docs(nest-tools): update the README', 'chore: bump the dev dependencies', 'refactor: split the status logic', 'Update index');

    for (const dryRun of [false, true]) {
      const deps: FakeReleaseDeps = new FakeReleaseDeps({ [LOG_SINCE_0_1_0]: notBumping, [STATUS]: '?? release-check.tmp' });

      release(deps, dryRun);

      expect(deps.calls).toEqual([LAST_TAGS, LOG_SINCE_0_1_0]);
      expect(deps.logs).toEqual(['Nothing to release since nest-tools@0.1.0']);
    }
  });

  it('FR-5 dry run shows version and section without checks, network or changes', (): void => {
    const logSince: string = 'git log nest-tools@0.10.0..HEAD --format=%H%x1f%B%x1e -- libs/nest-tools/';
    // Every check would fail: the dry run must not run them.
    const deps: FakeReleaseDeps = new FakeReleaseDeps({
      [LAST_TAGS]: 'nest-tools@0.9.0\nnest-tools@0.10.0\nv1.0.0',
      [logSince]: gitLog('fix(filter): keep the status code', 'docs: update the README', 'perf: cache the status names'),
      [STATUS]: ' M libs/nest-tools/src/index.ts',
      [CURRENT_BRANCH]: '',
      [FETCH]: new Error('Could not resolve host'),
      [RUN_MANY]: new Error('lint failed'),
    });

    release(deps, true);

    expect(deps.calls).toEqual([LAST_TAGS, logSince]);
    expect(deps.logs.join('\n')).toContain('nest-tools@0.10.1');
    expect(deps.logs.join('\n')).toContain('## 0.10.1 (2026-12-01)\n\n### Fixes\n\n- keep the status code\n\n### Performance\n\n- cache the status names');
    expect(deps.logs.join('\n')).not.toContain('update the README');
  });

  it('FR-4 stops at the first failing check, in order, without changing files', (): void => {
    // [case, responses, index of the failing check in CHECKS, commands it runs before failing]
    const failures: [string, Record<string, string | Error>, number, number][] = [
      ['modified file', { [STATUS]: ' M libs/nest-tools/src/index.ts' }, 0, 1],
      ['untracked file', { [STATUS]: '?? release-check.tmp' }, 0, 1],
      ['other branch', { [CURRENT_BRANCH]: 'release-check' }, 1, 1],
      ['detached HEAD', { [CURRENT_BRANCH]: '' }, 1, 1],
      ['fetch offline', { [FETCH]: new Error('Could not resolve host: github.com') }, 2, 1],
      ['missing commits of origin/main', { [MISSING_COMMITS]: '2' }, 2, 2],
      ['run-many fails', { [RUN_MANY]: new Error('Command failed: pnpm nx run-many') }, 3, 1],
      ['local tag', { [LOCAL_TAGS]: 'nest-tools@0.1.0\nnest-tools@0.1.1' }, 4, 1],
      ['remote tag', { [REMOTE_TAGS]: 'ccc\trefs/tags/nest-tools@0.1.1\nddd\trefs/tags/nest-tools@0.1.1^{}' }, 4, 2],
    ];

    for (const [name, responses, failing, commandsRun] of failures) {
      const deps: FakeReleaseDeps = new FakeReleaseDeps(responses);
      const [failingCheck, failingCommands]: [string, string[]] = CHECKS[failing];
      const passedChecks: [string, string[]][] = CHECKS.slice(0, failing);

      // Each expectation carries the case name, so a failure says which case it is.
      expect([name, releaseError(deps)]).toEqual([name, expect.stringContaining(`check "${failingCheck}" failed`)]);
      expect([name, deps.calls]).toEqual([
        name,
        [LAST_TAGS, LOG_SINCE_0_1_0, ...passedChecks.flatMap(([, commands]: [string, string[]]): string[] => commands), ...failingCommands.slice(0, commandsRun)],
      ]);
      expect([name, deps.logs]).toEqual([name, [...passedChecks, CHECKS[failing]].map(([check]: [string, string[]]): string => `Check: ${check}`)]);
      expect([name, changes(deps.calls)]).toEqual([name, []]);
    }
  });

  it('FR-4 goes on with local commits not pushed yet', (): void => {
    // `HEAD` is ahead of origin/main (local commits) but misses none of its commits.
    const deps: FakeReleaseDeps = new FakeReleaseDeps({ [MISSING_COMMITS]: '0' });

    const checkCalls: string[] = [LAST_TAGS, LOG_SINCE_0_1_0, ...CHECKS.flatMap(([, commands]: [string, string[]]): string[] => commands)];

    expect(releaseError(deps)).toBeNull();
    // Every check runs, in order; what follows the checks is covered by the FR-4, FR-6 and FR-8 tests of the later steps.
    expect(deps.calls.slice(0, checkCalls.length)).toEqual(checkCalls);
    expect(deps.logs.filter((line: string): boolean => line.startsWith('Check: '))).toEqual(CHECKS.map(([check]: [string, string[]]): string => `Check: ${check}`));
  });

  it('FR-4 undoes its own changes and names the step when a later step fails', (): void => {
    // [case, responses, files before the release, failing step, calls after the checks: the steps done and then their undo, in reverse order]
    const failures: [string, Record<string, string | Error>, Record<string, string>, string, string[]][] = [
      ['writing the changelog fails', { [WRITE_CHANGELOG]: new Error('EACCES: permission denied') }, RELEASED_FILES, `write ${CHANGELOG}`, [...SAVE, WRITE_MANIFEST, WRITE_CHANGELOG, WRITE_MANIFEST]],
      ['the changelog has no title', {}, { ...RELEASED_FILES, [CHANGELOG]: 'Release notes\n' }, `write ${CHANGELOG}`, [...SAVE, WRITE_MANIFEST, WRITE_MANIFEST]],
      [
        'git commit fails, without a changelog before',
        { [COMMIT]: new Error('pre-commit hook exited with 1') },
        { [MANIFEST]: manifest('0.1.0', false) },
        'git commit',
        [...SAVE, WRITE_MANIFEST, WRITE_CHANGELOG, ADD, COMMIT, UNSTAGE, `removeFile ${CHANGELOG}`, WRITE_MANIFEST],
      ],
      [
        'git tag fails',
        { [TAG]: new Error('tag already exists') },
        RELEASED_FILES,
        'git tag',
        [...SAVE, WRITE_MANIFEST, WRITE_CHANGELOG, ADD, COMMIT, TAG, UNCOMMIT, UNSTAGE, WRITE_CHANGELOG, WRITE_MANIFEST],
      ],
    ];
    // When undoing fails too, the error lists what is left to undo, as the commands to run by hand, in order.
    const stuck: FakeReleaseDeps = new FakeReleaseDeps({ [TAG]: new Error('tag already exists'), [UNCOMMIT]: new Error('index.lock exists') }, { [MANIFEST]: manifest('0.1.0', false) });
    const stuckError: string | null = releaseError(stuck);

    for (const [name, responses, files, failingStep, calls] of failures) {
      const deps: FakeReleaseDeps = new FakeReleaseDeps(responses, files);
      const error: string | null = releaseError(deps);

      expect([name, error]).toEqual([name, expect.stringContaining(`step "${failingStep}" failed`)]);
      expect([name, error]).toEqual([name, expect.stringContaining('the release undid its changes')]);
      expect([name, afterChecks(deps.calls)]).toEqual([name, calls]);
      // The repository as it was: the saved HEAD, no tag and both files with their content (no changelog when there was none).
      expect([name, deps.head, [...deps.tags], Object.fromEntries(deps.files)]).toEqual([name, PREVIOUS_HEAD, [], files]);
    }

    expect(stuckError).toContain('step "git tag" failed (tag already exists), and undoing it failed too (index.lock exists)');
    expect(stuckError).toContain(['', `  ${UNCOMMIT}`, `  ${UNSTAGE}`, `  rm -f ${CHANGELOG}`, `  git checkout ${PREVIOUS_HEAD} -- ${MANIFEST}`].join('\n'));
    expect(stuckError).not.toContain('undid its changes');
  });

  it('FR-6 commits the manifest and the changelog in one chore(release) commit and tags it', (): void => {
    const deps: FakeReleaseDeps = new FakeReleaseDeps();

    expect(releaseError(deps)).toBeNull();
    expect(afterChecks(deps.calls)).toEqual([...SAVE, WRITE_MANIFEST, WRITE_CHANGELOG, ADD, COMMIT, TAG]);
    // The message and the tag name are single arguments.
    expect(deps.gitArgs).toContainEqual(['commit', '-m', 'chore(release): nest-tools@0.1.1']);
    expect(deps.gitArgs).toContainEqual(['tag', '-a', 'nest-tools@0.1.1', '-m', 'nest-tools@0.1.1']);
    expect([deps.head, [...deps.tags]]).toEqual([RELEASE_COMMIT, ['nest-tools@0.1.1']]);
    expect(deps.files.get(MANIFEST)).toBe(manifest('0.1.1', false));
    expect(deps.files.get(CHANGELOG)).toBe('# Changelog\n\n## 0.1.1 (2026-12-01)\n\n### Fixes\n\n- keep the status code\n\n## 0.1.0 (2026-11-20)\n\n- Initial release\n');
  });

  it('FR-6 prints the atomic push command and the undo command', (): void => {
    const deps: FakeReleaseDeps = new FakeReleaseDeps();

    release(deps, false);

    expect(deps.logs.slice(-4)).toEqual([
      'Created the commit "chore(release): nest-tools@0.1.1" and its annotated tag nest-tools@0.1.1, without pushing them.',
      'Push the branch and the tag together: git push --atomic origin main nest-tools@0.1.1',
      'Then publish it: pnpm run release:publish',
      `To undo the release before pushing it: git tag -d nest-tools@0.1.1 && git reset --keep ${PREVIOUS_HEAD}`,
    ]);
  });

  it('FR-8 removes private and keeps the other manifest fields', (): void => {
    const deps: FakeReleaseDeps = new FakeReleaseDeps(FIRST_RELEASE, { [MANIFEST]: manifest('0.0.1', true) });

    expect(releaseError(deps)).toBeNull();
    expect(deps.files.get(MANIFEST)).toBe(manifest('0.1.0', false));
    // Written before the commit and its tag, so no release tag has `private`.
    expect(deps.calls.indexOf(WRITE_MANIFEST)).toBeLessThan(deps.calls.indexOf('git tag -a nest-tools@0.1.0 -m nest-tools@0.1.0'));
  });

  it('NFR-3 neither the dry run nor the release push or call npm', (): void => {
    // [responses, files]: a release after the first one, and the first one.
    const repositories: [Record<string, string>, Record<string, string>][] = [
      [{}, RELEASED_FILES],
      [FIRST_RELEASE, { [MANIFEST]: manifest('0.0.1', true) }],
    ];

    for (const [responses, files] of repositories) {
      for (const dryRun of [true, false]) {
        const deps: FakeReleaseDeps = new FakeReleaseDeps(responses, files);

        release(deps, dryRun);

        // The release goes to the end: it creates its tag.
        expect(deps.tags.size).toBe(dryRun ? 0 : 1);
        expect(deps.calls.filter((call: string): boolean => /^git push|\bnpm\b|publish/.test(call))).toEqual([]);
      }
    }
  });
});
