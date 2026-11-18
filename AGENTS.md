# Trilha Git

Portfolio project for Alexandre Teixeira (GitHub `alexandretx`). A PWA that teaches Git by practice: the learner types commands, an in-memory repository reacts, and the task is graded on the final state.

User-facing copy is Brazilian Portuguese. Identifiers, commit messages, and this file are English.

<!-- antislop:start -->
## antislop

For UI, copy, people, mobile layout, or code comments work, read these installed skill files directly (use these paths even if a same-named global skill exists):

- Core filter, always on: `antislop`: `.cursor/skills/antislop/SKILL.md`
- UI / visual: `antislop-ui`: `.cursor/skills/antislop-ui/SKILL.md`
- Copy & text: `antislop-copywriting`: `.cursor/skills/antislop-copywriting/SKILL.md`
- People: `antislop-human`: `.cursor/skills/antislop-human/SKILL.md`
- Mobile / responsive: `antislop-layoutmobile`: `.cursor/skills/antislop-layoutmobile/SKILL.md`
- Code comments: `antislop-code`: `.cursor/skills/antislop-code/SKILL.md`

Before starting, follow the core's "Two Usage Modes" section in strict order: explicit session instruction first, then global preference, then ask. A session instruction always wins. For a resolved mode, say `antislop active: <mode> (session override).` or `antislop active: <mode> (global preference).` once before presenting findings or making edits, using the actual mode and source. Acknowledging the user's request without naming the source does not replace this notice.

Only an explicit choice of antislop during or after selects a session mode. A request to review, audit, or avoid file edits does not select a mode; read the global preference in that case. Another skill's mode does not select antislop's mode.

If the mode is unresolved, ask during/after and end the response; wait for the answer before any UI review, planning, or concept. For read-only tasks, put the active-mode notice only at the start of the final answer, never in progress messages. For editing tasks, announce before the first edit and omit it from the final answer.

To update antislop later: `npx antislop-ai --update`, or run `npx antislop-ai` and pick Overwrite them.
<!-- antislop:end -->

## Architecture

Content is data. Behavior is an engine. The app wires a pack to the engine with the same id and never special-cases a lesson inside a component.

```
src/
  core/           shared contracts, mastery, review queue, progress storage
  engines/git/    in-memory Git plus the small shell tasks need
  content/git/    packs: lessons, initial state, checks, hints, explanations
  ui/             screens and the terminal
  app/            registry and the root component
```

### Engine

An engine creates a session from an initial state and executes one line at a time.

- `execute` returns stdout, stderr, and an exit code.
- `getState` returns a plain snapshot the grader can read.
- `history` returns the argv of each line the learner ran.

The Git engine does not call real Git and does not use a WASM port. Object ids are SHA-1 of Git's object bytes (blob, tree, commit), so hashes look like Git's. The default branch is `main`. The author is `Estudante <estudante@trilha.local>`. Commit timestamps use a fixed offset of `-0300` (Salvador). A `Clock` is injectable so tests do not depend on the wall clock.

The session also accepts a few shell commands, because a task has to create and read files: `echo` (with `>` and `>>`), `touch`, `cat`, `ls`, `pwd`, `mkdir`. That shell is part of the Git engine, not a second product. Paths stay inside the repository. `..` and absolute paths are rejected.

Git's own messages stay in English, close to real Git. Messages that belong to the app (unknown command, missing commit message, path rejected) are Portuguese.

### ContentPack and Task

A pack names an `engineId` and a list of levels. A task has:

- `conceptId`: the command or idea the mastery score tracks
- copy in Portuguese: `title`, `scenario`, three `hints` (concept, syntax, answer), `explanation`
- `initialState`: data the engine understands
- `checks`: data the grader understands

Levels may be listed with no tasks. The trail shows the name and the unlock rule. It does not pretend the tasks exist.

### Grader

The grader reads the snapshot and, when a check asks for it, the command history. It does not compare the raw input string.

Action goals (`init`, `add`, `commit`, file contents) pass when the repository ended in the required state, whatever sequence got there. `git add .` and `git add notas.txt` are the same result if the index matches.

