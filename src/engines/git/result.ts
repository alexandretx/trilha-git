import type { CommandOutput } from '../../core/types';
import type { RepoState } from './repo';

export interface CommandResult {
  state: RepoState;
  output: CommandOutput;
}

export function commandOutput(stdout = '', stderr = '', exitCode = 0): CommandOutput {
  return { stdout, stderr, exitCode };
}

export function commandFailure(state: RepoState, stderr: string, exitCode = 1): CommandResult {
  return {
    state,
    output: commandOutput('', stderr.endsWith('\n') ? stderr : `${stderr}\n`, exitCode),
  };
}
