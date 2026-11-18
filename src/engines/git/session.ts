import type { Clock, CommandOutput, EngineSession } from '../../core/types';
import { runCommand } from './commands';
import { parseCommandLine } from './parse';
import { createRepo, systemClock, type GitInitialState, type RepoState } from './repo';

function joinText(left: string, right: string): string {
  if (!left) return right;
  if (!right) return left;
  return left.endsWith('\n') ? left + right : `${left}\n${right}`;
}

export class GitSession implements EngineSession<RepoState> {
  private state: RepoState;
  private readonly commands: string[][] = [];

  constructor(
    initial: GitInitialState = {},
    private readonly clock: Clock = systemClock,
  ) {
    this.state = createRepo(initial, clock);
  }

  execute(line: string): CommandOutput {
    const parsed = parseCommandLine(line);
    if (!parsed.ok) return { stdout: '', stderr: `${parsed.message}\n`, exitCode: 2 };
    if (parsed.commands.length === 0) return { stdout: '', stderr: '', exitCode: 0 };

    let stdout = '';
    let stderr = '';
    let exitCode = 0;
    for (const command of parsed.commands) {
      const ran = runCommand(this.state, command, this.clock);
      this.state = ran.state;
      this.commands.push([...command.argv]);
      stdout = joinText(stdout, ran.output.stdout);
      stderr = joinText(stderr, ran.output.stderr);
      exitCode = ran.output.exitCode;
      if (command.follow === 'and' && exitCode !== 0) break;
    }
    return { stdout, stderr, exitCode };
  }

  getState(): RepoState {
    return structuredClone(this.state);
  }

  history(): readonly string[][] {
    return this.commands.map((argv) => [...argv]);
  }
}
