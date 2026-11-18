import type { Clock, CommandOutput } from '../../core/types';
import type { ParsedCommand } from './parse';
import { baseName, normalizePath, parentPath } from './paths';
import {
  commitIndex,
  formatLog,
  formatStatus,
  headFiles,
  history,
  recordsEqual,
  stagePath,
  withDirs,
  type RepoState,
} from './repo';

const MAX_FILE = 100_000;

const output = (stdout = '', stderr = '', exitCode = 0): CommandOutput => ({
  stdout,
  stderr,
  exitCode,
});

export function runCommand(
  state: RepoState,
  command: ParsedCommand,
  clock: Clock,
): { state: RepoState; output: CommandOutput } {
  const [name, ...args] = command.argv;
  if (!name) return { state, output: output('', 'comando vazio.\n', 1) };

  let result: { state: RepoState; output: CommandOutput };
  if (name === 'git') result = runGit(state, args, clock);
  else if (name === 'echo') result = runEcho(state, args);
  else if (name === 'touch') result = runTouch(state, args);
  else if (name === 'cat') result = runCat(state, args);
  else if (name === 'ls') result = runLs(state, args);
  else if (name === 'pwd') result = { state, output: output('/repo\n') };
  else if (name === 'mkdir') result = runMkdir(state, args);
  else if (name === 'rm') result = runRm(state, args);
  else {
    result = {
      state,
      output: output(
        '',
        `Não conheço o comando "${name}".\nNesta trilha: git, echo, touch, cat, ls, pwd, mkdir, rm.\n`,
        127,
      ),
    };
  }

  if (!command.redirect) return result;
  return applyRedirect(result.state, result.output, command.redirect);
}

function fail(state: RepoState, stderr: string, exitCode = 1) {
  return { state, output: output('', stderr.endsWith('\n') ? stderr : `${stderr}\n`, exitCode) };
}

function requireRepo(state: RepoState): CommandOutput | null {
  if (state.initialized) return null;
  return output('', 'fatal: not a git repository (or any of the parent directories): .git\n', 128);
}

function resolvePath(input: string): string | null {
  return normalizePath(input);
}

function parentReady(state: RepoState, path: string): boolean {
  const parent = parentPath(path);
  if (!parent) return true;
  if (parent in state.worktree) return false;
  return state.dirs.includes(parent);
}

function writeFile(
  state: RepoState,
  path: string,
  content: string,
  append: boolean,
): { state: RepoState } | { error: string } {
  if (content.length > MAX_FILE)
    return { error: `${path}: arquivo grande demais para esta trilha.\n` };
  if (!parentReady(state, path)) return { error: `${path}: pasta não encontrada.\n` };
  if (state.dirs.includes(path)) return { error: `${path}: é uma pasta.\n` };
  const next = append ? `${state.worktree[path] ?? ''}${content}` : content;
  if (next.length > MAX_FILE)
    return { error: `${path}: arquivo grande demais para esta trilha.\n` };
  return {
    state: withDirs({ ...state, worktree: { ...state.worktree, [path]: next } }),
  };
}

function applyRedirect(
  state: RepoState,
  result: CommandOutput,
  redirect: { append: boolean; target: string },
): { state: RepoState; output: CommandOutput } {
  const path = resolvePath(redirect.target);
  if (!path) return fail(state, `caminho fora do repositório: ${redirect.target}`);
  const written = writeFile(state, path, result.stdout, redirect.append);
  if ('error' in written) return fail(state, written.error);
  return { state: written.state, output: { ...result, stdout: '' } };
}

function runEcho(state: RepoState, args: string[]) {
  const newline = args[0] !== '-n';
  const words = newline ? args : args.slice(1);
  const text = `${words.join(' ')}${newline ? '\n' : ''}`;
  return { state, output: output(text) };
}

function runTouch(state: RepoState, args: string[]) {
  if (args.length === 0) return fail(state, 'touch: falta o nome do arquivo.');
  let next = state;
  for (const arg of args) {
    const path = resolvePath(arg);
    if (!path) return fail(next, `caminho fora do repositório: ${arg}`);
    if (next.dirs.includes(path)) return fail(next, `touch: ${path}: é uma pasta.`);
    if (path in next.worktree) continue;
    const written = writeFile(next, path, '', false);
    if ('error' in written) return fail(next, `touch: ${written.error.trim()}`);
    next = written.state;
  }
  return { state: next, output: output() };
}

function runCat(state: RepoState, args: string[]) {
  if (args.length === 0) return fail(state, 'cat: falta o nome do arquivo.');
  let stdout = '';
  for (const arg of args) {
    const path = resolvePath(arg);
    if (!path) return fail(state, `caminho fora do repositório: ${arg}`);
    if (state.dirs.includes(path)) return fail(state, `cat: ${path}: é uma pasta.`);
    if (!(path in state.worktree)) return fail(state, `cat: ${path}: arquivo não encontrado.`);
    stdout += state.worktree[path] ?? '';
  }
  return { state, output: output(stdout) };
}

