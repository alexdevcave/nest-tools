import { addChangelogSection, firstReleaseSection, releaseSection } from './changelog';
import { BRANCH, CHANGELOG_PATH, FIRST_VERSION, LIBRARY_DIR, MANIFEST_PATH, RELEASE_COMMIT_PREFIX, REMOTE, TAG_PREFIX } from './constants';
import { parseGitLog } from './conventional-commit';
import type { ConventionalCommit } from './interfaces/conventional-commit.interface';
import type { NextRelease } from './interfaces/next-release.interface';
import type { ReleaseDeps } from './interfaces/release-deps.interface';
import { highestTag, nextVersion, parseRemoteTags, parseTagList } from './version';

/** The next release from the commits of the library since the last tag; `null`, after saying so, when none bumps the version (FR-3). */
function computeNextRelease(deps: ReleaseDeps): NextRelease | null {
  const lastTag: string | null = highestTag(parseTagList(deps.git(['tag', '--list', `${TAG_PREFIX}*`])));

  if (lastTag === null) {
    return { version: FIRST_VERSION, tag: `${TAG_PREFIX}${FIRST_VERSION}`, section: firstReleaseSection(deps.now()) };
  }

  // `-- <library dir>`: exactly the commits that change a file of the library, also when they change others.
  const commits: ConventionalCommit[] = parseGitLog(deps.git(['log', `${lastTag}..HEAD`, '--format=%H%x1f%B%x1e', '--', LIBRARY_DIR]));
  const version: string | null = nextVersion(lastTag, commits);

  if (version === null) {
    deps.log(`Nothing to release since ${lastTag}`);

    return null;
  }

  return { version, tag: `${TAG_PREFIX}${version}`, section: releaseSection(version, deps.now(), commits) };
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** Says the name of the check and throws, naming it, when it does not pass or its command fails. */
function check(deps: ReleaseDeps, name: string, passes: () => boolean): void {
  const stopped: string = `Release stopped: the check "${name}" failed; nothing was changed`;

  deps.log(`Check: ${name}`);

  try {
    if (passes()) {
      return;
    }
  } catch (error: unknown) {
    throw new Error(`${stopped} (${errorMessage(error)})`);
  }

  throw new Error(stopped);
}

/** The checks of the spec, in its order; the first that fails stops the release before it writes anything (FR-4). */
function runChecks(deps: ReleaseDeps, next: NextRelease): void {
  check(deps, 'clean working tree', (): boolean => deps.git(['status', '--porcelain', '--untracked-files=all']) === '');
  // Empty when `HEAD` is detached.
  check(deps, `on the ${BRANCH} branch`, (): boolean => deps.git(['branch', '--show-current']) === BRANCH);
  // Fails without a connection; local commits not pushed yet do not stop it.
  check(deps, `up to date with ${REMOTE}/${BRANCH}`, (): boolean => {
    deps.git(['fetch', '--quiet', REMOTE, BRANCH]);

    return deps.git(['rev-list', '--count', `HEAD..${REMOTE}/${BRANCH}`]) === '0';
  });
  check(deps, 'lint, test, build and e2e pass', (): boolean => {
    deps.run('pnpm', ['nx', 'run-many', '-t', 'lint', 'test', 'build', 'e2e', '--outputStyle=static']);

    return true;
  });
  check(
    deps,
    `tag ${next.tag} does not exist yet`,
    (): boolean => !parseTagList(deps.git(['tag', '--list'])).includes(next.tag) && !parseRemoteTags(deps.git(['ls-remote', '--tags', REMOTE, `${TAG_PREFIX}*`])).has(next.tag),
  );
}

/** The manifest with the new version and without `private` (FR-8), keeping the other fields, their order and the format of the file. */
function releaseManifest(manifest: string, version: string): string {
  const fields: Record<string, unknown> = JSON.parse(manifest) as Record<string, unknown>;

  fields['version'] = version;
  delete fields['private'];

  return `${JSON.stringify(fields, null, 2)}\n`;
}

/** A done step undone with `git <args>`, which is also the command to undo it by hand. */
function gitUndo(deps: ReleaseDeps, args: string[]): [string, () => void] {
  return [
    `git ${args.join(' ')}`,
    (): void => {
      deps.git(args);
    },
  ];
}

/** Undoes the done steps in reverse order; when an undo fails, stops there and returns why, with the commands left to run by hand. `null` when all were undone. */
function undo(done: [string, () => void][]): string | null {
  const pending: [string, () => void][] = [...done].reverse();

  for (const [index, [, undoStep]] of pending.entries()) {
    try {
      undoStep();
    } catch (error: unknown) {
      const commands: string[] = pending.slice(index).map(([command]: [string, () => void]): string => `  ${command}`);

      return `undoing it failed too (${errorMessage(error)}); finish undoing it by hand, from the repository root:\n${commands.join('\n')}`;
    }
  }

  return null;
}

/** Runs the step `name`; when it fails, undoes what the steps before it did and throws naming it (FR-4). */
function runStep<T>(name: string, done: [string, () => void][], action: () => T): T {
  try {
    return action();
  } catch (error: unknown) {
    const stopped: string = `Release stopped: the step "${name}" failed (${errorMessage(error)})`;
    const undoFailure: string | null = undo(done);

    throw new Error(undoFailure === null ? `${stopped}; the release undid its changes` : `${stopped}, and ${undoFailure}`);
  }
}

/**
 * Writes the new version (without `private`) and the changelog section, commits both files in one `chore(release)` commit and tags it (FR-6 to FR-8).
 * Each step adds its undo once it is done, so a failure undoes only what was done, in reverse order (FR-4). Returns the `HEAD` before the release.
 */
function commitAndTag(deps: ReleaseDeps, next: NextRelease): string {
  const files: string[] = [MANIFEST_PATH, CHANGELOG_PATH];
  // [the command that undoes the step by hand, its undo]
  const done: [string, () => void][] = [];
  const [previousHead, manifest, changelog]: [string, string | null, string | null] = runStep('save HEAD and the files', done, (): [string, string | null, string | null] => [
    deps.git(['rev-parse', 'HEAD']),
    deps.readFile(MANIFEST_PATH),
    deps.readFile(CHANGELOG_PATH),
  ]);

  runStep(`write ${MANIFEST_PATH}`, done, (): void => {
    if (manifest === null) {
      throw new Error('the file does not exist');
    }

    deps.writeFile(MANIFEST_PATH, releaseManifest(manifest, next.version));
    // The checks found a clean working tree, so the saved content is the one in `HEAD`.
    done.push([`git checkout ${previousHead} -- ${MANIFEST_PATH}`, (): void => deps.writeFile(MANIFEST_PATH, manifest)]);
  });
  runStep(`write ${CHANGELOG_PATH}`, done, (): void => {
    deps.writeFile(CHANGELOG_PATH, addChangelogSection(changelog, next.section));
    done.push(
      changelog === null
        ? [`rm -f ${CHANGELOG_PATH}`, (): void => deps.removeFile(CHANGELOG_PATH)]
        : [`git checkout ${previousHead} -- ${CHANGELOG_PATH}`, (): void => deps.writeFile(CHANGELOG_PATH, changelog)],
    );
  });
  runStep('git add', done, (): void => {
    deps.git(['add', ...files]);
    done.push(gitUndo(deps, ['reset', '-q', previousHead, '--', ...files]));
  });
  runStep('git commit', done, (): void => {
    deps.git(['commit', '-m', `${RELEASE_COMMIT_PREFIX}${next.tag}`]);
    done.push(gitUndo(deps, ['reset', '--soft', previousHead]));
  });
  runStep('git tag', done, (): void => {
    deps.git(['tag', '-a', next.tag, '-m', next.tag]);
    done.push(gitUndo(deps, ['tag', '-d', next.tag]));
  });

  return previousHead;
}

/**
 * The release (FR-1 to FR-8): computes the next version and its changelog section and, unless it is a dry run, passes the checks,
 * commits the manifest and the changelog, tags the commit and prints the commands to push, publish and undo it; it never pushes nor calls npm (NFR-3).
 * Returns when there is nothing to release, the dry run is shown or the release is done (exit code 0); throws, naming the step, when it stops (exit code 1).
 */
export function release(deps: ReleaseDeps, dryRun: boolean): void {
  const next: NextRelease | null = computeNextRelease(deps);

  if (next === null) {
    return;
  }

  if (dryRun) {
    deps.log(`Dry run: the release would create ${next.tag} with this changelog section:\n\n${next.section.trimEnd()}`);

    return;
  }

  runChecks(deps, next);

  const previousHead: string = commitAndTag(deps, next);

  deps.log(`Created the commit "${RELEASE_COMMIT_PREFIX}${next.tag}" and its annotated tag ${next.tag}, without pushing them.`);
  deps.log(`Push the branch and the tag together: git push --atomic ${REMOTE} ${BRANCH} ${next.tag}`);
  deps.log('Then publish it: pnpm run release:publish');
  deps.log(`To undo the release before pushing it: git tag -d ${next.tag} && git reset --keep ${previousHead}`);
}
