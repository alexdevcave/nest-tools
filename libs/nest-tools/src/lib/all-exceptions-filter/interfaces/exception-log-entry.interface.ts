/**
 * What the filter logs for an error: the Nest log level, a single line and, for a server error, its trace.
 */
export interface ExceptionLogEntry {
  /** `error` for a 5xx status code, `warn` for a 4xx one. */
  level: 'error' | 'warn';
  /** Method, path without query string and status code; for a 5xx, also its message. */
  line: string;
  /** The stack of a 5xx error and of each chained cause; `undefined` when there is nothing to show. */
  trace?: string;
}
