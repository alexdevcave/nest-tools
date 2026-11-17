import { addChangelogSection, firstReleaseSection, releaseSection } from './changelog';
import { parseGitLog } from './conventional-commit';
import type { ConventionalCommit } from './interfaces/conventional-commit.interface';

// The commits of a `git log --format=%H%x1f%B%x1e`, parsed as the release does.
function commits(...messages: string[]): ConventionalCommit[] {
  return parseGitLog(messages.map((message: string, index: number): string => `${String(index).padStart(40, '0')}\x1f${message}\n\x1e`).join('\n'));
}

const RELEASE_DATE: Date = new Date('2026-12-01T10:00:00Z');

// The example of the plan ("Formato del registro de cambios"), as Prettier leaves it.
const PLAN_EXAMPLE: string = [
  '# Changelog',
  '',
  '## 0.2.0 (2026-12-01)',
  '',
  '### Breaking changes',
  '',
  '- rename the client errors log option',
  '  The `logErrors` option is now `logClientErrors`.',
  '',
  '### Fixes',
  '',
  '- keep the status code of external HTTP errors',
  '',
  '## 0.1.0 (2026-11-20)',
  '',
  '- Initial release',
  '',
].join('\n');

describe('spec 002 changelog', (): void => {
  it('FR-2 first release section has the single entry "Initial release"', (): void => {
    expect(firstReleaseSection(new Date('2026-11-20T10:00:00Z'))).toBe('## 0.1.0 (2026-11-20)\n\n- Initial release\n');
  });

  it('FR-7 section title has the version and the UTC date', (): void => {
    const lateEvening: Date = new Date('2026-11-20T23:30:00-05:00');

    expect(firstReleaseSection(lateEvening).split('\n')[0]).toBe('## 0.1.0 (2026-11-21)');
    expect(releaseSection('0.2.3', lateEvening, commits('fix: keep the status code')).split('\n')[0]).toBe('## 0.2.3 (2026-11-21)');
  });

  it('FR-7 lists breaking changes first with their footer text', (): void => {
    const section: string = releaseSection(
      '0.2.0',
      RELEASE_DATE,
      commits(
        'fix: keep the status code of external HTTP errors',
        'refactor(filter): rename the client errors log option\n\nBREAKING CHANGE: The `logErrors` option is now `logClientErrors`. \nUpdate your config.\n\nCo-Authored-By: Claude <noreply@anthropic.com>\nClaude-Session: abc',
        'perf: cache the status names',
        'feat!: drop Node 18',
      ),
    );
    const expected: string = [
      '## 0.2.0 (2026-12-01)',
      '',
      '### Breaking changes',
      '',
      '- rename the client errors log option',
      '  The `logErrors` option is now `logClientErrors`.',
      '  Update your config.',
      '- drop Node 18',
      '',
      '### Fixes',
      '',
      '- keep the status code of external HTTP errors',
      '',
      '### Performance',
      '',
      '- cache the status names',
      '',
    ].join('\n');

    expect(section).toBe(expected);
  });

  it('FR-7 lists each bumping commit once with its description only', (): void => {
    const section: string = releaseSection(
      '0.2.0',
      RELEASE_DATE,
      commits(
        'feat(filter): add the request id\n\nCo-Authored-By: Claude <noreply@anthropic.com>',
        'chore: bump the dev dependencies',
        'docs: update the README',
        'revert: add the timeout',
        'Revert "feat: add the timeout"',
        'feat!: rename the options',
        'Fix(filter): keep the status code',
        'feat: add the timeout',
      ),
    );
    const expected: string = [
      '## 0.2.0 (2026-12-01)',
      '',
      '### Breaking changes',
      '',
      '- rename the options',
      '',
      '### Features',
      '',
      '- add the request id',
      '- add the timeout',
      '',
      '### Fixes',
      '',
      '- keep the status code',
      '',
    ].join('\n');

    expect(section).toBe(expected);
    expect(section).not.toMatch(/filter|Claude|0{40}|README|dependencies/);
  });

  it('FR-7 creates the file with its title and adds new sections above the previous ones', (): void => {
    const created: string = addChangelogSection(null, firstReleaseSection(new Date('2026-11-20T10:00:00Z')));
    const updated: string = addChangelogSection(
      created,
      releaseSection(
        '0.2.0',
        RELEASE_DATE,
        commits('fix: keep the status code of external HTTP errors', 'refactor!: rename the client errors log option\n\nBREAKING CHANGE: The `logErrors` option is now `logClientErrors`.'),
      ),
    );
    const patched: string = addChangelogSection(updated, releaseSection('0.2.1', new Date('2026-12-05T10:00:00Z'), commits('perf: cache the status names')));

    expect(created).toBe('# Changelog\n\n## 0.1.0 (2026-11-20)\n\n- Initial release\n');
    expect(updated).toBe(PLAN_EXAMPLE);
    expect(patched).toBe(`# Changelog\n\n## 0.2.1 (2026-12-05)\n\n### Performance\n\n- cache the status names\n\n${PLAN_EXAMPLE.slice('# Changelog\n\n'.length)}`);
    // An existing file without the title is not ours to rewrite: the release fails and undoes its changes.
    expect((): string => addChangelogSection('## 0.1.0 (2026-11-20)\n\n- Initial release\n', firstReleaseSection(RELEASE_DATE))).toThrow('# Changelog');
    expect((): string => addChangelogSection('', firstReleaseSection(RELEASE_DATE))).toThrow('# Changelog');
  });
});
