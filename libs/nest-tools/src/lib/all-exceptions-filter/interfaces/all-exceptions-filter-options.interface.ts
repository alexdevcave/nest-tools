/**
 * Options for `AllExceptionsFilter`.
 */
export interface AllExceptionsFilterOptions {
  /**
   * Whether client errors (4xx) are logged at `warn` level. Turning it off changes no response and does not affect how server errors (5xx) are logged.
   *
   * @defaultValue `true`
   */
  logClientErrors?: boolean;
}
