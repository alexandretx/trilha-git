import type { Lesson } from './types';

const PARAGRAPH = 80;
const NOTE = 40;

function short(value: string, min: number): boolean {
  return value.trim().length < min;
}

/** Names of lesson fields that are missing or too thin to teach from. */
export function lessonGaps(lesson: Lesson): string[] {
  const gaps: string[] = [];
  if (short(lesson.what, PARAGRAPH)) gaps.push('what');
  if (short(lesson.why, PARAGRAPH)) gaps.push('why');
  if (short(lesson.analogy, PARAGRAPH)) gaps.push('analogy');
  if (short(lesson.inside, PARAGRAPH)) gaps.push('inside');
  if (lesson.breakdown.length < 2) gaps.push('breakdown');
  lesson.breakdown.forEach((piece, index) => {
    if (!piece.token.trim() || short(piece.meaning, 12)) gaps.push(`breakdown.${index}`);
  });
  if (lesson.example.commands.length === 0) gaps.push('example.commands');
  lesson.example.commands.forEach((command, index) => {
    if (!command.trim()) gaps.push(`example.commands.${index}`);
  });
  if (short(lesson.example.meaning, NOTE)) gaps.push('example.meaning');
  if (lesson.mistakes.length < 2) gaps.push('mistakes');
  lesson.mistakes.forEach((mistake, index) => {
    if (short(mistake, 20)) gaps.push(`mistakes.${index}`);
  });
  lesson.basics.forEach((term, index) => {
    if (!term.term.trim() || short(term.meaning, NOTE)) gaps.push(`basics.${index}`);
  });
  if (JSON.stringify(lesson).includes('—') || JSON.stringify(lesson).includes('–')) {
    gaps.push('dash');
  }
  return gaps;
}

/** Terms whose `basics` entries are absent from these lessons. */
export function missingLessonTerms(lessons: readonly Lesson[], terms: readonly string[]): string[] {
  const covered = lessons
    .flatMap((lesson) => lesson.basics.map((item) => item.term.toLocaleLowerCase('pt-BR')))
    .join('\n');
  return terms.filter((term) => !covered.includes(term.toLocaleLowerCase('pt-BR')));
}
