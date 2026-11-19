import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import { Catch, Logger, Optional } from '@nestjs/common';
import type { AbstractHttpAdapter } from '@nestjs/core';
import { HttpAdapterHost } from '@nestjs/core';
import { resolveAllExceptionsFilterOptions } from './all-exceptions-filter.options';
import { buildExceptionBody, classifyException, stripQueryString } from './exception-body';
import { buildExceptionLogEntry } from './exception-log';
import type { AllExceptionsFilterOptions } from './interfaces/all-exceptions-filter-options.interface';
import type { ClassifiedException } from './interfaces/classified-exception.interface';
import type { ExceptionLogEntry } from './interfaces/exception-log-entry.interface';
import { LOGGER_CONTEXT } from './const/all-exceptions-filter';

/**
 * Catches every error of an HTTP request and replies with `{ statusCode, message, error, path, timestamp }`,
 * without ever showing a stack, a cause or the message of an unknown error. Server errors (5xx) are logged at
 * `error` level with their trace and client errors (4xx) at `warn` level, with `AllExceptionsFilter` as context.
 * Outside HTTP (GraphQL, WebSockets, microservices) it returns the error unchanged.
 *
 * See the package README for the response format, what is logged and how each way of registering it behaves.
 *
 * @example
 * ```ts
 * @Module({
 *   providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }],
 * })
 * export class AppModule {}
 * ```
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter<unknown> {
  private readonly _logger: Logger = new Logger(LOGGER_CONTEXT);
  private readonly _logClientErrors: boolean;

  /**
   * @param _httpAdapterHost The HTTP adapter host of the application (`app.get(HttpAdapterHost)`); Nest injects it when it creates the filter.
   * @param options The filter options; when Nest creates the filter it receives `undefined`, and the defaults apply.
   * @throws TypeError when the options are not an object or `logClientErrors` is not a boolean.
   */
  constructor(
    private readonly _httpAdapterHost: HttpAdapterHost,
    @Optional() options?: AllExceptionsFilterOptions,
  ) {
    this._logClientErrors = resolveAllExceptionsFilterOptions(options).logClientErrors;
  }

  /** Builds and writes the log entry; called after replying, so a failure here cannot leave the client without its response. */
  private _log(exception: unknown, classified: ClassifiedException, method: string, url: string, responseSent: boolean): void {
    const entry: ExceptionLogEntry | null = buildExceptionLogEntry(exception, classified, method, url, responseSent, this._logClientErrors);

    if (entry === null) {
      return;
    }

    if (entry.level === 'warn') {
      this._logger.warn(entry.line);
    } else if (entry.trace === undefined) {
      this._logger.error(entry.line);
    } else {
      this._logger.error(entry.line, entry.trace);
    }
  }

  /**
   * Replies to the error of an HTTP request (or ends the response if it was already sent) and logs it.
   *
   * @returns `undefined` for an HTTP request; outside HTTP, the exception unchanged, which is neither replied to nor logged.
   */
  public catch(exception: unknown, host: ArgumentsHost): unknown {
    if (host.getType() !== 'http') {
      return exception;
    }

    // Read on each call, as the Nest docs recommend: the adapter may not be ready when the filter is created.
    const httpAdapter: AbstractHttpAdapter = this._httpAdapterHost.httpAdapter;
    const request: unknown = host.switchToHttp().getRequest();
    const response: unknown = host.switchToHttp().getResponse();
    const url: string = httpAdapter.getRequestUrl(request);
    const responseSent: boolean = httpAdapter.isHeadersSent(response);
    const classified: ClassifiedException = classifyException(exception);

    if (responseSent) {
      httpAdapter.end(response);
    } else {
      httpAdapter.reply(response, buildExceptionBody(classified, stripQueryString(url), new Date()), classified.statusCode);
    }

    this._log(exception, classified, httpAdapter.getRequestMethod(request), url, responseSent);

    return undefined;
  }
}
