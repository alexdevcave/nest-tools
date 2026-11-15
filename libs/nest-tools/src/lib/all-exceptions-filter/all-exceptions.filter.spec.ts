import { Logger, NotFoundException } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import type { AbstractHttpAdapter, HttpAdapterHost } from '@nestjs/core';
import { AllExceptionsFilter } from './all-exceptions.filter';
import type { AllExceptionsFilterOptions } from './interfaces/all-exceptions-filter-options.interface';

// The query string, the headers and the body carry `secret`: no log may contain it (FR-8).
const REQUEST: { method: string; originalUrl: string; query: Record<string, string>; headers: Record<string, string>; body: Record<string, string> } = {
  method: 'GET',
  originalUrl: '/api/x?token=secret',
  query: { token: 'secret' },
  headers: { authorization: 'Bearer secret', cookie: 'session=secret' },
  body: { password: 'secret' },
};
const RESPONSE: { id: string } = { id: 'response' };
const ISO_TIMESTAMP: RegExp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function createHost(type: string): ArgumentsHost {
  return { getType: (): string => type, switchToHttp: (): unknown => ({ getRequest: (): unknown => REQUEST, getResponse: (): unknown => RESPONSE }) } as unknown as ArgumentsHost;
}

describe('spec 003 all exceptions filter', (): void => {
  let adapter: jest.Mocked<Pick<AbstractHttpAdapter, 'getRequestUrl' | 'getRequestMethod' | 'isHeadersSent' | 'reply' | 'end'>>;
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;

  function createFilter(options?: AllExceptionsFilterOptions): AllExceptionsFilter {
    return new AllExceptionsFilter({ httpAdapter: adapter } as unknown as HttpAdapterHost, options);
  }

  beforeEach((): void => {
    adapter = {
      getRequestUrl: jest.fn((request: typeof REQUEST): string => request.originalUrl),
      getRequestMethod: jest.fn((request: typeof REQUEST): string => request.method),
      isHeadersSent: jest.fn<boolean, [unknown]>().mockReturnValue(false),
      reply: jest.fn<void, [unknown, unknown, number?]>(),
      end: jest.fn<void, [unknown, string?]>(),
    };
    errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation((): void => undefined);
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation((): void => undefined);
  });

  afterEach((): void => {
    jest.restoreAllMocks();
  });

  it.each(['rpc', 'ws', 'graphql'])('FR-9 returns the exception unchanged and neither replies nor logs outside HTTP: %s', (type: string): void => {
    const exception: Error = new Error('boom');

    expect(createFilter().catch(exception, createHost(type))).toBe(exception);
    expect(adapter.reply).not.toHaveBeenCalled();
    expect(adapter.end).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('FR-6 ends a response that was already sent instead of replying, and says so in the log', (): void => {
    adapter.isHeadersSent.mockReturnValue(true);

    createFilter().catch(new NotFoundException(), createHost('http'));

    expect(adapter.end).toHaveBeenCalledWith(RESPONSE);
    expect(adapter.reply).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledWith('GET /api/x 404 (response already sent)');
  });

  it('FR-5 replies with the generic 500 body and then logs an error with its trace and the filter as context', (): void => {
    const exception: Error = new Error('boom');

    expect(createFilter().catch(exception, createHost('http'))).toBeUndefined();

    expect(adapter.reply).toHaveBeenCalledWith(
      RESPONSE,
      { statusCode: 500, message: 'Internal server error', error: 'Internal Server Error', path: '/api/x', timestamp: expect.stringMatching(ISO_TIMESTAMP) },
      500,
    );
    expect(adapter.end).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith('GET /api/x 500 - boom', exception.stack);
    expect(errorSpy.mock.contexts[0]).toMatchObject({ context: 'AllExceptionsFilter' });
    expect(adapter.reply.mock.invocationCallOrder[0]).toBeLessThan(errorSpy.mock.invocationCallOrder[0]);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('FR-5 replies before building the log entry, so a failure while logging cannot leave the client without its response', (): void => {
    const exception: Error = new Error('boom');

    Object.defineProperty(exception, 'stack', {
      get: (): never => {
        throw new Error('stack unavailable');
      },
    });

    expect((): unknown => createFilter().catch(exception, createHost('http'))).toThrow('stack unavailable');
    expect(adapter.reply).toHaveBeenCalledWith(RESPONSE, expect.objectContaining({ statusCode: 500 }), 500);
  });

  it('FR-5 logs an error without a trace when the thrown value has no stack', (): void => {
    createFilter().catch('boom', createHost('http'));

    expect(errorSpy.mock.calls).toStrictEqual([['GET /api/x 500 - boom']]);
  });

  it('FR-6 replies with 404 and logs a warning with the method, the path and the status code', (): void => {
    createFilter().catch(new NotFoundException(), createHost('http'));

    expect(adapter.reply).toHaveBeenCalledWith(RESPONSE, expect.objectContaining({ statusCode: 404, message: 'Not Found', error: 'Not Found', path: '/api/x' }), 404);
    expect(warnSpy).toHaveBeenCalledWith('GET /api/x 404');
    expect(warnSpy.mock.contexts[0]).toMatchObject({ context: 'AllExceptionsFilter' });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('FR-7 does not log a 4xx but still replies to it and logs a 5xx when client errors are not logged', (): void => {
    const filter: AllExceptionsFilter = createFilter({ logClientErrors: false });

    filter.catch(new NotFoundException(), createHost('http'));

    expect(adapter.reply).toHaveBeenCalledWith(RESPONSE, expect.objectContaining({ statusCode: 404 }), 404);
    expect(warnSpy).not.toHaveBeenCalled();

    filter.catch(new Error('boom'), createHost('http'));

    expect(errorSpy).toHaveBeenCalledWith('GET /api/x 500 - boom', expect.any(String));
  });

  it('FR-7 fails to create the filter when logClientErrors is not a boolean', (): void => {
    expect((): AllExceptionsFilter => createFilter({ logClientErrors: 'false' } as unknown as AllExceptionsFilterOptions)).toThrow(TypeError);
  });

  it('FR-8 never logs the query string, the headers or the body of the request', (): void => {
    const filter: AllExceptionsFilter = createFilter();

    filter.catch(new NotFoundException(), createHost('http'));
    filter.catch(new Error('boom'), createHost('http'));

    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    expect(JSON.stringify([...warnSpy.mock.calls, ...errorSpy.mock.calls])).not.toContain('secret');
  });
});
