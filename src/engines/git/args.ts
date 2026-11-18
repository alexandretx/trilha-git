export function splitArgs(args: readonly string[]): { flags: string[]; rest: string[] } {
  const flags: string[] = [];
  const rest: string[] = [];
  let positional = false;
  for (const arg of args) {
    if (!positional && arg === '--') {
      positional = true;
      continue;
    }
    if (!positional && arg.startsWith('-') && arg !== '-') flags.push(arg);
    else rest.push(arg);
  }
  return { flags, rest };
}
