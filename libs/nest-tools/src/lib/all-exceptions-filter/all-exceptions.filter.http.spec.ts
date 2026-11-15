import { BadRequestException, Controller, Get, NotFoundException, Post, ServiceUnavailableException, UseFilters } from '@nestjs/common';
import type { INestApplication, LoggerService, ModuleMetadata } from '@nestjs/common';
import { APP_FILTER, HttpAdapterHost } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import type { TestingModule } from '@nestjs/testing';
import { once } from 'node:events';
import { request as httpRequest } from 'node:http';
import type { ClientRequest, IncomingMessage } from 'node:http';
import { json } from 'node:stream/consumers';
import { AllExceptionsFilter } from './all-exceptions.filter';

// A local type, not an interface in `interfaces/`: the build only leaves out specs, so that file would be published.
type JsonResult = { status: number; body: Record<string, unknown> };

const GENERIC_500: Record<string, string> = { message: 'Internal server error', error: 'Internal Server Error' };
const NOT_FOUND: Record<string, string> = { message: 'User not found', error: 'Not Found' };
const LOGGER_CONTEXT: string = 'AllExceptionsFilter';
const BOOM_TRACE: unknown = expect.stringMatching(/^Error: boom\n\s+at /);
const JSON_HEADERS: Record<string, string> = { 'content-type': 'application/json' };
// Above the default body limit of both platforms: Express 100 kB and Fastify 1 MiB.
const TOO_LARGE_BODY: string = JSON.stringify({ data: 'x'.repeat(2 * 1024 * 1024) });
// The secret travels in the query string, the authorization header and the body of every request of the FR-8 test.
const SECRET_HEADERS: Record<string, string> = { ...JSON_HEADERS, authorization: 'Bearer secret' };
const SECRET_BODY: string = '{"password":"secret"}';
const BROKEN_SECRET_BODY: string = '{"password":secret';

@Controller('errors')
class ErrorsController {
  @Get('not-found')
  public notFound(): never {
    throw new NotFoundException('User not found');
  }

  @Get('validation')
  public validation(): never {
    throw new BadRequestException(['a', 'b']);
  }

  @Get('code')
  public withCode(): never {
    throw new NotFoundException({ message: 'User not found', code: 'USER_NOT_FOUND' });
  }

  @Get('unavailable')
  public unavailable(): never {
    throw new ServiceUnavailableException('Maintenance');
  }

  @Get('error')
  public error(): never {
    throw new Error('boom');
  }

  @Get('text')
  public text(): never {
    throw 'boom';
  }

  @Post('not-found')
  public postNotFound(): never {
    throw new NotFoundException('User not found');
  }

  @Post('error')
  public postError(): never {
    throw new Error('boom');
  }
}

@Controller('controller-filter')
@UseFilters(AllExceptionsFilter)
class ControllerFilterController {
  @Get()
  public notFound(): never {
    throw new NotFoundException('User not found');
  }
}

@Controller('route-filter')
class RouteFilterController {
  @Get()
  @UseFilters(AllExceptionsFilter)
  public notFound(): never {
    throw new NotFoundException('User not found');
  }
}

const APP_FILTER_MODULE: ModuleMetadata = { controllers: [ErrorsController], providers: [{ provide: APP_FILTER, useClass: AllExceptionsFilter }] };
const NO_CLIENT_LOGS_MODULE: ModuleMetadata = {
  controllers: [ErrorsController],
  providers: [{ provide: APP_FILTER, useFactory: (host: HttpAdapterHost): AllExceptionsFilter => new AllExceptionsFilter(host, { logClientErrors: false }), inject: [HttpAdapterHost] }],
};

async function startApp(platform: string, metadata: ModuleMetadata, useGlobalFilter: boolean = false): Promise<INestApplication> {
  const moduleRef: TestingModule = await Test.createTestingModule(metadata).compile();
  // Logs are checked in their own tests; here they would only add noise.
  const app: INestApplication =
    platform === 'fastify' ? moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter(), { logger: false }) : moduleRef.createNestApplication({ logger: false });

  if (useGlobalFilter) {
    app.useGlobalFilters(new AllExceptionsFilter(app.get(HttpAdapterHost)));
  }
  app.setGlobalPrefix('api');
  await app.listen(0, '127.0.0.1');
  return app;
}

async function getJson(app: INestApplication, path: string, init: RequestInit = {}): Promise<JsonResult> {
  const response: Response = await fetch(`${await app.getUrl()}${path}`, init);
  const body: Record<string, unknown> = (await response.json()) as Record<string, unknown>;

  return { status: response.status, body };
}

/**
 * Posts a request that declares `TOO_LARGE_BODY` in its Content-Length. Both platforms reject it by that header,
 * but Express reads the whole body before replying, while Fastify replies before reading it and closes the connection:
 * uploading the body to Fastify races that close (ECONNRESET, which can lose the response), so it only gets the headers.
 */
