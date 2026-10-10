/**
 * The `gitleaf` command line. Argument parsing only; every rule lives in core and the libraries.
 *
 * `validate` is a stub until ST-PV13MRCY lands: it accepts the final flags and checks nothing.
 */
import { parseArgs } from 'node:util';

export interface Io {
  out: { write(chunk: string): unknown };
  err: { write(chunk: string): unknown };
}

export const VERSION = '0.0.0';

const USAGE = `Usage: gitleaf <command> [options]

Commands:
  validate [paths...]   Validate docs: frontmatter, links, owners, secret refs (lands in ST-PV13MRCY)

Options:
  --json                Machine-readable output
  --strict              Treat warnings as errors
  -h, --help            Show this help
  -v, --version         Show the version
`;

export interface ValidateResult {
  readonly checked: number;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

/** Placeholder: no rules yet. Exists so CI and AGENTS.md can wire the real command. */
export async function validate(_paths: readonly string[]): Promise<ValidateResult> {
  return Promise.resolve({ checked: 0, errors: [], warnings: [] });
}

export async function main(argv: readonly string[], io: Io): Promise<number> {
  let parsed: ReturnType<typeof parseArgs>;
  try {
    parsed = parseArgs({
      args: [...argv],
      allowPositionals: true,
      options: {
        json: { type: 'boolean', default: false },
        strict: { type: 'boolean', default: false },
        help: { type: 'boolean', short: 'h', default: false },
        version: { type: 'boolean', short: 'v', default: false },
      },
    });
  } catch (error) {
    io.err.write(`gitleaf: ${error instanceof Error ? error.message : String(error)}\n`);
    io.err.write(USAGE);
    return 2;
  }

  const { values, positionals } = parsed;
  if (values.version) {
    io.out.write(`${VERSION}\n`);
    return 0;
  }
  const [command, ...rest] = positionals;
  if (values.help || command === undefined) {
    io.out.write(USAGE);
    return values.help ? 0 : 2;
  }

  switch (command) {
    case 'validate': {
      const result = await validate(rest);
      if (values.json) {
        io.out.write(`${JSON.stringify(result)}\n`);
      } else {
        io.out.write(
          `gitleaf validate: checked ${String(result.checked)} files, ${String(result.errors.length)} errors, ${String(result.warnings.length)} warnings (rules land in ST-PV13MRCY)\n`,
        );
      }
      const failing = result.errors.length > 0 || (values.strict && result.warnings.length > 0);
      return failing ? 1 : 0;
    }
    default:
      io.err.write(`gitleaf: unknown command "${command}"\n`);
      io.err.write(USAGE);
      return 2;
  }
}
