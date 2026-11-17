import { FIRST_VERSION } from './constants';
import type { ConventionalCommit } from './interfaces/conventional-commit.interface';

const TITLE: string = '# Changelog';

/** The headings after `Breaking changes`, in this order, for the non-breaking commits that bump the version; any other type is left out. */
const HEADINGS: Record<string, string> = { feat: 'Features', fix: 'Fixes', perf: 'Performance' };

/** `## x.y.z (YYYY-MM-DD)` and its blocks, separated by blank lines and ending with a newline, as Prettier formats Markdown. */
function section(version: string, date: Date, blocks: string[]): string {
  return `## ${version} (${date.toISOString().slice(0, 10)})\n\n${blocks.join('\n\n')}\n`;
}

/** `- <description>` and, for a breaking change, the text of its footer below, indented 2 spaces. */
function entry(commit: ConventionalCommit): string {
  const noteLines: string[] = commit.breakingNote === null ? [] : commit.breakingNote.split('\n').map((line: string): string => `  ${line}`.trimEnd());

  return [`- ${commit.description}`, ...noteLines].join('\n');
}

/** The section of the first release (FR-2): 0.1.0 with the single entry `Initial release`. */
export function firstReleaseSection(date: Date): string {
  return section(FIRST_VERSION, date, ['- Initial release']);
}

/**
 * The section of a release after the first one (FR-7), dated in UTC: breaking changes first (only there, with their footer text),
 * then `Features`, `Fixes` and `Performance`, each only with entries, in the order of `commits`; no other commit appears.
 */
export function releaseSection(version: string, date: Date, commits: ConventionalCommit[]): string {
  const groups: [string, ConventionalCommit[]][] = [
    ['Breaking changes', commits.filter((commit: ConventionalCommit): boolean => commit.breaking)],
    ...Object.entries(HEADINGS).map(([type, heading]: [string, string]): [string, ConventionalCommit[]] => [
      heading,
      commits.filter((commit: ConventionalCommit): boolean => !commit.breaking && commit.type === type),
    ]),
  ];
  const blocks: string[] = groups
    .filter(([, grouped]: [string, ConventionalCommit[]]): boolean => grouped.length > 0)
    .map(([heading, grouped]: [string, ConventionalCommit[]]): string => `### ${heading}\n\n${grouped.map(entry).join('\n')}`);

  return section(version, date, blocks);
}

/**
 * The changelog with `newSection` added: a new file (`null`) gets the `# Changelog` title, and an existing one gets the section right below its title,
 * above the previous ones. Throws when an existing file does not start with that title.
 */
export function addChangelogSection(changelog: string | null, newSection: string): string {
  if (changelog === null) {
    return `${TITLE}\n\n${newSection}`;
  }

  const firstLine: string = changelog.split('\n', 1)[0];

  if (firstLine.trimEnd() !== TITLE) {
    throw new Error(`The changelog does not start with the "${TITLE}" title`);
  }

  const previousSections: string = changelog.slice(firstLine.length).trim();

  return previousSections === '' ? `${TITLE}\n\n${newSection}` : `${TITLE}\n\n${newSection}\n${previousSections}\n`;
}
