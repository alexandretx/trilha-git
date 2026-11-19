import { describe, expect, it } from 'vitest';
import { lessonGaps, missingLessonTerms } from './lesson';
import type { Lesson } from './types';

const lesson: Lesson = {
  what: 'Git guarda versões de uma pasta. Esta frase já passa do tamanho mínimo da lição.',
  why: 'Sem um lugar para o histórico, os comandos seguintes não têm onde anotar o que mudou.',
  analogy:
    'É a capa de um caderno novo. A capa existe, e as páginas com conteúdo ainda vão ser coladas.',
  inside:
    'O painel Repositório passa a mostrar a branch main e avisa que ainda não há commit gravado.',
  breakdown: [
    { token: 'git', meaning: 'O programa. A linha começa por esta palavra.' },
    { token: 'init', meaning: 'Inicia o repositório na pasta atual.' },
  ],
  example: {
    commands: ['git init'],
    output: 'Initialized empty Git repository in /repo/.git/',
    meaning: 'A frase diz que a pasta agora é um repositório vazio.',
  },
  mistakes: [
    'Achar que este comando já gravou os arquivos.',
    'Escrever o subcomando antes da palavra git.',
  ],
  basics: [{ term: 'repositório', meaning: 'A pasta em que o Git passa a guardar o histórico.' }],
};

describe('lessonGaps', () => {
  it('accepts a lesson that can be taught', () => {
    expect(lessonGaps(lesson)).toEqual([]);
  });

  it('names a thin field and a dash', () => {
    const thin: Lesson = {
      ...lesson,
      what: 'curto',
      mistakes: ['ok'],
      example: { ...lesson.example, meaning: 'curto' },
    };
    expect(lessonGaps(thin)).toEqual(['what', 'example.meaning', 'mistakes', 'mistakes.0']);
    expect(lessonGaps({ ...lesson, analogy: `${lesson.analogy} — aparte` })).toContain('dash');
  });
});

describe('missingLessonTerms', () => {
  it('reports a term that no basics entry covers', () => {
    expect(missingLessonTerms([lesson], ['repositório', 'terminal'])).toEqual(['terminal']);
  });
});
