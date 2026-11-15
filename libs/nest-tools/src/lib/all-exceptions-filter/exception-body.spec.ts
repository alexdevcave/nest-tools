import { BadRequestException, HttpException, InternalServerErrorException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { buildExceptionBody, classifyException, getStatusName, stripQueryString } from './exception-body';
import type { ClassifiedException } from './interfaces/classified-exception.interface';
import type { ExceptionResponseBody } from './interfaces/exception-response-body.interface';

const PATH: string = '/api/users';
const DATE: Date = new Date(Date.UTC(2026, 10, 15, 10, 30));
const TIMESTAMP: string = '2026-11-15T10:30:00.000Z';
const UNKNOWN_BODY: ExceptionResponseBody = { statusCode: 500, message: 'Internal server error', error: 'Internal Server Error', path: PATH, timestamp: TIMESTAMP };

function bodyOf(exception: unknown): ExceptionResponseBody {
  return buildExceptionBody(classifyException(exception), PATH, DATE);
}

// Like the errors of `http-errors` (used by Express to read the body): `statusCode` and `expose` on a plain `Error`.
function externalError(message: string, fields: Record<string, unknown>): Error {
  return Object.assign(new Error(message), fields);
}

describe('spec 003 exception body', (): void => {
  it('FR-2 uses a string body as the message and the status name as the error', (): void => {
    expect(bodyOf(new HttpException('Access denied', 403))).toEqual({ statusCode: 403, message: 'Access denied', error: 'Forbidden', path: PATH, timestamp: TIMESTAMP });
  });

  it('FR-2 keeps a list of messages unchanged', (): void => {
    expect(bodyOf(new BadRequestException(['a', 'b']))).toEqual({ statusCode: 400, message: ['a', 'b'], error: 'Bad Request', path: PATH, timestamp: TIMESTAMP });
  });

  it('FR-2 uses the error text given by the developer', (): void => {
    expect(bodyOf(new BadRequestException('Invalid coupon', { description: 'Coupon Error' }))).toEqual({
      statusCode: 400,
      message: 'Invalid coupon',
      error: 'Coupon Error',
      path: PATH,
      timestamp: TIMESTAMP,
    });
  });

  it('FR-2 keeps the extra fields of an object body', (): void => {
    expect(bodyOf(new NotFoundException({ message: 'User not found', code: 'USER_NOT_FOUND' }))).toEqual({
      statusCode: 404,
      message: 'User not found',
      error: 'Not Found',
      path: PATH,
      timestamp: TIMESTAMP,
      code: 'USER_NOT_FOUND',
    });
  });

  it('FR-2 never lets the body override the five fields', (): void => {
    expect(bodyOf(new HttpException({ foo: 'bar', statusCode: 418, path: '/x', timestamp: 'yesterday', message: 42, error: null }, 400))).toEqual({
      statusCode: 400,
      message: 'Bad Request',
      error: 'Bad Request',
      path: PATH,
      timestamp: TIMESTAMP,
      foo: 'bar',
    });
  });

  it.each([
    ['an object body without message', { code: 'X' }],
    ['a numeric message', { message: 42 }],
    ['an object message', { message: { text: 'x' } }],
    ['a null message', { message: null }],
    ['an array body', ['a', 'b']],
    ['a null body', null],
  ])('FR-2 uses the status name as the message for %s', (_case: string, response: unknown): void => {
    const body: ExceptionResponseBody = bodyOf(new HttpException(response as object, 409));

    expect(body.message).toBe('Conflict');
    expect(body.error).toBe('Conflict');
  });

  it('FR-2 answers a 5xx HttpException with the text the developer chose', (): void => {
    expect(bodyOf(new ServiceUnavailableException('Maintenance in progress'))).toEqual({
      statusCode: 503,
      message: 'Maintenance in progress',
      error: 'Service Unavailable',
      path: PATH,
      timestamp: TIMESTAMP,
    });
  });

  it('FR-2 answers an exposed external HTTP error with its message and no extra fields', (): void => {
    const error: Error = externalError('request entity too large', { statusCode: 413, expose: true, limit: 100, body: '{"password":"secret"}' });

    expect(bodyOf(error)).toEqual({ statusCode: 413, message: 'request entity too large', error: 'Payload Too Large', path: PATH, timestamp: TIMESTAMP });
  });

  it.each([
    [400, 'Bad Request'],
    [503, 'Service Unavailable'],
  ])('FR-2 answers a not exposed external HTTP error %i with the status name', (statusCode: number, name: string): void => {
    expect(bodyOf(externalError('connection refused', { statusCode, expose: false }))).toEqual({ statusCode, message: name, error: name, path: PATH, timestamp: TIMESTAMP });
  });

  it('FR-2 reads statusCode and expose from the prototype, as the http-errors classes define them', (): void => {
    class PayloadTooLargeError extends Error {}
    Object.assign(PayloadTooLargeError.prototype, { statusCode: 413, expose: true });

    expect(bodyOf(new PayloadTooLargeError('request entity too large'))).toEqual({
      statusCode: 413,
      message: 'request entity too large',
      error: 'Payload Too Large',
      path: PATH,
      timestamp: TIMESTAMP,
    });
  });

  it.each<[string, unknown, ClassifiedException['kind']]>([
    ['an HttpException', new NotFoundException(), 'http'],
    ['an external HTTP error', externalError('request entity too large', { statusCode: 413, expose: true }), 'external'],
    ['an Error', new Error('boom'), 'unknown'],
    ['an HttpException with a 3xx status', new HttpException('Moved', 302), 'unknown'],
  ])('FR-2 FR-3 classifies %s by its kind', (_case: string, exception: unknown, kind: ClassifiedException['kind']): void => {
    expect(classifyException(exception).kind).toBe(kind);
  });

  it.each([
    ['an Error', new Error('boom')],
    ['a string', 'boom'],
    ['an object', { statusCode: 404, expose: true, message: 'Not here' }],
    ['undefined', undefined],
    ['null', null],
    ['a number', 42],
    ['an HttpException with status 302', new HttpException('Moved', 302)],
    ['an HttpException with status 200', new HttpException('OK', 200)],
    ['an HttpException with status 600', new HttpException('Odd', 600)],
    ['an Error with statusCode but no expose', externalError('Not here', { statusCode: 404 })],
    ['an Error with a non-boolean expose', externalError('Not here', { statusCode: 404, expose: 'true' })],
    ['an Error with a 3xx statusCode', externalError('Moved', { statusCode: 302, expose: true })],
    ['an Error with a non-integer statusCode', externalError('Not here', { statusCode: 404.5, expose: true })],
    ['an Error with a string statusCode', externalError('Not here', { statusCode: '404', expose: true })],
  ])('FR-3 answers %s with a generic 500', (_case: string, exception: unknown): void => {
    expect(bodyOf(exception)).toEqual(UNKNOWN_BODY);
  });

  it.each([
    ['an HttpException with a cause', new HttpException('Failed', 500, { cause: new Error('connection refused') })],
    ['a BadRequestException with a cause', new BadRequestException('Invalid', { cause: new Error('connection refused'), description: 'Invalid Input' })],
    ['an external HTTP error with a cause', externalError('request entity too large', { statusCode: 413, expose: true, cause: new Error('connection refused') })],
    ['an Error with a cause', externalError('boom', { cause: new Error('connection refused') })],
  ])('FR-4 never includes the stack or the cause of %s', (_case: string, exception: unknown): void => {
    const body: ExceptionResponseBody = bodyOf(exception);

    expect(body).not.toHaveProperty('stack');
    expect(body).not.toHaveProperty('cause');
    expect(JSON.stringify(body)).not.toContain('connection refused');
    expect(JSON.stringify(body)).not.toContain('    at ');
  });

  it('FR-4 never copies stack or cause fields of a custom body', (): void => {
    const body: ExceptionResponseBody = bodyOf(new InternalServerErrorException({ message: 'x', stack: 'Error: x\n    at …', cause: 'db', code: 'E1' }));

    expect(body).not.toHaveProperty('stack');
    expect(body).not.toHaveProperty('cause');
    expect(body).toHaveProperty('code', 'E1');
  });

  it('FR-4 an unknown error has exactly the five fields and never its original message', (): void => {
    const body: ExceptionResponseBody = bodyOf(externalError('password=hunter2', { statusCode: 500, details: 'internal' }));

    expect(Object.keys(body)).toEqual(['statusCode', 'message', 'error', 'path', 'timestamp']);
    expect(JSON.stringify(body)).not.toContain('hunter2');
  });

  it.each([
    [404, 'Not Found'],
    [413, 'Payload Too Large'],
    [499, 'Client Error'],
    [520, 'Server Error'],
  ])('FR-2 names status %i as %s', (statusCode: number, name: string): void => {
    expect(getStatusName(statusCode)).toBe(name);
  });

  it.each([
    ['/api/users?token=x', '/api/users'],
    ['/api/users?a=1?b=2', '/api/users'],
    ['/api/users', '/api/users'],
  ])('FR-2 removes the query string from %s', (url: string, path: string): void => {
    expect(stripQueryString(url)).toBe(path);
  });

  it('FR-2 formats the timestamp as ISO 8601 in UTC with milliseconds', (): void => {
    expect(buildExceptionBody(classifyException(new NotFoundException()), PATH, new Date(Date.UTC(2026, 0, 2, 3, 4, 5, 6))).timestamp).toBe('2026-01-02T03:04:05.006Z');
  });
});
