# @gitleaf/format

Canonical Markdown/frontmatter format: the one way Gitleaf reads and writes doc files.

## Guarantees

- **Round-trip is byte for byte.** `serialize(parse(text)) === text` for every input, including no frontmatter, CRLF line endings, a byte order mark, comments and blank lines inside the frontmatter, invalid YAML, an empty body, and a file with no final newline. `parse` keeps the raw frontmatter text and never re-serializes it.
- **Bodies are never modified.** The body is every byte after the closing `---` line.
- **An update touches only what changed.** `update(doc, patch)` rewrites the bytes of the changed value, inserts one line for a new key at its canonical position, or removes the key's line(s). Comments, blank lines, quoting and the style of untouched keys stay as they were.
- **YAML gotchas are quoted on write:** `yes`, `no`, `on`, `off`, `y`, `n`, `true`, `false`, `null`, `~`, numbers, version-like strings (`1.0`, `2.3.4`), leading zeros, the empty string and strings with surrounding spaces.

## Line endings

| Case | Behavior |
|---|---|
| Read and round-trip (`parse`, `serialize`) | The file's own line ending (LF or CRLF) is detected from the first line break and reproduced byte for byte. Nothing is normalized. |
| Write (`update`) | The frontmatter block is written with LF, including lines that were CRLF before. The body is copied as is, so a CRLF body keeps its bytes. A missing final newline after the closing delimiter is kept. |
| New document (`createDoc`) | LF, a trailing newline after the closing delimiter, block-style YAML, canonical key order. |
| Mixed line endings | The first line break decides where the delimiters are. Delimiters are recognized with that line ending only. |

`gitleaf validate` reports CRLF bodies; converting a body is a deliberate, separate edit.

## Collections

- New documents use block style for sequences and mappings.
- `update` keeps block style where a key already uses it. A collection written for a new key, or replacing a scalar, is written in flow style on one line (`labels: [a, b]`) so the change stays a one-line diff.
- Multi-line strings become block scalars and span several lines.

## Frontmatter detection

Frontmatter exists only when the text (after an optional BOM) begins with a line that is exactly `---` and a later line is exactly `---`. A `---` inside the body is a horizontal rule. An unterminated block is a body. Invalid YAML keeps its bytes; `meta.frontmatterError` says why, and `update` refuses to touch it.
