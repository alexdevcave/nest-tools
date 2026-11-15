import { HttpException, InternalServerErrorException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { classifyException } from './exception-body';
import { buildExceptionLogEntry } from './exception-log';
import type { ExceptionLogEntry } from './interfaces/exception-log-entry.interface';

function entryOf(exception: unknown, method: string = 'GET', url: string = '/api/users/7', responseSent: boolean = false, logClientErrors: boolean = true): ExceptionLogEntry | null {
  return buildExceptionLogEntry(exception, classifyException(exception), method, url, responseSent, logClientErrors);
}

// The workspace `lib` (es2020) does not type `new Error(message, { cause })`; this sets the same `cause` property.
function errorWithCause(message: string, cause: unknown): Error {
  return Object.assign(new Error(message), { cause });
}

describe('spec 003 exception log', (): void => {
  it('FR-5 logs a 5xx at error level with the method, the path, the status code and the message', (): void => {
    expect(entryOf(new Error('connect ECONNREFUSED'), 'POST', '/api/orders')).toMatchObject({ level: 'error', line: 'POST /api/orders 500 - connect ECONNREFUSED' });
  });

  it('FR-6 logs a 4xx at warn level with the method, the path and the status code, without message or trace', (): void => {
    expect(entryOf(new NotFoundException('User 7 not found'))).toEqual({ level: 'warn', line: 'GET /api/users/7 404' });
  });

  it('FR-5 marks the line of a 5xx when the response was already sent', (): void => {
    expect(entryOf(new Error('boom'), 'GET', '/api/users/7', true)?.line).toBe('GET /api/users/7 500 - boom (response already sent)');
  });

  it('FR-6 marks the line of a 4xx when the response was already sent', (): void => {
    expect(entryOf(new NotFoundException(), 'GET', '/api/users/7', true)?.line).toBe('GET /api/users/7 404 (response already sent)');
  });

  it.each([
    ['an Error', new Error('Database is down'), 'Database is down'],
    ['a thrown string', 'Database is down', 'Database is down'],
    ['an object, only its type', { password: 'secret' }, 'Non-Error value of type object'],
    ['null', null, 'Non-Error value of type null'],
    ['an array', ['secret'], 'Non-Error value of type array'],
    ['a number', 42, 'Non-Error value of type number'],
  ])('FR-5 logs the original message of an unknown error: %s', (_case: string, exception: unknown, message: string): void => {
    expect(entryOf(exception)?.line).toBe(`GET /api/users/7 500 - ${message}`);
  });

  it('FR-5 logs the message the developer chose for a 5xx HttpException', (): void => {
    expect(entryOf(new ServiceUnavailableException('Maintenance in progress'))?.line).toBe('GET /api/users/7 503 - Maintenance in progress');
  });

  it('FR-5 replaces the line breaks of the message with a space', (): void => {
    expect(entryOf(new Error('first\nsecond\r\nthird\rfourth'))?.line).toBe('GET /api/users/7 500 - first second third fourth');
  });

  it('FR-5 joins the list of messages of a 5xx HttpException', (): void => {
    expect(entryOf(new InternalServerErrorException(['a', 'b']))?.line).toBe('GET /api/users/7 500 - a, b');
  });

  it('FR-5 traces the stack of an Error and of each chained cause', (): void => {
    const cause: Error = new Error('b');
    const exception: Error = errorWithCause('a', cause);

    expect(entryOf(exception)?.trace).toBe(`${exception.stack}\nCaused by: ${cause.stack}`);
  });

  it('FR-5 traces the cause of an HttpException created with { cause }', (): void => {
    const cause: Error = new Error('connect ECONNREFUSED');
    const exception: HttpException = new InternalServerErrorException('Payment failed', { cause });

    expect(entryOf(exception)?.trace).toBe(`${exception.stack}\nCaused by: ${cause.stack}`);
  });

  it('FR-5 traces a string cause as its text and any other cause only by its type', (): void => {
    const withText: Error = errorWithCause('a', 'timeout');
    const withObject: Error = errorWithCause('a', { password: 'secret' });

    expect(entryOf(withText)?.trace).toBe(`${withText.stack}\nCaused by: timeout`);
    expect(entryOf(withObject)?.trace).toBe(`${withObject.stack}\nCaused by: Non-Error value of type object`);
  });

  it('FR-5 traces a circular chain of causes without repeating any', (): void => {
    const first: Error = new Error('a');
    const second: Error = errorWithCause('b', first);

    Object.assign(first, { cause: second });

    expect(entryOf(first)?.trace).toBe(`${first.stack}\nCaused by: ${second.stack}`);
  });

  it.each([
    ['a thrown string', 'boom'],
    ['an object', { cause: new Error('hidden') }],
  ])('FR-5 has no trace for a value that is not an Error: %s', (_case: string, exception: unknown): void => {
    expect(entryOf(exception)?.trace).toBeUndefined();
  });

  it('FR-7 does not log a 4xx when client errors are not logged', (): void => {
    expect(entryOf(new NotFoundException(), 'GET', '/api/users/7', false, false)).toBeNull();
  });

  it('FR-7 still logs a 5xx when client errors are not logged', (): void => {
    expect(entryOf(new Error('boom'), 'GET', '/api/users/7', false, false)).toMatchObject({ level: 'error', line: 'GET /api/users/7 500 - boom' });
  });

  it.each([
    ['a 4xx', new NotFoundException(), 'GET /api/users 404'],
    ['a 5xx', new Error('boom'), 'GET /api/users 500 - boom'],
  ])('FR-8 never logs the query string of %s', (_case: string, exception: unknown, line: string): void => {
    expect(entryOf(exception, 'GET', '/api/users?token=secret')?.line).toBe(line);
  });
});
