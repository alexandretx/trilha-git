import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';

export interface TerminalLine {
  kind: 'info' | 'cmd' | 'out' | 'err';
  text: string;
}

interface TerminalProps {
  lines: readonly TerminalLine[];
  onSubmit: (command: string) => void;
}

export function Terminal({ lines, onSubmit }: TerminalProps) {
  const [value, setValue] = useState('');
  const [past, setPast] = useState<string[]>([]);
  const [cursor, setCursor] = useState(-1);
  const logRef = useRef<HTMLPreElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    log.scrollTop = log.scrollHeight;
  }, [lines]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const command = value.trim();
    if (!command) return;
    onSubmit(command);
    setPast((items) => [...items, command]);
    setCursor(-1);
    setValue('');
    inputRef.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    if (past.length === 0) return;
    const next =
      event.key === 'ArrowUp'
        ? cursor === -1
          ? past.length - 1
          : Math.max(0, cursor - 1)
        : cursor === -1
          ? -1
          : cursor + 1;
    if (next >= past.length || next < 0) {
      setCursor(-1);
      setValue('');
      return;
    }
    const command = past[next];
    if (command === undefined) return;
    setCursor(next);
    setValue(command);
  }

  return (
    <section className="terminal" aria-label="Terminal">
      <pre ref={logRef} className="terminal-log" aria-live="polite">
        {lines.map((line, index) => (
          <span key={index} className={`term-line term-${line.kind}`}>
            {line.kind === 'cmd' ? <span className="prompt">$ </span> : null}
            {line.text}
            {'\n'}
          </span>
        ))}
      </pre>
      <form className="command-form" onSubmit={submit}>
        <label htmlFor="comando">Comando</label>
        <input
          ref={inputRef}
          id="comando"
          name="comando"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={onKeyDown}
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
          autoComplete="off"
        />
        <button className="btn primary" type="submit">
          Executar
        </button>
      </form>
    </section>
  );
}
