import type { Lesson } from '../core/types';

export function LessonView({ lesson }: { lesson: Lesson }) {
  const sample = [
    ...lesson.example.commands.map((command) => `$ ${command}`),
    lesson.example.output,
  ]
    .filter((line) => line !== '')
    .join('\n');

  return (
    <div className="lesson-body">
      <h2>O que é</h2>
      <p>{lesson.what}</p>
      {lesson.basics.length > 0 ? (
        <>
          <h2>Palavras desta tarefa</h2>
          <dl className="terms">
            {lesson.basics.map((item) => (
              <div key={item.term}>
                <dt>{item.term}</dt>
                <dd>{item.meaning}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : null}
      <h2>Por que existe</h2>
      <p>{lesson.why}</p>
      <h2>Comparação</h2>
      <p>{lesson.analogy}</p>
      <h2>O que muda no repositório</h2>
      <p>{lesson.inside}</p>
      <h2>O comando, pedaço por pedaço</h2>
      <ol className="pieces">
        {lesson.breakdown.map((piece) => (
          <li key={`${piece.token}:${piece.meaning}`}>
            <code>{piece.token}</code> {piece.meaning}
          </li>
        ))}
      </ol>
      <h2>Exemplo</h2>
      <pre className="example" aria-label="Exemplo de comando e saída">
        {sample}
      </pre>
      <p>{lesson.example.meaning}</p>
      <h2>Erros comuns</h2>
      <ul className="mistakes">
        {lesson.mistakes.map((mistake) => (
          <li key={mistake}>{mistake}</li>
        ))}
      </ul>
    </div>
  );
}