Read-only goals can require a command family. `status` and `log` do not change the repository, so a check may say "some argv began with `git status`" without caring about flags or order. That is the evidence the concept was used. Do not require a full command line.

Failed checks return Portuguese sentences the screen can show as-is.

### ProgressStore

```ts
interface ProgressStore {
  load(): Promise<ProgressSnapshot | null>
  save(snapshot: ProgressSnapshot): Promise<void>
}
```

The browser store is `localStorage` under `trilha-git.progress.v1`. The snapshot is one small JSON document. The methods are async so a later IndexedDB or Supabase store can replace the class without a UI rewrite. Tests use an in-memory store.

Mastery is per concept, in the 0 to 1 range:

- solved on the first Verificar, no hints: 1
- hint 1, 2, 3 multiply by 0.8, 0.6, 0.4
- a failed Verificar before the success multiplies by 0.75
- unsolved or never attempted: 0

A concept's mastery is the average of its tasks. A level's mastery is the average of its concepts. The next level unlocks at 0.8.

A result below 0.95 schedules a review. The due time moves out as the score improves (half a day, 1 day, then 2 and 3 days, doubling after a clean pass). Due reviews are listed above the trail. Finishing one replaces the stored result.

## Agent roles

Work lands in small pull requests. Stay inside the role for that phase.

### Architecture and core

Owns `src/core`, `src/engines`, the pack schema, and CI. Changes the contracts only when a later engine cannot fit. Does not restyle the product and does not invent lesson prose beyond what a phase asks for.

### UI and UX

Owns `src/ui` and the visual tokens. Reads `DESIGN.md` before touching layout, color, or type. Keeps both themes and the phone layout working. Does not change grading or the repository model to make a screen easier.

### Content

Owns `src/content`. Adds a pack by adding data and, if the subject is new, asking Architecture for an engine. Writes hints and explanations in Portuguese that a learner can use. Does not put answers in scenario text. Every new task ships with a test that a known solution passes and a wrong repository fails.

### Security and QA

Owns test gaps, abuse of the session (path escape, huge input, malformed lines), dependency review, and later auth. The simulator must not gain a way to touch the real filesystem or the network. A failing check should not leak the answer tier.

## Rules for every agent

- Follow antislop while the work is done, then put the PASS/FAIL report in the pull request.
- Read `DESIGN.md` before UI work. Do not invent a second visual direction in a component.
- User-facing strings in Brazilian Portuguese. No em dash in copy we write.
- Identifiers and commit messages in English. Commits follow Conventional Commits and stay small enough to read.
- Behavior changes need tests. `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` pass before a PR is opened.
- Do not deploy. Hosting, auth, and sync are later phases.
- Do not import a real Git binary or a WASM Git. Extend the engine.
- Do not hardcode a lesson inside React. Put it in the pack.
- One focused PR. Leave unrelated cleanup on its own branch.

## Adding a pack

1. Create `src/content/<subject>/` with levels, tasks, initial states, and checks.
2. If `engineId` is new, add `src/engines/<subject>/` with an engine and a grader, and register both in `src/app/registry.ts`.
3. Add unit tests for the engine and a solve/fail test per task.
4. The trail picks the pack up from the registry. No screen should mention the new subject by importing a task file directly.

## Phase map

1. **Core (this repository state).** Scaffold, Git engine through the basic commands, mastery, Level 1 (Básico), a playable UI, PWA shell.
2. **Histórico.** `diff`, `restore`, `reset`, `revert`, and the tasks for that level.
3. **Branches.** Branch, switch, merge, conflicts.
4. **Remoto.** A simulated remote: clone, remote, fetch, pull, push.
5. **Avançado.** Rebase, stash, cherry-pick, tag, reflog, bisect.
6. **Accounts.** Supabase sync behind `ProgressStore`, still optional. The app keeps working offline with the local store.
7. **Deploy.** Host the PWA. Not before the content for the first levels is honest.

## Decisions already made

- Vite, React, TypeScript strict, Vitest, ESLint, Prettier, `vite-plugin-pwa`.
- Hash routing, no client-side router library. Two screens: trail and task.
- `localStorage` for progress. Interface stays async.
- Command-family checks exist only for read-only concepts. Documented above so later packs do not start grading strings.
