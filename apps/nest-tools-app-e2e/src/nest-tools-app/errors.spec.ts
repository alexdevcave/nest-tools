import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';

const ANY_STATUS: AxiosRequestConfig = { validateStatus: (): boolean => true };
// Format of Date.prototype.toISOString()
const ISO_TIMESTAMP: RegExp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

function errorBody(statusCode: number, message: unknown, error: string, path: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  return { statusCode, message, error, path, timestamp: expect.stringMatching(ISO_TIMESTAMP), ...extra };
}

describe('AllExceptionsFilter demo routes under /errors', (): void => {
  it('FR-2 not-found answers 404 with the exception message and the path without query', async (): Promise<void> => {
    const res: AxiosResponse<Record<string, unknown>> = await axios.get('/errors/user-not-found?expand=true', ANY_STATUS);

    expect(res.status).toBe(404);
    expect(res.data).toEqual(errorBody(404, 'User not found', 'Not Found', '/errors/user-not-found'));
  });

  it('FR-2 with-code keeps the extra code field next to the five fields', async (): Promise<void> => {
    const res: AxiosResponse<Record<string, unknown>> = await axios.get('/errors/user-with-code', ANY_STATUS);

    expect(res.status).toBe(404);
    expect(res.data).toEqual(errorBody(404, 'User not found', 'Not Found', '/errors/user-with-code', { code: 'USER_NOT_FOUND' }));
  });

  it('FR-2 edge case 2 no-message answers 409 with the status name as message and keeps code', async (): Promise<void> => {
    const res: AxiosResponse<Record<string, unknown>> = await axios.get('/errors/no-message', ANY_STATUS);

    expect(res.status).toBe(409);
    expect(res.data).toEqual(errorBody(409, 'Conflict', 'Conflict', '/errors/no-message', { code: 'ORDER_LOCKED' }));
  });

  it('FR-2 items/:id answers 400 with the Nest pipe message when the id is not numeric', async (): Promise<void> => {
    const res: AxiosResponse<Record<string, unknown>> = await axios.get('/errors/items/abc', ANY_STATUS);

    expect(res.status).toBe(400);
    expect(res.data).toEqual(errorBody(400, 'Validation failed (numeric string is expected)', 'Bad Request', '/errors/items/abc'));
  });

  it('FR-2 items/:id answers 200 with the parsed id when the id is numeric', async (): Promise<void> => {
    const res: AxiosResponse<{ id: number }> = await axios.get('/errors/items/42', ANY_STATUS);

    expect(res.status).toBe(200);
    expect(res.data).toEqual({ id: 42 });
  });

  it('FR-2 edge case 1 validation keeps the list of messages unchanged', async (): Promise<void> => {
    const res: AxiosResponse<Record<string, unknown>> = await axios.get('/errors/validate-user', ANY_STATUS);

    expect(res.status).toBe(400);
    expect(res.data).toEqual(errorBody(400, ['email must be an email', 'name should not be empty'], 'Bad Request', '/errors/validate-user'));
  });

  it('FR-2 custom-error uses the error text given by the developer', async (): Promise<void> => {
    const res: AxiosResponse<Record<string, unknown>> = await axios.get('/errors/custom-error', ANY_STATUS);

    expect(res.status).toBe(400);
    expect(res.data).toEqual(errorBody(400, 'Invalid coupon', 'Coupon Error', '/errors/custom-error'));
  });

  it('FR-2 edge case 3 unavailable answers 503 with the developer message', async (): Promise<void> => {
    const res: AxiosResponse<Record<string, unknown>> = await axios.get('/errors/unavailable', ANY_STATUS);

    expect(res.status).toBe(503);
    expect(res.data).toEqual(errorBody(503, 'Maintenance in progress', 'Service Unavailable', '/errors/unavailable'));
  });

  it('FR-3 FR-4 unexpected answers a generic 500 without the original message', async (): Promise<void> => {
    const res: AxiosResponse<Record<string, unknown>> = await axios.get('/errors/unexpected', ANY_STATUS);

    expect(res.status).toBe(500);
    expect(res.data).toEqual(errorBody(500, 'Internal server error', 'Internal Server Error', '/errors/unexpected'));
    expect(JSON.stringify(res.data)).not.toContain('Database connection lost');
  });

  it('FR-4 with-cause answers 500 with its message and without the cause', async (): Promise<void> => {
    const res: AxiosResponse<Record<string, unknown>> = await axios.get('/errors/with-cause', ANY_STATUS);

    expect(res.status).toBe(500);
    expect(res.data).toEqual(errorBody(500, 'Could not load orders', 'Internal Server Error', '/errors/with-cause'));
    expect(JSON.stringify(res.data)).not.toContain('ECONNREFUSED');
  });

  it('FR-3 edge case 4 thrown-string answers a generic 500 without the thrown text', async (): Promise<void> => {
    const res: AxiosResponse<Record<string, unknown>> = await axios.get('/errors/thrown-string', ANY_STATUS);

    expect(res.status).toBe(500);
    expect(res.data).toEqual(errorBody(500, 'Internal server error', 'Internal Server Error', '/errors/thrown-string'));
    expect(JSON.stringify(res.data)).not.toContain('Something went wrong');
  });

  it('edge case 5 partial-response keeps the partial body already sent and closes the response', async (): Promise<void> => {
    const res: AxiosResponse<string> = await axios.get('/errors/partial-response', { ...ANY_STATUS, responseType: 'text' });

    expect(res.status).toBe(200);
    expect(res.data).toBe('partial');
  });

  it('FR-2 echo answers 201 with the body when the JSON is valid', async (): Promise<void> => {
    const res: AxiosResponse<unknown> = await axios.post('/errors/echo', { name: 'Ada' }, ANY_STATUS);

    expect(res.status).toBe(201);
    expect(res.data).toEqual({ name: 'Ada' });
  });

  it('FR-2 echo answers 400 with the filter format when the JSON is broken', async (): Promise<void> => {
    const res: AxiosResponse<Record<string, unknown>> = await axios.post('/errors/echo', '{"name":', {
      ...ANY_STATUS,
      headers: { 'Content-Type': 'application/json' },
      transformRequest: [(data: string): string => data],
    });

    expect(res.status).toBe(400);
    // The parser message depends on the Node.js version
    expect(res.data).toEqual(errorBody(400, expect.any(String), 'Bad Request', '/errors/echo'));
  });

  it('FR-2 echo answers 413 with the filter format when the body is over 100 kB', async (): Promise<void> => {
    const res: AxiosResponse<Record<string, unknown>> = await axios.post('/errors/echo', { data: 'x'.repeat(110_000) }, ANY_STATUS);

    expect(res.status).toBe(413);
    expect(res.data).toEqual(errorBody(413, 'request entity too large', 'Payload Too Large', '/errors/echo'));
  });
});
