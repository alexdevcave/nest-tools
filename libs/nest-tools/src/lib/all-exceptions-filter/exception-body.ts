import { HttpException } from '@nestjs/common';
import { STATUS_CODES } from 'node:http';
import type { ClassifiedException } from './interfaces/classified-exception.interface';
import type { ExceptionResponseBody } from './interfaces/exception-response-body.interface';
import { HIDDEN_FIELDS, RESERVED_FIELDS } from './const/all-exceptions-filter';

function isErrorStatus(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 400 && value <= 599;
}

function isObjectBody(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function classifyHttpException(exception: HttpException, statusCode: number): ClassifiedException {
  const response: unknown = exception.getResponse();
  const body: Record<string, unknown> = isObjectBody(response) ? response : {};
  const name: string = getStatusName(statusCode);
  const message: unknown = typeof response === 'string' ? response : body['message'];

  return {
    kind: 'http',
    statusCode,
    message: typeof message === 'string' || Array.isArray(message) ? message : name,
    error: typeof body['error'] === 'string' ? body['error'] : name,
    extraFields: Object.fromEntries(Object.entries(body).filter(([field]: [string, unknown]): boolean => !RESERVED_FIELDS.has(field) && !HIDDEN_FIELDS.has(field))),
  };
}

/**
 * The Node.js name of an HTTP status code, or `Client Error` (4xx) / `Server Error` (5xx) when Node has none.
 */
export function getStatusName(statusCode: number): string {
  return STATUS_CODES[statusCode] ?? (statusCode < 500 ? 'Client Error' : 'Server Error');
}

/**
 * The path of a request URL, without its query string.
 */
export function stripQueryString(url: string): string {
  return url.split('?', 1)[0];
}

/**
 * Classifies a thrown value and picks the data its response may show; never its stack, its cause or, for an unknown error, its message.
 */
export function classifyException(exception: unknown): ClassifiedException {
  if (exception instanceof HttpException) {
    const statusCode: unknown = exception.getStatus();

    if (isErrorStatus(statusCode)) {
      return classifyHttpException(exception, statusCode);
    }
    // `in` also reads the prototype, where the `http-errors` classes define `statusCode` and `expose`.
  } else if (exception instanceof Error && 'statusCode' in exception && 'expose' in exception && isErrorStatus(exception.statusCode) && typeof exception.expose === 'boolean') {
    const name: string = getStatusName(exception.statusCode);

    return { kind: 'external', statusCode: exception.statusCode, message: exception.expose ? exception.message : name, error: name, extraFields: {} };
  }

  return { kind: 'unknown', statusCode: 500, message: 'Internal server error', error: 'Internal Server Error', extraFields: {} };
}

/**
 * Builds the response body of a classified exception; the five fields always come from the filter.
 *
 * @param exception The classified exception, from `classifyException`.
 * @param path The request path, without its query string.
 * @param date The moment of the response, written in ISO 8601 (UTC, with milliseconds).
 */
export function buildExceptionBody(exception: ClassifiedException, path: string, date: Date): ExceptionResponseBody {
  return { statusCode: exception.statusCode, message: exception.message, error: exception.error, path, timestamp: date.toISOString(), ...exception.extraFields };
}
