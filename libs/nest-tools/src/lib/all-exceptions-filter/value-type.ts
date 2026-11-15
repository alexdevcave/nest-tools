/**
 * The type of a value for an error or log message: `null`, `array` or its `typeof`.
 */
export function getValueType(value: unknown): string {
  return value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value;
}
