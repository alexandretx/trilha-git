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

/** One token of a command, in the order the learner types it. */
export interface LessonPiece {
  token: string;
  meaning: string;
}

/** A word this task has to define before the command makes sense. */
export interface LessonTerm {
  term: string;
  meaning: string;
}

/**
 * Taught before the learner types. Every task in every pack has one.
 * `basics` is empty when earlier tasks already defined the words.
 */
export interface Lesson {
  what: string;
  why: string;
  analogy: string;
  inside: string;
  breakdown: readonly LessonPiece[];
  example: {
    commands: readonly string[];
    output: string;
    meaning: string;
  };
  mistakes: readonly string[];
  basics: readonly LessonTerm[];
}

export interface Task<TInitial, TCheck> {
  id: string;
  conceptId: string;
  title: string;
  scenario: string;
  hints: readonly [string, string, string];
  explanation: string;
  lesson: Lesson;
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
