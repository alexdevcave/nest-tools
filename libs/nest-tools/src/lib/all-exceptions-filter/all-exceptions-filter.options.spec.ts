import { resolveAllExceptionsFilterOptions } from './all-exceptions-filter.options';
import type { AllExceptionsFilterOptions } from './interfaces/all-exceptions-filter-options.interface';

describe('spec 003 all exceptions filter options', (): void => {
  it('FR-7 logClientErrors defaults to true when no options are given', (): void => {
    expect(resolveAllExceptionsFilterOptions(undefined)).toEqual({ logClientErrors: true });
    expect(resolveAllExceptionsFilterOptions({})).toEqual({ logClientErrors: true });
  });

  it.each([true, false])('FR-7 keeps an explicit logClientErrors of %s', (logClientErrors: boolean): void => {
    expect(resolveAllExceptionsFilterOptions({ logClientErrors })).toEqual({ logClientErrors });
  });

  it('FR-7 throws a TypeError naming the value and its type when logClientErrors is not a boolean', (): void => {
    function resolve(): Required<AllExceptionsFilterOptions> {
      return resolveAllExceptionsFilterOptions({ logClientErrors: 'false' });
    }

    expect(resolve).toThrow(TypeError);
    expect(resolve).toThrow(/"logClientErrors" must be a boolean, received 'false' \(string\)/);
  });

  it('FR-7 throws a TypeError when logClientErrors is null instead of using the default', (): void => {
    expect((): Required<AllExceptionsFilterOptions> => resolveAllExceptionsFilterOptions({ logClientErrors: null })).toThrow(
      new TypeError('AllExceptionsFilter: "logClientErrors" must be a boolean, received null (null).'),
    );
  });

  it.each([
    [null, 'null'],
    ['logClientErrors', 'string'],
    [[], 'array'],
  ])('FR-7 throws a TypeError when the options are %p instead of an object', (options: unknown, type: string): void => {
    function resolve(): Required<AllExceptionsFilterOptions> {
      return resolveAllExceptionsFilterOptions(options);
    }

    expect(resolve).toThrow(TypeError);
    expect(resolve).toThrow(`(${type})`);
  });

  it('FR-7 ignores unknown keys', (): void => {
    expect(resolveAllExceptionsFilterOptions({ logClientErrors: false, unknown: 'x' })).toEqual({ logClientErrors: false });
  });
});