async function postTooLargeBody(app: INestApplication, platform: string, path: string): Promise<JsonResult> {
  const headers: Record<string, string> = { ...JSON_HEADERS, 'content-length': String(Buffer.byteLength(TOO_LARGE_BODY)) };
  const request: ClientRequest = httpRequest(`${await app.getUrl()}${path}`, { method: 'POST', headers });
  // Listened to before the request is sent.
  const result: Promise<JsonResult> = once(request, 'response').then(
    async ([response]: IncomingMessage[]): Promise<JsonResult> => ({ status: response.statusCode ?? 0, body: (await json(response)) as Record<string, unknown> }),
  );

  // An error after the response (the connection closed) does not matter; one before it still rejects `once`.
  request.on('error', (): void => undefined);
  if (platform === 'fastify') {
    request.flushHeaders();
  } else {
    request.end(TOO_LARGE_BODY);
  }

  return result;
}

/** A logger method that stores each call in `calls` as `[level, message, ...params]`. */
function recordTo(calls: unknown[][], level: string): (message: unknown, ...params: unknown[]) => void {
  return (message: unknown, ...params: unknown[]): void => {
    calls.push([level, message, ...params]);
  };
}

/** Replaces the app logger (and so the static one Nest's `Logger` delegates to) with a fake one and returns every call it receives. */
function captureLogs(app: INestApplication): unknown[][] {
  const calls: unknown[][] = [];
  const logger: LoggerService = {
    log: recordTo(calls, 'log'),
    error: recordTo(calls, 'error'),
    warn: recordTo(calls, 'warn'),
    debug: recordTo(calls, 'debug'),
    verbose: recordTo(calls, 'verbose'),
    fatal: recordTo(calls, 'fatal'),
  };

  app.useLogger(logger);
  return calls;
}

/** The calls of the filter: Nest's `Logger` passes its context as the last parameter. */
function filterLogs(calls: unknown[][]): unknown[][] {
  return calls.filter((call: unknown[]): boolean => call[call.length - 1] === LOGGER_CONTEXT);
}

function expectFilterResponse(result: JsonResult, statusCode: number, fields: Record<string, unknown>, path: string): void {
  const timestamp: unknown = result.body['timestamp'];

  expect(result.status).toBe(statusCode);
  expect(result.body).toEqual({ statusCode, ...fields, path, timestamp: expect.any(String) });
  expect(new Date(String(timestamp)).toISOString()).toBe(timestamp);
}

