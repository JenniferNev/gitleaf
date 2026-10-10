export type LineEnding = '\n' | '\r\n';

/** Facts about the original bytes that `serialize` needs to reproduce them exactly. */
export interface DocMeta {
  /** A UTF-8 byte order mark preceded the text. It is written back. */
  readonly bom: boolean;
  /** Line ending detected from the first line break, `\n` when there is none. */
  readonly eol: LineEnding;
  /** The text started with an opening `---` line and had a closing `---` line. */
  readonly hasFrontmatter: boolean;
  /** Exact text between the opening and closing delimiter lines, including its final line break. */
  readonly frontmatterText: string;
  /** Line break that followed the closing delimiter: empty when the file ended right after `---`. */
  readonly closeEol: LineEnding | '';
  /** YAML parse error, when the frontmatter text was not valid YAML or not a mapping. */
  readonly frontmatterError?: string;
}

export interface ParsedDoc {
  /**
   * Parsed frontmatter values. `undefined` when there is no frontmatter or it
   * could not be parsed (see `meta.frontmatterError`). An empty block is `{}`.
   */
  readonly frontmatter: Readonly<Record<string, unknown>> | undefined;
  /** Everything after the closing delimiter line, byte for byte. The whole text when there is no frontmatter. */
  readonly body: string;
  readonly meta: DocMeta;
}

/** Values a frontmatter key may hold when written by Gitleaf. */
export type FrontmatterValue =
  | string
  | number
  | boolean
  | null
  | readonly FrontmatterValue[]
  | { readonly [key: string]: FrontmatterValue };

/** `undefined` removes the key. */
export type FrontmatterPatch = Readonly<Record<string, FrontmatterValue | undefined>>;
