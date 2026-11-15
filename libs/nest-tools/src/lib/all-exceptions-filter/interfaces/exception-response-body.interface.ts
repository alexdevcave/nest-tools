/**
 * The response body of an error: the five fields, plus the extra fields of an `HttpException` object body (never `stack` or `cause`).
 */
export interface ExceptionResponseBody {
  statusCode: number;
  message: string | unknown[];
  error: string;
  path: string;
  timestamp: string;
  [field: string]: unknown;
}
