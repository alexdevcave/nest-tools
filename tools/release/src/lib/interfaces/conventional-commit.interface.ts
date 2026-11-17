/**
 * A commit message that follows Conventional Commits 1.0: `type(scope)!: description`, with optional body and footers.
 */
export interface ConventionalCommit {
  /** The type of the header, in lower case (`feat`, `fix`…). */
  type: string;
  /** The description of the header, without type or scope. */
  description: string;
  /** Whether it is a breaking change: `!` after the type or scope, or a `BREAKING CHANGE:` / `BREAKING-CHANGE:` footer. */
  breaking: boolean;
  /** The text of the breaking change footer, up to the next footer; `null` without that footer or when it has no text. */
  breakingNote: string | null;
}
