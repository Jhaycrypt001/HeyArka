/**
 * Minimal hand-rolled flag parsing — the CLI has three subcommands and a
 * handful of flags each, not enough surface to justify a dependency.
 */
export interface ParsedFlags {
  positionals: string[];
  flags: Map<string, string | boolean>;
}

export function parseArgs(argv: string[]): ParsedFlags {
  const positionals: string[] = [];
  const flags = new Map<string, string | boolean>();

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === undefined) continue;
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("--")) {
        flags.set(key, next);
        i++;
      } else {
        flags.set(key, true);
      }
    } else {
      positionals.push(arg);
    }
  }

  return { positionals, flags };
}

export function flagString(flags: Map<string, string | boolean>, key: string): string | undefined {
  const value = flags.get(key);
  return typeof value === "string" ? value : undefined;
}

export function flagBoolean(flags: Map<string, string | boolean>, key: string): boolean {
  return flags.get(key) !== undefined;
}
