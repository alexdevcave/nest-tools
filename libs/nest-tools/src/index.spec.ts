// Every name the public entry point exports; each spec that adds a tool adds its exports here.
const PUBLIC_API_EXPORTS: string[] = ['AllExceptionsFilter'];

async function loadEntryPoint(): Promise<Record<string, unknown>> {
  let entry: Record<string, unknown> = {};
  await jest.isolateModulesAsync(async (): Promise<void> => {
    entry = await import('./index');
  });
  return entry;
}

describe('spec 001 publishable package', (): void => {
  afterEach((): void => {
    jest.restoreAllMocks();
  });

  it('FR-5 public entry point exports only the listed public API', async (): Promise<void> => {
    const entry: Record<string, unknown> = await loadEntryPoint();

    expect(Object.keys(entry).sort()).toEqual([...PUBLIC_API_EXPORTS].sort());
  });

  it('NFR-1 importing has no side effects of its own', async (): Promise<void> => {
    // Load once first so the transform cache is warm and only the module's own code runs below.
    await loadEntryPoint();

    await jest.isolateModulesAsync(async (): Promise<void> => {
      // What peer dependencies do on load does not count (`@nestjs/common` reads `process.env.NO_COLOR`).
      await import('@nestjs/common');
      await import('@nestjs/core');

      const timers: jest.SpyInstance[] = [jest.spyOn(global, 'setTimeout'), jest.spyOn(global, 'setInterval'), jest.spyOn(global, 'setImmediate')];
      const logs: jest.SpyInstance[] = [
        ...(['log', 'info', 'warn', 'error', 'debug'] as const).map(
          (method: 'log' | 'info' | 'warn' | 'error' | 'debug'): jest.SpyInstance => jest.spyOn(console, method).mockImplementation((): void => undefined),
        ),
        jest.spyOn(process.stdout, 'write').mockImplementation((): boolean => true),
        jest.spyOn(process.stderr, 'write').mockImplementation((): boolean => true),
      ];
      // Each read is recorded with its trap: `get` (process.env.X), `has` ('X' in process.env) and `ownKeys` (Object.keys(process.env)).
      const envReads: string[] = [];
      const originalEnv: NodeJS.ProcessEnv = process.env;
      process.env = new Proxy(originalEnv, {
        get(target: NodeJS.ProcessEnv, key: string | symbol, receiver: unknown): unknown {
          envReads.push(`get ${String(key)}`);
          return Reflect.get(target, key, receiver);
        },
        has(target: NodeJS.ProcessEnv, key: string | symbol): boolean {
          envReads.push(`has ${String(key)}`);
          return Reflect.has(target, key);
        },
        ownKeys(target: NodeJS.ProcessEnv): (string | symbol)[] {
          envReads.push('ownKeys');
          return Reflect.ownKeys(target);
        },
      });

      try {
        await import('./index');
      } finally {
        process.env = originalEnv;
      }

      [...timers, ...logs].forEach((spy: jest.SpyInstance): void => expect(spy).not.toHaveBeenCalled());
      expect(envReads).toEqual([]);
    });
  });
});

describe('spec 003 all exceptions filter', (): void => {
  it('FR-1 exports AllExceptionsFilter from the public entry point', async (): Promise<void> => {
    // `isolateModulesAsync` loads another copy of the module, so the class is checked by shape, not by identity.
    const entry: Record<string, unknown> = await loadEntryPoint();
    const filter: unknown = entry['AllExceptionsFilter'];

    expect(filter).toEqual(expect.any(Function));
    expect((filter as { name: string }).name).toBe('AllExceptionsFilter');
    expect((filter as { prototype: { catch: unknown } }).prototype.catch).toEqual(expect.any(Function));
  });
});
