import type { ConventionalCommit } from './interfaces/conventional-commit.interface';

/** `type(scope)!: description`; Conventional Commits 1.0 does not distinguish the case of the type. */
const HEADER_PATTERN: RegExp = /^([a-z]+)(?:\([^()]+\))?(!)?: (.+)$/i;

/** Only in upper case, as Conventional Commits requires; `BREAKING-CHANGE` is its synonym. */
const BREAKING_FOOTER_PATTERN: RegExp = /^BREAKING[ -]CHANGE:\s*(.*)$/;

/** Any other footer (`Co-Authored-By: …`, `Claude-Session: …`, `Refs #12`) ends the text of a breaking change footer. */
const FOOTER_PATTERN: RegExp = /^[\w-]+(?:: | #)/;

/** Separators of `git log --format=%H%x1f%B%x1e`. */
const RECORD_SEPARATOR: string = '\x1e';
const FIELD_SEPARATOR: string = '\x1f';

/** The text of the breaking change footers, up to the next footer; `null` when there is none. */
function readBreakingNote(bodyLines: string[]): string | null {
  const noteLines: string[] = [];
  let inNote: boolean = false;

  for (const line of bodyLines) {
    const footer: RegExpExecArray | null = BREAKING_FOOTER_PATTERN.exec(line);

    if (footer !== null) {
      inNote = true;
      noteLines.push(footer[1]);
    } else if (FOOTER_PATTERN.test(line)) {
      inNote = false;
    } else if (inNote) {
      noteLines.push(line);
    }
  }

  return noteLines.length > 0 ? noteLines.join('\n').trim() : null;
}

function parseCommitMessage(message: string): ConventionalCommit | null {
  const lines: string[] = message.split(/\r?\n/);
  const header: RegExpExecArray | null = HEADER_PATTERN.exec(lines[0].trim());

  if (header === null) {
    return null;
  }

  const note: string | null = readBreakingNote(lines.slice(1));

  return { type: header[1].toLowerCase(), description: header[3].trim(), breaking: header[2] === '!' || note !== null, breakingNote: note === '' ? null : note };
}

/**
 * Parses the output of `git log --format=%H%x1f%B%x1e` into its Conventional Commits, in the same order; any other message is left out.
 */
export function parseGitLog(output: string): ConventionalCommit[] {
  return output
    .split(RECORD_SEPARATOR)
    .map((record: string): ConventionalCommit | null => parseCommitMessage(record.split(FIELD_SEPARATOR)[1] ?? ''))
    .filter((commit: ConventionalCommit | null): commit is ConventionalCommit => commit !== null);
}