describe.each(['express', 'fastify'])('spec 003 all exceptions filter over HTTP with the %s platform', (platform: string): void => {
  let app: INestApplication | undefined;

  afterEach(async (): Promise<void> => {
    await app?.close();
    app = undefined;
  });

  it('FR-1 works when Nest creates it through APP_FILTER, injecting HttpAdapterHost and leaving the optional options undefined', async (): Promise<void> => {
    app = await startApp(platform, APP_FILTER_MODULE);

    expectFilterResponse(await getJson(app, '/api/errors/not-found?token=secret'), 404, NOT_FOUND, '/api/errors/not-found');
  });

  it('FR-1 works when the developer creates it with the HTTP adapter host and registers it with useGlobalFilters', async (): Promise<void> => {
    app = await startApp(platform, { controllers: [ErrorsController] }, true);

    expectFilterResponse(await getJson(app, '/api/errors/not-found?token=secret'), 404, NOT_FOUND, '/api/errors/not-found');
  });

  it('FR-1 works when a controller enables it with @UseFilters', async (): Promise<void> => {
    app = await startApp(platform, { controllers: [ControllerFilterController] });

    expectFilterResponse(await getJson(app, '/api/controller-filter?token=secret'), 404, NOT_FOUND, '/api/controller-filter');
  });

  it('FR-1 works when a route enables it with @UseFilters', async (): Promise<void> => {
    app = await startApp(platform, { controllers: [RouteFilterController] });

    expectFilterResponse(await getJson(app, '/api/route-filter?token=secret'), 404, NOT_FOUND, '/api/route-filter');
  });

  describe('with the filter registered through APP_FILTER', (): void => {
    it('FR-2 replies to an HTTP exception with its status, its message, the status name and the path without the query string', async (): Promise<void> => {
      app = await startApp(platform, APP_FILTER_MODULE);

      expectFilterResponse(await getJson(app, '/api/errors/not-found?token=secret'), 404, NOT_FOUND, '/api/errors/not-found');
    });

    it('FR-2 keeps a list of validation messages in message', async (): Promise<void> => {
      app = await startApp(platform, APP_FILTER_MODULE);

      expectFilterResponse(await getJson(app, '/api/errors/validation'), 400, { message: ['a', 'b'], error: 'Bad Request' }, '/api/errors/validation');
    });

    it('FR-2 keeps the extra fields of the exception body, such as code', async (): Promise<void> => {
      app = await startApp(platform, APP_FILTER_MODULE);

      expectFilterResponse(await getJson(app, '/api/errors/code'), 404, { ...NOT_FOUND, code: 'USER_NOT_FOUND' }, '/api/errors/code');
    });

    it('FR-2 replies to a 503 with its own message', async (): Promise<void> => {
      app = await startApp(platform, APP_FILTER_MODULE);

      expectFilterResponse(await getJson(app, '/api/errors/unavailable'), 503, { message: 'Maintenance', error: 'Service Unavailable' }, '/api/errors/unavailable');
    });

    it('FR-3 replies to an unknown Error with the generic 500 and without its message', async (): Promise<void> => {
      app = await startApp(platform, APP_FILTER_MODULE);
      const result: JsonResult = await getJson(app, '/api/errors/error');

      expectFilterResponse(result, 500, GENERIC_500, '/api/errors/error');
      expect(JSON.stringify(result.body)).not.toContain('boom');
    });

    it('FR-3 replies to a thrown string with the generic 500 and without its text', async (): Promise<void> => {
      app = await startApp(platform, APP_FILTER_MODULE);
      const result: JsonResult = await getJson(app, '/api/errors/text');

      expectFilterResponse(result, 500, GENERIC_500, '/api/errors/text');
      expect(JSON.stringify(result.body)).not.toContain('boom');
    });
  });

  describe('with errors that only the global filter catches', (): void => {
    it('FR-2 replies to a missing route with a 404 and the path without the query string', async (): Promise<void> => {
      app = await startApp(platform, APP_FILTER_MODULE);

      expectFilterResponse(await getJson(app, '/api/does-not-exist?x=1'), 404, { message: 'Cannot GET /api/does-not-exist?x=1', error: 'Not Found' }, '/api/does-not-exist');
    });

    it('FR-2 replies to a broken JSON body with a 400', async (): Promise<void> => {
      app = await startApp(platform, APP_FILTER_MODULE);

      expectFilterResponse(
        await getJson(app, '/api/errors/not-found', { method: 'POST', headers: JSON_HEADERS, body: '{"name":' }),
        400,
        { message: expect.any(String), error: 'Bad Request' },
        '/api/errors/not-found',
      );
    });

    it('FR-2 replies to a body above the platform limit with a 413', async (): Promise<void> => {
      app = await startApp(platform, APP_FILTER_MODULE);

      expectFilterResponse(await postTooLargeBody(app, platform, '/api/errors/not-found'), 413, { message: expect.any(String), error: 'Payload Too Large' }, '/api/errors/not-found');
    });
  });

  describe('logs', (): void => {
    it('FR-5 logs a 5xx at error level in one line with the method, the path, the status and the message, with its stack as trace and the filter as context', async (): Promise<void> => {
      app = await startApp(platform, APP_FILTER_MODULE);
      const logs: unknown[][] = captureLogs(app);

      await getJson(app, '/api/errors/error?x=1');

      expect(filterLogs(logs)).toEqual([['error', 'GET /api/errors/error 500 - boom', BOOM_TRACE, LOGGER_CONTEXT]]);
    });

    it('FR-6 logs a 4xx at warn level in one line with the method, the path and the status, without message or trace, and the filter as context', async (): Promise<void> => {
      app = await startApp(platform, APP_FILTER_MODULE);
      const logs: unknown[][] = captureLogs(app);

      await getJson(app, '/api/errors/not-found?x=1');

      expect(filterLogs(logs)).toEqual([['warn', 'GET /api/errors/not-found 404', LOGGER_CONTEXT]]);
    });

    it('FR-7 with logClientErrors set to false does not log a 4xx, still logs a 5xx and replies the same', async (): Promise<void> => {
      app = await startApp(platform, NO_CLIENT_LOGS_MODULE);
      const logs: unknown[][] = captureLogs(app);

      expectFilterResponse(await getJson(app, '/api/errors/not-found'), 404, NOT_FOUND, '/api/errors/not-found');
      expectFilterResponse(await getJson(app, '/api/errors/error'), 500, GENERIC_500, '/api/errors/error');
      expect(filterLogs(logs)).toEqual([['error', 'GET /api/errors/error 500 - boom', BOOM_TRACE, LOGGER_CONTEXT]]);
    });

    it('FR-8 never logs the query string, the headers or the body of the request', async (): Promise<void> => {
      app = await startApp(platform, APP_FILTER_MODULE);
      const logs: unknown[][] = captureLogs(app);

      await getJson(app, '/api/errors/not-found?token=secret', { method: 'POST', headers: SECRET_HEADERS, body: SECRET_BODY });
      await getJson(app, '/api/errors/error?token=secret', { method: 'POST', headers: SECRET_HEADERS, body: SECRET_BODY });
      await getJson(app, '/api/errors/not-found?token=secret', { method: 'POST', headers: SECRET_HEADERS, body: BROKEN_SECRET_BODY });

      expect(filterLogs(logs)).toEqual([
        ['warn', 'POST /api/errors/not-found 404', LOGGER_CONTEXT],
        ['error', 'POST /api/errors/error 500 - boom', BOOM_TRACE, LOGGER_CONTEXT],
        ['warn', 'POST /api/errors/not-found 400', LOGGER_CONTEXT],
      ]);
      expect(JSON.stringify(logs)).not.toContain('secret');
    });
  });
});
