import { waitForPortOpen } from '@nx/node/utils';

declare global {
  var __TEARDOWN_MESSAGE__: string;
}

module.exports = async function (): Promise<void> {
  // Start services that the app needs to run (e.g. database, docker-compose, etc.).
  const host: string = process.env.HOST ?? 'localhost';
  const port: number = process.env.PORT ? Number(process.env.PORT) : 3000;
  console.log('\nSetting up...\n');

  await waitForPortOpen(port, { host });

  // Hint: Use `globalThis` to pass variables to global teardown.
  globalThis.__TEARDOWN_MESSAGE__ = '\nTearing down...\n';
};
