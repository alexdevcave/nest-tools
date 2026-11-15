/**
 * What the filter knows about a thrown value: its kind and the public data of its response.
 */
export interface ClassifiedException {
  /**
   * `http`: an `HttpException` with a 4xx or 5xx status; `external`: an `Error` with an integer 4xx or 5xx `statusCode`
   * and a boolean `expose` (as created by `http-errors`); `unknown`: any other value.
   */
  kind: 'http' | 'external' | 'unknown';
  statusCode: number;
  message: string | unknown[];
  error: string;
  /** Own enumerable fields of an `HttpException` object body, except the five fields of the response body, `stack` and `cause`. */
  extraFields: Record<string, unknown>;
}
