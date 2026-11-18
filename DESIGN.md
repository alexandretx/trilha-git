# Design direction

Reading this as: a study bench for someone learning Git by typing commands, in a warm paper-and-ink tool style, dial ENERGY 2 / RHYTHM 2 / MOTION 1.

This file is direction for the interface. It is not a marketing page and it does not add product rules. Antislop filters the work; this file tells the work what it should feel like.

## Identity

Trilha Git is a desk, not a course site. One lesson sits on paper. The terminal is the work surface and the focal point of the task screen. The person using it is practicing, often on a phone, often between other things. The screen should get out of the way of the next command.

## Personality

Calm and specific. Copy sounds like a colleague who states the situation and stops. No cheerleading, no streak theatre, no fake counts of learners. Brazilian Portuguese in the product. Short sentences. Buttons name the action.

## Mood

Late afternoon, warm paper, dark ink, one brass note in the dark theme and one forest note in the light theme. It should feel made for reading commands, not for launching a startup.

## Dials

Dial: ENERGY 2 / RHYTHM 2 / MOTION 1

- Energy 2: a clear wordmark and one strong terminal. No hero, no second headline, no decoration competing with the task.
- Rhythm 2: the trail is a single vertical index. The task screen is a different composition (lesson plus terminal). Those are the two rhythms. Do not invent a third layout for empty or error states.
- Motion 1: hover, active, and focus only. No entrance animation, no pulsing prompt.

## Palette

Two themes, both first-class. The first visit follows `prefers-color-scheme`. The toggle is remembered on this browser.

Light:

| Token        | Hex       | Use                                  |
| ------------ | --------- | ------------------------------------ |
| paper        | `#f3efe6` | Page                                 |
| paper-raised | `#e7e1d4` | Lesson block                         |
| ink          | `#1c1915` | Primary text                         |
| ink-soft     | `#4a453c` | Secondary text                       |
| line         | `#d4cec1` | Hairline between rows                |
| control      | `#5e594f` | Input border, focus-adjacent edges   |
| accent       | `#2c5640` | Primary button, current task, prompt |
| accent-ink   | `#f3efe6` | Text on the accent button            |
| danger       | `#8c2f2f` | Failed check text                    |

Dark:

| Token        | Hex       | Use                                  |
| ------------ | --------- | ------------------------------------ |
| paper        | `#141311` | Page                                 |
| paper-raised | `#1e1c19` | Lesson block                         |
| terminal     | `#0c0b0a` | Terminal slab                        |
| ink          | `#ece7dc` | Primary text                         |
| ink-soft     | `#b7b1a6` | Secondary text                       |
| line         | `#3a3630` | Hairline between rows                |
| control      | `#9a9488` | Input border                         |
| accent       | `#e0b56a` | Primary button, current task, prompt |
| accent-ink   | `#1c1915` | Text on the accent button            |
| danger       | `#e7b6b2` | Failed check text                    |

In the light theme the terminal uses `paper` for its background and `ink` for output, with a `control` border. A light terminal is easier to study. The dark theme is the one that gets the near-black slab.

The accent appears in three places: the primary action, the current or completed marker, and the prompt. Body copy stays ink. Success uses the accent, so the palette does not grow a separate green.

Hairlines (`line`) separate list rows. They are not the boundary of a control. Inputs, buttons, and the terminal use `control` or `accent`, which clear 3:1 against the page.

## Typography

- IBM Plex Sans for the lesson, the trail, and the chrome. It is a text face with a matching mono, and it is self-hosted so the installed app still has it offline.
- IBM Plex Mono for the terminal, filenames, and commit hashes. Mono is the working voice, not a display trick. Do not set headings in mono.
- Body 16px, line-height 1.5. Terminal input 16px on every width so mobile browsers do not zoom the page. Terminal output may sit at 15px from 800px up.
- Headings use `clamp(1.5rem, 1.1rem + 1.4vw, 2rem)`. One `h1` per screen.
- No wide-tracked uppercase labels.

## Layout

Mobile is the base.

- Header: wordmark on the left, theme toggle on the right. Nothing else.
- Trail: intro, real mastery (a meter plus the percentage computed from progress), review rows if any are due, then the task list. Future levels are text, with the unlock rule written out. They are not links.
- Task: scenario, then the terminal, then the actions. The command field and Executar stay reachable at the bottom of the viewport. Dica, Reiniciar, and Verificar sit in a wrapping row of targets at least 44px tall.
- Around 800px the trail measure caps near 42rem and stays one column. The task terminal grows; the lesson does not become a sidebar yet.
- Around 1100px the task screen splits: lesson column about 22rem, terminal taking the rest of the width. The trail does not split. A trail is a list.

Whitespace comes from the spacing scale 4, 8, 12, 16, 24, 40. The lesson block uses 16. The gap before the terminal uses 24. Do not pad sections with desktop-sized empty bands on a phone.

## Motif

A 3px accent bar on the left edge of the active trail row and on the left edge of the terminal. Same bar, two places. It is the cursor, moved outside the prompt.

## Shape and elevation

Buttons and inputs use a 2px radius. The terminal and the trail rows are square. Radius is there so a control feels pressable, not so the screen looks soft.

No drop shadows. A 1px border is enough. The page should sit on the desk, not float above it.

## States

- Progress still loading: the sentence "Carregando progresso neste navegador."
- Nothing completed: "Nenhuma tarefa concluída ainda." The list of tasks is still there.
- Progress could not be saved: say so, and keep the session in memory.
- Before the first command: one line in the terminal, "Repositório em /repo. Digite um comando."
- After Verificar fails: the failed checks, in Portuguese, and the terminal stays as the learner left it.
- After Verificar passes: the explanation for that task, then a way back to the trail.
- A level that is not in this release: the level name and "abre com 80% de domínio do nível anterior." Not a button.

## Mark

The installed app needs an icon. The mark is the letters `tg` in IBM Plex Mono on `paper`, with the 3px accent bar at the left. It is a working monogram for the manifest and the favicon, not a separate illustration.

## Reasons

- Paper and ink, because the lesson is something you read before you type.
- Forest in the light theme and brass in the dark theme, because one accent has to be visible on each ground without turning the screen into a theme costume.
- The terminal is the focal point, because the product is practice.
- The trail is a list, because the content is a sequence.
- Plex Sans and Plex Mono, because UI text and commands need to be related and readable, including offline.
- 2px radius and no shadow, because this is a tool sitting on a page, not a stack of cards.
- Motion limited to state changes, because a blinking or sliding lesson fights the command the person is trying to type.

## Out of bounds

Sparkles, gradient washes, glass panels, dot grids, fake metrics, testimonials, badge pills above the title, three-step marketing rows, and a terminal that only exists as a picture. The terminal has to accept commands.
