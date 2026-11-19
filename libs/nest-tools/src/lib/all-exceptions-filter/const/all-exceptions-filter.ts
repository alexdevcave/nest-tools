export const RESPONSE_SENT_SUFFIX: string = ' (response already sent)';

// Fixed text, not `AllExceptionsFilter.name`: the context is public API and a minifier could rename the class.
export const LOGGER_CONTEXT: string = 'AllExceptionsFilter';

/** Fields of the response body that only the filter sets: a custom body never overrides them. */
export const RESERVED_FIELDS: ReadonlySet<string> = new Set<string>(['statusCode', 'message', 'error', 'path', 'timestamp']);

/** Fields of a custom body that are never copied: a response never shows a stack or a cause (FR-4). */
export const HIDDEN_FIELDS: ReadonlySet<string> = new Set<string>(['stack', 'cause']);

/** Line breaks of a message: replaced with a space so a message cannot fake extra log lines (log injection). */
export const LINE_BREAKS: RegExp = /\r\n|\n|\r/g;