function runLs(state: RepoState, args: string[]) {
  const target = args[0] ?? '';
  if (args.length > 1) return fail(state, 'ls: nesta trilha, um caminho por vez.');
  if (!target) return { state, output: output(formatNames(listDir(state, ''))) };
  const path = resolvePath(target);
  if (!path) return fail(state, `caminho fora do repositório: ${target}`);
  if (path in state.worktree) return { state, output: output(`${path}\n`) };
  if (state.dirs.includes(path))
    return { state, output: output(formatNames(listDir(state, path))) };
  return fail(state, `ls: ${path}: arquivo ou pasta não encontrado.`);
}

function listDir(state: RepoState, dir: string): string[] {
  const names = new Set<string>();
  for (const path of Object.keys(state.worktree)) {
    if (parentPath(path) === dir) names.add(baseName(path));
  }
  for (const path of state.dirs) {
    if (parentPath(path) === dir) names.add(baseName(path));
  }
  return [...names].sort();
}

function formatNames(names: string[]): string {
  if (names.length === 0) return '';
  return `${names.join('\n')}\n`;
}

function runMkdir(state: RepoState, args: string[]) {
  const parents = args[0] === '-p';
  const paths = parents ? args.slice(1) : args;
  if (paths.length === 0) return fail(state, 'mkdir: falta o nome da pasta.');
  const dirs = [...state.dirs];
  for (const arg of paths) {
    const path = resolvePath(arg);
    if (!path) return fail(state, `caminho fora do repositório: ${arg}`);
    if (path in state.worktree) return fail(state, `mkdir: ${path}: já existe um arquivo.`);
    const segments = path.split('/');
    let prefix = '';
    for (let index = 0; index < segments.length; index += 1) {
      prefix = prefix ? `${prefix}/${segments[index]}` : (segments[index] ?? '');
      const last = index === segments.length - 1;
      if (prefix in state.worktree) return fail(state, `mkdir: ${prefix}: já existe um arquivo.`);
      if (dirs.includes(prefix)) {
        if (last && !parents) return fail(state, `mkdir: ${path}: a pasta já existe.`);
        continue;
      }
      if (!last && !parents) return fail(state, `mkdir: ${path}: pasta não encontrada.`);
      dirs.push(prefix);
    }
  }
  return { state: withDirs({ ...state, dirs }), output: output() };
}

function runRm(state: RepoState, args: string[]) {
  if (args.length === 0) return fail(state, 'rm: falta o nome do arquivo.');
  const worktree = { ...state.worktree };
  for (const arg of args) {
    const path = resolvePath(arg);
    if (!path) return fail(state, `caminho fora do repositório: ${arg}`);
    if (state.dirs.includes(path)) return fail(state, `rm: ${path}: é uma pasta.`);
    if (!(path in worktree)) return fail(state, `rm: ${path}: arquivo não encontrado.`);
    delete worktree[path];
  }
  return { state: { ...state, worktree }, output: output() };
}

function runGit(state: RepoState, args: string[], clock: Clock) {
  const [sub, ...rest] = args;
  if (!sub || sub === '--help' || sub === 'help') {
    const text = 'usage: git <command>\n\nDisponíveis agora: init, status, add, commit, log.\n';
    return { state, output: output(sub ? text : '', sub ? '' : text, sub ? 0 : 1) };
  }
  if (sub === 'init') return runInit(state);
  const missing = requireRepo(state);
  if (missing) return { state, output: missing };
  if (sub === 'status') return runStatus(state, rest);
  if (sub === 'add') return runAdd(state, rest);
  if (sub === 'commit') return runCommit(state, rest, clock);
  if (sub === 'log') return runLog(state, rest);
  return {
    state,
    output: output(
      '',
      `git: '${sub}' is not a git command. See 'git --help'.\nDisponíveis agora: init, status, add, commit, log.\n`,
      1,
    ),
  };
}

function runInit(state: RepoState) {
  if (state.initialized) {
    return {
      state,
      output: output('Reinitialized existing Git repository in /repo/.git/\n'),
    };
  }
  return {
    state: { ...state, initialized: true, branch: 'main' },
    output: output('Initialized empty Git repository in /repo/.git/\n'),
  };
}

function runStatus(state: RepoState, args: string[]) {
  if (args.some((arg) => arg.startsWith('-'))) {
    return fail(
      state,
      `error: opção desconhecida para git status: ${args.find((arg) => arg.startsWith('-'))}`,
    );
  }
  if (args.length > 0)
    return fail(state, 'git status com caminho ainda não entra nesta trilha. Rode git status.');
  const text = formatStatus(state);
  return { state, output: output(text.endsWith('\n') ? text : `${text}\n`) };
}

