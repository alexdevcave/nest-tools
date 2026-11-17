// Entry point of the release CLI: `release [--dry-run]` and `publish`, run from the repository root by the root scripts.
import { nodeDeps } from './lib/node-deps';
import { publish } from './lib/publish';
import { errorMessage, release } from './lib/release';

function main(args: string[]): void {
  const command: string = args.join(' ');

  switch (command) {
    case 'release':
      release(nodeDeps, false);
      break;
    case 'release --dry-run':
      release(nodeDeps, true);
      break;
    case 'publish':
      publish(nodeDeps);
      break;
    default:
      throw new Error(`Unknown arguments: "${command}"\nUsage: main.js release [--dry-run] | publish (pnpm run release:dry-run, pnpm run release or pnpm run release:publish)`);
  }
}

try {
  main(process.argv.slice(2));
} catch (error: unknown) {
  console.error(errorMessage(error));
  process.exitCode = 1;
}
