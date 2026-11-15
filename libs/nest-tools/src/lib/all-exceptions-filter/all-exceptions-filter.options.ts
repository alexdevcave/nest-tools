import { inspect } from 'node:util';
import type { AllExceptionsFilterOptions } from './interfaces/all-exceptions-filter-options.interface';
import { getValueType } from './value-type';

function describeValue(value: unknown): string {
  return `${inspect(value)} (${getValueType(value)})`;
}

/**
 * Applies the defaults to the options given to the filter and validates them; unknown keys are ignored.
 * The options are `unknown` because they may come from JavaScript or an environment variable.
 *
 * @throws TypeError when the options are not an object or `logClientErrors` is not a boolean.
 */
export function resolveAllExceptionsFilterOptions(options: unknown): Required<AllExceptionsFilterOptions> {
  if (options === undefined) {
    return { logClientErrors: true };
  }

  if (typeof options !== 'object' || options === null || Array.isArray(options)) {
    throw new TypeError(`AllExceptionsFilter: options must be an object, received ${describeValue(options)}.`);
  }

  // Only `undefined` falls back to the default: `null` is a wrong value, not a missing one.
  const value: unknown = (options as { logClientErrors?: unknown }).logClientErrors;
  const logClientErrors: unknown = value === undefined ? true : value;

  if (typeof logClientErrors !== 'boolean') {
    throw new TypeError(`AllExceptionsFilter: "logClientErrors" must be a boolean, received ${describeValue(logClientErrors)}.`);
  }

  return { logClientErrors };
}
