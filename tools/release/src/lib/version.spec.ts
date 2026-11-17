import { parseGitLog } from './conventional-commit';
import type { ConventionalCommit } from './interfaces/conventional-commit.interface';
import { highestTag, nextVersion, parseRemoteTags, parseTagList } from './version';

// The commits of a `git log --format=%H%x1f%B%x1e`, parsed as the release does.
function commits(...messages: string[]): ConventionalCommit[] {
  return parseGitLog(messages.map((message: string, index: number): string => `${String(index).padStart(40, '0')}\x1f${message}\n\x1e`).join('\n'));
}

describe('spec 002 version', (): void => {
  it('FR-1 bumps the patch for feat, fix and perf on 0.x', (): void => {
    expect(nextVersion('nest-tools@0.1.0', commits('feat: add the request id'))).toBe('0.1.1');
    expect(nextVersion('nest-tools@0.1.0', commits('fix(filter): keep the status code'))).toBe('0.1.1');
    expect(nextVersion('nest-tools@0.1.0', commits('perf: cache the status names'))).toBe('0.1.1');
    expect(nextVersion('nest-tools@0.10.9', commits('docs: update the README', 'fix: keep the status code'))).toBe('0.10.10');
  });

  it('FR-1 bumps the minor for a breaking change of any type', (): void => {
    expect(nextVersion('nest-tools@0.1.3', commits('feat!: rename the options'))).toBe('0.2.0');
    expect(nextVersion('nest-tools@0.1.3', commits('docs!: drop the old guide'))).toBe('0.2.0');
    expect(nextVersion('nest-tools@0.1.3', commits('refactor(filter): rename the log option\n\nBREAKING CHANGE: `logErrors` is now `logClientErrors`.'))).toBe('0.2.0');
    expect(nextVersion('nest-tools@0.9.0', commits('chore: require Node 22\n\nBREAKING-CHANGE: needs Node 22'))).toBe('0.10.0');
  });

  it('FR-1 bumps the version only once per release', (): void => {
    expect(nextVersion('nest-tools@0.1.0', commits('feat: one', 'fix: two', 'perf: three', 'feat: four'))).toBe('0.1.1');
    expect(nextVersion('nest-tools@0.1.0', commits('feat: one', 'fix!: two', 'refactor!: three', 'fix: four'))).toBe('0.2.0');
  });

  it('FR-1 takes the highest nest-tools@x.y.z tag as the last tag', (): void => {
    const output: string = ['nest-tools@0.2.0', 'v1.0.0', 'nest-tools@0.10.0', 'nest-tools@1.0', 'other@2.0.0', 'nest-tools@0.9.0', 'nest-tools@0.10.0-beta.1'].join('\n');

    expect(parseTagList(output)).toEqual(['nest-tools@0.2.0', 'nest-tools@0.10.0', 'nest-tools@0.9.0']);
    expect(highestTag(parseTagList(output))).toBe('nest-tools@0.10.0');
    expect(highestTag(['nest-tools@0.9.9', 'nest-tools@0.10.0', 'nest-tools@0.10.1', 'nest-tools@0.9.10'])).toBe('nest-tools@0.10.1');
    // No tag yet: the first release (FR-2).
    expect(highestTag(parseTagList(''))).toBeNull();
  });

  it('FR-1 refuses to compute versions from 1.0.0', (): void => {
    expect((): string | null => nextVersion('nest-tools@1.0.0', commits('fix: keep the status code'))).toThrow('nest-tools@1.0.0');
    expect((): string | null => nextVersion('nest-tools@2.3.4', commits('docs: update the README'))).toThrow('1.0.0');
  });

  it('FR-3 returns no version when no commit bumps it', (): void => {
    const notBumping: ConventionalCommit[] = commits(
      'docs: update the README',
      'chore: bump the dev dependencies',
      'refactor(filter): split the status logic',
      'test: cover the 413 case',
      'build: copy the translations',
      'ci: cache pnpm',
      'style: format the filter',
      'revert: feat: add the request id',
      'Revert "feat: add the request id"',
      'update the README',
    );

    expect(nextVersion('nest-tools@0.1.0', notBumping)).toBeNull();
    expect(nextVersion('nest-tools@0.1.0', [])).toBeNull();
  });

  it('FR-9 reads remote tags with their peeled commit', (): void => {
    const output: string = [
      `${'a'.repeat(40)}\trefs/tags/nest-tools@0.1.0`,
      `${'b'.repeat(40)}\trefs/tags/nest-tools@0.1.0^{}`,
      `${'c'.repeat(40)}\trefs/tags/nest-tools@0.2.0`,
      `${'d'.repeat(40)}\trefs/tags/nest-tools@1.0`,
      `${'e'.repeat(40)}\trefs/tags/nest-tools@1.0^{}`,
    ].join('\n');

    // Annotated: the `^{}` line holds the commit. Lightweight: its only line already does.
    expect(parseRemoteTags(output)).toEqual(
      new Map<string, string>([
        ['nest-tools@0.1.0', 'b'.repeat(40)],
        ['nest-tools@0.2.0', 'c'.repeat(40)],
      ]),
    );
    expect(parseRemoteTags('')).toEqual(new Map<string, string>());
  });
});
