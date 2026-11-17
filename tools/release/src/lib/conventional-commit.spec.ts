import { parseGitLog } from './conventional-commit';
import type { ConventionalCommit } from './interfaces/conventional-commit.interface';

// Like the output of `git log --format=%H%x1f%B%x1e` without its trailing newline: `%B` ends with a newline and git adds one after each record.
function gitLog(...messages: string[]): string {
  return messages.map((message: string, index: number): string => `${String(index).padStart(40, '0')}\x1f${message}\n\x1e`).join('\n');
}

describe('spec 002 conventional commits', (): void => {
  it('FR-1 parses type, description and breaking marks', (): void => {
    const output: string = gitLog(
      'feat(filter): add the request id',
      'fix!: keep the status code',
      'refactor(filter): rename the log option\n\nThe old name was confusing.\n\nBREAKING CHANGE: The `logErrors` option is now `logClientErrors`.\nUpdate your config.\n\nCo-Authored-By: Claude <noreply@anthropic.com>\nClaude-Session: abc',
      'perf: cache the status names\n\nBREAKING-CHANGE: needs Node 22\nClaude-Session: abc',
      'Feat: capitalised type',
    );
    const expected: ConventionalCommit[] = [
      { type: 'feat', description: 'add the request id', breaking: false, breakingNote: null },
      { type: 'fix', description: 'keep the status code', breaking: true, breakingNote: null },
      { type: 'refactor', description: 'rename the log option', breaking: true, breakingNote: 'The `logErrors` option is now `logClientErrors`.\nUpdate your config.' },
      { type: 'perf', description: 'cache the status names', breaking: true, breakingNote: 'needs Node 22' },
      { type: 'feat', description: 'capitalised type', breaking: false, breakingNote: null },
    ];

    expect(parseGitLog(output)).toEqual(expected);
  });

  it('FR-1 ignores messages that do not follow Conventional Commits', (): void => {
    const output: string = gitLog(
      'update the README',
      "Merge branch 'main' into dev",
      'Revert "feat: add the request id"',
      'feat:missing space',
      'feat(): empty scope',
      'feat: ',
      'oops\n\nBREAKING CHANGE: not a conventional header',
      'fix: the only valid one',
    );

    expect(parseGitLog(output)).toEqual([{ type: 'fix', description: 'the only valid one', breaking: false, breakingNote: null }]);
    expect(parseGitLog('')).toEqual([]);
  });
});
