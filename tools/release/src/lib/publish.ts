import { BRANCH, NPM_DIST_TAG, PUBLISH_DIR, REMOTE, TAG_PREFIX } from './constants';
import type { ReleaseDeps } from './interfaces/release-deps.interface';
import { errorMessage } from './release';
import { highestTag, parseRemoteTags, parseTagList } from './version';

/**
 * Says the name of the check and returns what `inspect` found; when it found nothing (`null` or `false`) or its command failed,
 * throws naming the check and saying how to fix it, so the publication stops before it builds or calls npm (FR-9).
 */
function check<T>(deps: ReleaseDeps, name: string, fix: string, inspect: () => T | null | false): T {
  const stopped: string = `Publish stopped: the check "${name}" failed`;

  deps.log(`Check: ${name}`);

  try {
    const found: T | null | false = inspect();

    if (found !== null && found !== false) {
      return found;
    }
  } catch (error: unknown) {
    throw new Error(`${stopped} (${errorMessage(error)}); nothing was published. ${fix}`);
  }

  throw new Error(`${stopped}; nothing was published. ${fix}`);
}

/**
 * The publication (FR-9, FR-10, NFR-1): checks, before building, that the working tree is clean and that the current commit has the release tag
 * of the highest version, on origin at this commit and with the commit on origin/main; then builds the library without the Nx cache and publishes
 * it from `dist` with the `latest` tag, in the inherited terminal so npm asks the maintainer for the 2FA. It never creates commits, tags or
 * versions, so retrying it is running it again from the commit of the tag. Returns once published (exit code 0); throws, saying what is missing,
 * when it stops or npm fails (exit code 1).
 */
export function publish(deps: ReleaseDeps): void {
  check(deps, 'clean working tree', 'Commit, stash or remove the changes and the untracked files.', (): boolean => deps.git(['status', '--porcelain', '--untracked-files=all']) === '');

  // With several release tags on the commit, the highest.
  const tag: string = check(deps, 'the current commit has a release tag', `Check out the release to publish: git checkout ${TAG_PREFIX}x.y.z`, (): string | null =>
    highestTag(parseTagList(deps.git(['tag', '--points-at', 'HEAD']))),
  );
  const pushRelease: string = `git push --atomic ${REMOTE} ${BRANCH} ${tag}`;
  // Each remote release tag with its commit (the `^{}` line of the annotated tag).
  const remoteTags: Map<string, string> = check(
    deps,
    `${tag} is on ${REMOTE} at the current commit`,
    `Push the release (${pushRelease}); if ${REMOTE} has ${tag} on another commit, publish from that commit.`,
    (): Map<string, string> | null => {
      const tags: Map<string, string> = parseRemoteTags(deps.git(['ls-remote', '--tags', REMOTE, `${TAG_PREFIX}*`]));

      return tags.get(tag) === deps.git(['rev-parse', 'HEAD']) ? tags : null;
    },
  );

  check(
    deps,
    `${tag} is the highest release`,
    `Only the highest release is published, so ${NPM_DIST_TAG} never goes back; publish from the commit of the highest ${TAG_PREFIX}x.y.z tag.`,
    (): boolean => highestTag([...parseTagList(deps.git(['tag', '--list'])), ...remoteTags.keys()]) === tag,
  );
  // Fails without a connection.
  check(deps, `the current commit is on ${REMOTE}/${BRANCH}`, `Push the release (${pushRelease}) and check that ${REMOTE} is reachable.`, (): boolean => {
    deps.git(['fetch', '--quiet', REMOTE, BRANCH]);

    return deps.git(['branch', '--remotes', '--contains', 'HEAD', '--list', `${REMOTE}/${BRANCH}`]) !== '';
  });
  // `--skip-nx-cache` builds the package from this commit, and the build empties `dist/libs/nest-tools` first (D10).
  check(deps, 'nest-tools builds without the Nx cache', 'See the build output above and publish again: pnpm run release:publish', (): boolean => {
    deps.run('pnpm', ['nx', 'run', 'nest-tools:build', '--skip-nx-cache', '--outputStyle=static']);

    return true;
  });

  try {
    deps.run('npm', ['publish', '--tag', NPM_DIST_TAG], PUBLISH_DIR);
  } catch (error: unknown) {
    throw new Error(`Publish failed: npm did not publish ${tag} (${errorMessage(error)}); it created no commit, tag or version, so retry from this commit: pnpm run release:publish`);
  }

  deps.log(`Published ${tag} to npm with the ${NPM_DIST_TAG} tag`);
}
