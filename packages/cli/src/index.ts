/**
 * The `gitleaf` command line. Argument parsing and printing only; rules live in
 * @gitleaf/index, formats in @gitleaf/format and @gitleaf/schema.
 */
import { parseArgs } from 'node:util';
import { formatProvenance, runProvenance } from './provenance.js';
import { formatText, runValidate } from './validate.js';

export interface Io {
  out: { write(chunk: string): unknown };
  err: { write(chunk: string): unknown };
  /** Defaults to process.cwd(). */
  cwd?: string;
  /** Defaults to process.env. */
  env?: Readonly<Record<string, string | undefined>>;
  /** Whether stdout is a terminal. Defaults to false. */
  isTTY?: boolean;
}

export const VERSION = '0.0.0';

const USAGE = `Usage: gitleaf <command> [options]

Commands:
  validate [paths...]   Validate docs: frontmatter, links, owners, freshness, secret refs
  provenance <file>     Who wrote each line: human, agent or mixed, from blame, trailers and Agent Trace notes

Options:
  --config <file>       gitleaf.yaml to use (default: nearest one upwards from the cwd)
  --json                Machine-readable output (one JSON object)
  --strict              Treat warnings as errors
  --no-color            Disable color (NO_COLOR is honored too)
  -h, --help            Show this help
  -v, --version         Show the version

Exit codes: 0 ok, 1 findings, 2 usage or configuration error.
`;

export { runValidate, formatText } from './validate.js';
export { runProvenance, formatProvenance } from './provenance.js';
export type { ValidateReport } from './validate.js';

function parseArgv(argv: readonly string[]) {
  return parseArgs({
    args: [...argv],
    allowPositionals: true,
    options: {
      config: { type: 'string' },
      json: { type: 'boolean', default: false },
      strict: { type: 'boolean', default: false },
      color: { type: 'boolean' },
      help: { type: 'boolean', short: 'h', default: false },
      version: { type: 'boolean', short: 'v', default: false },
    },
    allowNegative: true,
  });
}

export async function main(argv: readonly string[], io: Io): Promise<number> {
  let parsed: ReturnType<typeof parseArgv>;
  try {
    parsed = parseArgv(argv);
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
      const cwd = io.cwd ?? process.cwd();
      const env = io.env ?? process.env;
      const report = await runValidate({ cwd, paths: rest, configPath: values.config });
      if (values.json) {
        io.out.write(`${JSON.stringify(report)}\n`);
      } else {
        const color =
          values.color ??
          (env.NO_COLOR === undefined && env.FORCE_COLOR !== '0' && (io.isTTY ?? false));
        io.out.write(
          formatText(report, { cwd, color, githubAnnotations: env.GITHUB_ACTIONS === 'true' }),
        );
      }
      const configBroken = report.diagnostics.some((d) => d.rule.startsWith('config/'));
      if (configBroken) return 2;
      return report.errors > 0 || (values.strict && report.warnings > 0) ? 1 : 0;
    }
    case 'provenance': {
      const file = rest[0];
      if (file === undefined || rest.length !== 1) {
        io.err.write('gitleaf provenance: expected exactly one file\n');
        return 2;
      }
      try {
        const result = await runProvenance({ cwd: io.cwd ?? process.cwd(), file });
        io.out.write(values.json ? `${JSON.stringify(result)}\n` : formatProvenance(result));
        return 0;
      } catch (error) {
        io.err.write(
          `gitleaf provenance: ${error instanceof Error ? error.message : String(error)}\n`,
        );
        return 2;
      }
    }
    default:
      io.err.write(`gitleaf: unknown command "${command}"\n`);
      io.err.write(USAGE);
      return 2;
  }
}
