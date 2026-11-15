import axios, { AxiosResponse } from 'axios';

describe('GET /api', (): void => {
  it('should return a message', async (): Promise<void> => {
    const res: AxiosResponse<{ message: string }> = await axios.get(`/api`);

    expect(res.status).toBe(200);
    expect(res.data).toEqual({ message: 'Hello API' });
  });
});

describe('AllExceptionsFilter registered with APP_FILTER (FR-1)', (): void => {
  it('FR-2 answers an unknown route with the filter format', async (): Promise<void> => {
    const res: AxiosResponse<{ statusCode: number; message: string; error: string; path: string; timestamp: string }> = await axios.get('/api/does-not-exist?x=1', {
      validateStatus: (): boolean => true,
    });
    const timestamp: string = res.data.timestamp;

    expect(res.status).toBe(404);
    expect(res.data).toEqual({ statusCode: 404, message: 'Cannot GET /api/does-not-exist?x=1', error: 'Not Found', path: '/api/does-not-exist', timestamp: expect.any(String) });
    expect(new Date(timestamp).toISOString()).toBe(timestamp);
  });
});
