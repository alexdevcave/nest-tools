import { stripQueryString } from './exception-body';
import type { ClassifiedException } from './interfaces/classified-exception.interface';
import type { ExceptionLogEntry } from './interfaces/exception-log-entry.interface';
import { getValueType } from './value-type';
import { LINE_BREAKS, RESPONSE_SENT_SUFFIX } from './const/all-exceptions-filter';

/** The message of an `Error`, a thrown string itself or, for any other value, only its type: never its content. */
function getOriginalMessage(value: unknown): string {
  if (value instanceof Error) {
    return value.message;
  }

  if (typeof value === 'string') {
    return value;
  }

  return `Non-Error value of type ${getValueType(value)}`;
}

/** The stack of an error and a `Caused by: ` line for each chained cause; the `Set` stops a circular chain. */
function buildTrace(exception: Error): string | undefined {
  const lines: string[] = typeof exception.stack === 'string' ? [exception.stack] : [];
  const seen: Set<unknown> = new Set<unknown>([exception]);
  let current: unknown = exception;

  while (current instanceof Error && 'cause' in current && current.cause !== undefined && !seen.has(current.cause)) {
    current = current.cause;
    seen.add(current);
    lines.push(`Caused by: ${current instanceof Error && typeof current.stack === 'string' ? current.stack : getOriginalMessage(current)}`);
  }

  return lines.length > 0 ? lines.join('\n') : undefined;
}

/**
 * Builds the log entry of an error, or `null` when it must not be logged (a 4xx with `logClientErrors` set to `false`).
 * The line only holds the method, the path without query string, the status code and, for a 5xx, the message: never the body, headers or query.
 *
 * @param exception The thrown value, to read the original message and the trace of an unknown error.
 * @param classified The classified exception, from `classifyException`.
 * @param method The request method.
 * @param url The request URL; its query string is removed.
 * @param responseSent Whether the response had already been sent when the error happened.
 * @param logClientErrors Whether 4xx errors are logged.
 */
export function buildExceptionLogEntry(exception: unknown, classified: ClassifiedException, method: string, url: string, responseSent: boolean, logClientErrors: boolean): ExceptionLogEntry | null {
  const request: string = `${method} ${stripQueryString(url)} ${classified.statusCode}`;
  const suffix: string = responseSent ? RESPONSE_SENT_SUFFIX : '';

  if (classified.statusCode < 500) {
    return logClientErrors ? { level: 'warn', line: `${request}${suffix}` } : null;
  }

  const message: string | unknown[] = classified.kind === 'unknown' ? getOriginalMessage(exception) : classified.message;
  const text: string = (Array.isArray(message) ? message.join(', ') : message).replace(LINE_BREAKS, ' ');

  return { level: 'error', line: `${request} - ${text}${suffix}`, trace: exception instanceof Error ? buildTrace(exception) : undefined };
}
