export const TAG_PREFIX: string = 'nest-tools@';
// Only numeric x.y.z: tags such as `v1.0.0` or `nest-tools@1.0` are not releases.
export const TAG_PATTERN: RegExp = /^nest-tools@(\d+)\.(\d+)\.(\d+)$/;
export const LIBRARY_DIR: string = 'libs/nest-tools/';
export const MANIFEST_PATH: string = 'libs/nest-tools/package.json';
export const CHANGELOG_PATH: string = 'libs/nest-tools/CHANGELOG.md';
export const FIRST_VERSION: string = '0.1.0';
export const RELEASE_COMMIT_PREFIX: string = 'chore(release): ';
export const REMOTE: string = 'origin';
export const BRANCH: string = 'main';
export const PUBLISH_DIR: string = 'dist/libs/nest-tools';
export const NPM_DIST_TAG: string = 'latest';
