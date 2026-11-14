const loadEntryPoint = async (): Promise<Record<string, unknown>> => {
  let entry: Record<string, unknown> = {};
  await jest.isolateModulesAsync(async () => {
    entry = await import('./index');
  });
  return entry;
};

describe('public entry point', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('FR-5 public entry point exports nothing', async () => {
    const entry = await loadEntryPoint();

    expect(Object.keys(entry)).toEqual([]);
  });

  it('NFR-1 importing has no side effects', async () => {
    // Load once first so the transform cache is warm and only the module's own code runs below.
    await loadEntryPoint();

    const timers = [jest.spyOn(global, 'setTimeout'), jest.spyOn(global, 'setInterval'), jest.spyOn(global, 'setImmediate')];
    const logs = [
      ...(['log', 'info', 'warn', 'error', 'debug'] as const).map((method) => jest.spyOn(console, method).mockImplementation(() => undefined)),
      jest.spyOn(process.stdout, 'write').mockImplementation(() => true),
      jest.spyOn(process.stderr, 'write').mockImplementation(() => true),
    ];
    const envReads: PropertyKey[] = [];
    const originalEnv = process.env;
    process.env = new Proxy(originalEnv, {
      get(target, key, receiver) {
        envReads.push(key);
        return Reflect.get(target, key, receiver);
      },
    });

    try {
      await loadEntryPoint();
    } finally {
      process.env = originalEnv;
    }

    [...timers, ...logs].forEach((spy) => expect(spy).not.toHaveBeenCalled());
    expect(envReads).toEqual([]);
  });
});