function runAdd(state: RepoState, args: string[]) {
  if (args.length === 0) {
    return {
      state,
      output: output(
        '',
        "Nothing specified, nothing added.\nhint: Maybe you wanted to say 'git add .'?\n",
        128,
      ),
    };
  }
  let next = state;
  for (const arg of args) {
    if (arg !== '.' && arg.startsWith('-')) {
      return fail(next, `error: unknown option '${arg.slice(1)}'`);
    }
    const path = arg === '.' ? '.' : resolvePath(arg);
    if (!path) return fail(next, `caminho fora do repositório: ${arg}`);
    const staged = stagePath(next, path);
    if (staged === 'missing') {
      return {
        state: next,
        output: output('', `fatal: pathspec '${arg}' did not match any files\n`, 128),
      };
    }
    next = staged;
  }
  return { state: next, output: output() };
}

function runCommit(state: RepoState, args: string[], clock: Clock) {
  const parsed = parseCommitArgs(args);
  if ('error' in parsed) return fail(state, parsed.error);
  if (parsed.message === null) {
    return fail(state, 'falta a mensagem do commit. Use git commit -m "mensagem".');
  }
  if (parsed.message.trim() === '') return fail(state, 'a mensagem do commit está vazia.');

  let next = state;
  if (parsed.all) {
    const index = { ...next.index };
    for (const path of Object.keys(index)) {
      if (path in next.worktree) index[path] = next.worktree[path] ?? '';
      else delete index[path];
    }
    next = { ...next, index };
  }

  const head = headFiles(next);
  if (recordsEqual(next.index, head)) {
    const untracked = Object.keys(next.worktree).filter((path) => !(path in next.index));
    const dirty = Object.keys(next.index).some((path) => next.index[path] !== next.worktree[path]);
    if (!dirty && untracked.length > 0) {
      return {
        state,
        output: output(
          '',
          'nothing added to commit but untracked files present (use "git add" to track)\n',
          1,
        ),
      };
    }
    if (dirty) {
      return {
        state,
        output: output(
          '',
          'no changes added to commit (use "git add" and/or "git commit -a")\n',
          1,
        ),
      };
    }
    return { state, output: output('', 'nothing to commit, working tree clean\n', 1) };
  }

  const committed = commitIndex(next, parsed.message, Math.floor(clock.now() / 1000));
  return { state: committed.state, output: output(`${committed.summary}\n`) };
}

function parseCommitArgs(
  args: string[],
): { all: boolean; message: string | null } | { error: string } {
  let all = false;
  const messages: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg) continue;
    if (arg === '-a' || arg === '--all') {
      all = true;
      continue;
    }
    if (arg === '-am') {
      all = true;
      const message = args[index + 1];
      if (message === undefined) return { error: 'falta a mensagem depois de -am.' };
      messages.push(message);
      index += 1;
      continue;
    }
    if (arg === '-m' || arg === '--message') {
      const message = args[index + 1];
      if (message === undefined) return { error: 'falta a mensagem depois de -m.' };
      messages.push(message);
      index += 1;
      continue;
    }
    if (arg.startsWith('-')) return { error: `error: unknown option '${arg}'` };
    return { error: `git commit não aceita o argumento "${arg}". Use -m "mensagem".` };
  }
  return { all, message: messages.length > 0 ? messages.join('\n\n') : null };
}

function runLog(state: RepoState, args: string[]) {
  let oneline = false;
  let limit: number | null = null;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg) continue;
    if (arg === '--oneline') {
      oneline = true;
      continue;
    }
    if (arg === '-n' || arg === '--max-count') {
      const value = Number(args[index + 1]);
      if (!Number.isInteger(value) || value < 0)
        return fail(state, 'git log: -n precisa de um número.');
      limit = value;
      index += 1;
      continue;
    }
    if (/^-\d+$/.test(arg)) {
      limit = Number(arg.slice(1));
      continue;
    }
    if (arg.startsWith('--max-count=')) {
      const value = Number(arg.slice('--max-count='.length));
      if (!Number.isInteger(value) || value < 0)
        return fail(state, 'git log: --max-count precisa de um número.');
      limit = value;
      continue;
    }
    return fail(state, `git log: opção não aceita: ${arg}`);
  }
  if (history(state).length === 0) {
    return fail(
      state,
      `fatal: your current branch '${state.branch}' does not have any commits yet`,
      128,
    );
  }
  const text = formatLog(state, { oneline, limit });
  return { state, output: output(text ? `${text}\n` : '') };
}
