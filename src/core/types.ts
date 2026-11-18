export interface Clock {
  now(): number;
}

export interface CommandOutput {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface EngineSession<TState> {
  execute(line: string): CommandOutput;
  getState(): TState;
  history(): readonly string[][];
}

export interface Engine<TState, TInitial> {
  id: string;
  createSession(initial: TInitial, clock?: Clock): EngineSession<TState>;
}

export interface GradeResult {
  passed: boolean;
  failures: string[];
}

export interface Grader<TState, TCheck> {
  grade(state: TState, checks: readonly TCheck[], history: readonly string[][]): GradeResult;
}

export interface Task<TInitial, TCheck> {
  id: string;
  conceptId: string;
  title: string;
  scenario: string;
  hints: readonly [string, string, string];
  explanation: string;
  initialState: TInitial;
  checks: readonly TCheck[];
}

export interface Level<TTask> {
  id: string;
  title: string;
  summary: string;
  tasks: readonly TTask[];
}

export interface ContentPack<TTask> {
  id: string;
  engineId: string;
  title: string;
  description: string;
  levels: readonly Level<TTask>[];
}
