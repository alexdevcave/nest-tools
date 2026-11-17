/**
 * The release that the commits of the library produce.
 */
export interface NextRelease {
  /** `x.y.z`. */
  version: string;
  /** `nest-tools@x.y.z`. */
  tag: string;
  /** The changelog section of the version, as `changelog.ts` builds it. */
  section: string;
}
