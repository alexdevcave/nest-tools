/**
 * Public entry point of `@brickstodev/nest-tools`.
 *
 * Everything consumers can use is exported from this file only:
 * - `AllExceptionsFilter`: an exception filter that gives every HTTP error the same response format and logs it by severity.
 * - `AllExceptionsFilterOptions`: the options of that filter (type only).
 */
export { AllExceptionsFilter } from './lib/all-exceptions-filter/all-exceptions.filter';
export type { AllExceptionsFilterOptions } from './lib/all-exceptions-filter/interfaces/all-exceptions-filter-options.interface';
