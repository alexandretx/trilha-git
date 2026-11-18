export interface ParsedCommand {
  argv: string[];
  redirect?: { append: boolean; target: string };
  /** Operator that follows this command. `and` stops the line when the command fails. */
  follow: 'and' | 'semi' | 'end';
}

export type ParseResult = { ok: true; commands: ParsedCommand[] } | { ok: false; message: string };

interface Token {
  kind: 'word' | 'and' | 'semi' | 'redirect';
  value: string;
  append?: boolean;
}

export function parseCommandLine(input: string): ParseResult {
  if (input.length > 8000) {
    return { ok: false, message: 'linha longa demais.' };
  }
  const scanned = scan(input);
  if (!scanned.ok) return scanned;
  return group(scanned.tokens);
}

function scan(input: string): { ok: true; tokens: Token[] } | { ok: false; message: string } {
  const tokens: Token[] = [];
  let index = 0;
  while (index < input.length) {
    const char = input[index];
    if (char === ' ' || char === '\t') {
      index += 1;
      continue;
    }
    if (char === '#') break;
    if (char === ';') {
      tokens.push({ kind: 'semi', value: ';' });
      index += 1;
      continue;
    }
    if (char === '&') {
      if (input[index + 1] !== '&')
        return { ok: false, message: 'o operador & não é aceito. Use &&.' };
      tokens.push({ kind: 'and', value: '&&' });
      index += 2;
      continue;
    }
    if (char === '|') return { ok: false, message: 'pipe ainda não existe nesta trilha.' };
    if (char === '>') {
      const append = input[index + 1] === '>';
      tokens.push({ kind: 'redirect', value: append ? '>>' : '>', append });
      index += append ? 2 : 1;
      continue;
    }
    if (char === '"' || char === "'") {
      const quoted = readQuoted(input, index, char);
      if (!quoted.ok) return quoted;
      tokens.push({ kind: 'word', value: quoted.value });
      index = quoted.next;
      continue;
    }
    const start = index;
    while (index < input.length && !' \t;&|>\'"'.includes(input[index] ?? '')) index += 1;
    tokens.push({ kind: 'word', value: input.slice(start, index) });
  }
  return { ok: true, tokens };
}

function readQuoted(
  input: string,
  start: number,
  quote: '"' | "'",
): { ok: true; value: string; next: number } | { ok: false; message: string } {
  let value = '';
  let index = start + 1;
  while (index < input.length) {
    const char = input[index];
    if (char === quote) return { ok: true, value, next: index + 1 };
    if (quote === '"' && char === '\\') {
      const escaped = input[index + 1];
      if (escaped === undefined) return { ok: false, message: 'aspas não fechadas.' };
      value += escaped === 'n' ? '\n' : escaped === 't' ? '\t' : escaped;
      index += 2;
      continue;
    }
    value += char ?? '';
    index += 1;
  }
  return { ok: false, message: 'aspas não fechadas.' };
}

function group(tokens: Token[]): ParseResult {
  const commands: ParsedCommand[] = [];
  let current: Token[] = [];
  let endedWithSeparator: Token['kind'] | null = null;
  const flush = (follow: 'and' | 'semi' | 'end'): ParseResult | null => {
    if (current.length === 0) {
      if (follow === 'end') return null;
      return { ok: false, message: 'comando vazio.' };
    }
    const built = buildCommand(current, follow);
    if (!built.ok) return built;
    commands.push(built.command);
    current = [];
    return null;
  };

  for (const token of tokens) {
    if (token.kind === 'and' || token.kind === 'semi') {
      const error = flush(token.kind);
      if (error) return error;
      endedWithSeparator = token.kind;
      continue;
    }
    endedWithSeparator = null;
    current.push(token);
  }
  if (endedWithSeparator === 'and')
    return { ok: false, message: 'comando incompleto depois de &&.' };
  const error = flush('end');
  if (error) return error;
  return { ok: true, commands };
}

function buildCommand(
  tokens: Token[],
  follow: ParsedCommand['follow'],
): { ok: true; command: ParsedCommand } | { ok: false; message: string } {
  const argv: string[] = [];
  let redirect: ParsedCommand['redirect'];
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (!token) continue;
    if (token.kind === 'redirect') {
      const target = tokens[index + 1];
      if (!target || target.kind !== 'word') {
        return { ok: false, message: 'falta o arquivo depois de >.' };
      }
      if (redirect) return { ok: false, message: 'só um redirecionamento por comando.' };
      redirect = { append: Boolean(token.append), target: target.value };
      index += 1;
      continue;
    }
    if (token.kind === 'word') argv.push(token.value);
  }
  if (argv.length === 0)
    return { ok: false, message: 'falta o comando antes do redirecionamento.' };
  return { ok: true, command: redirect ? { argv, redirect, follow } : { argv, follow } };
}
