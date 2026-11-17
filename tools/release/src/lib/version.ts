import { TAG_PATTERN, TAG_PREFIX } from './constants';
import type { ConventionalCommit } from './interfaces/conventional-commit.interface';

/** On 0.x they bump the patch; any other type bumps nothing unless it is a breaking change (principle 7). */
const PATCH_TYPES: string[] = ['feat', 'fix', 'perf'];

/** A line of `git ls-remote --tags`: `<sha>\trefs/tags/<tag>`, with `^{}` on the peeled commit of an annotated tag. */
const REMOTE_TAG_LINE: RegExp = /^([0-9a-f]+)\trefs\/tags\/(.+?)(\^\{\})?$/;

function versionNumbers(tag: string): number[] {
  const match: RegExpExecArray | null = TAG_PATTERN.exec(tag);

  if (match === null) {
    throw new Error(`${tag} is not a release tag (${TAG_PREFIX}x.y.z)`);
  }

  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compareTags(left: string, right: string): number {
  const [leftMajor, leftMinor, leftPatch]: number[] = versionNumbers(left);
  const [rightMajor, rightMinor, rightPatch]: number[] = versionNumbers(right);

  return leftMajor - rightMajor || leftMinor - rightMinor || leftPatch - rightPatch;
}

/** The release tags (`nest-tools@x.y.z`, numbers only) in the output of `git tag --list` or `git tag --points-at`. */
export function parseTagList(output: string): string[] {
  return output.split(/\r?\n/).filter((tag: string): boolean => TAG_PATTERN.test(tag));
}

/** The release tags in the output of `git ls-remote --tags`, each with the commit it points at (the `^{}` line of an annotated tag). */
export function parseRemoteTags(output: string): Map<string, string> {
  const commits: Map<string, string> = new Map<string, string>();

  for (const line of output.split(/\r?\n/)) {
    const match: RegExpExecArray | null = REMOTE_TAG_LINE.exec(line);

    if (match !== null && TAG_PATTERN.test(match[2]) && (match[3] !== undefined || !commits.has(match[2]))) {
      commits.set(match[2], match[1]);
    }
  }

  return commits;
}

/** The release tag of the highest version, comparing numbers (`0.10.0` > `0.9.0`); `null` without tags (the first release). */
export function highestTag(tags: string[]): string | null {
  return tags.reduce((highest: string | null, tag: string): string | null => (highest === null || compareTags(tag, highest) > 0 ? tag : highest), null);
}

/**
 * The version (`x.y.z`) that follows `lastTag` on 0.x: a breaking change bumps the minor and, otherwise, `feat`, `fix` or `perf` bump the patch,
 * once per release; `null` when no commit bumps it. Throws from 1.0.0, which is out of scope.
 */
export function nextVersion(lastTag: string, commits: ConventionalCommit[]): string | null {
  const [major, minor, patch]: number[] = versionNumbers(lastTag);

  if (major >= 1) {
    throw new Error(`Cannot compute the next version from ${lastTag}: releases from 1.0.0 are out of scope`);
  }

  if (commits.some((commit: ConventionalCommit): boolean => commit.breaking)) {
    return `0.${minor + 1}.0`;
  }

  if (commits.some((commit: ConventionalCommit): boolean => PATCH_TYPES.includes(commit.type))) {
    return `0.${minor}.${patch + 1}`;
  }

  return null;
}
