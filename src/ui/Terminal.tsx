import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import {
  completeCommand,
  insertToken,
  recallHistory,
  TOKEN_SHORTCUTS,
  type TokenShortcut,
} from './command-line';

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
  const draftRef = useRef('');
  const caretRef = useRef<number | null>(null);
  const logRef = useRef<HTMLPreElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const log = logRef.current;
    if (!log) return;
    log.scrollTop = log.scrollHeight;
  }, [lines]);

  useEffect(() => {
    const input = inputRef.current;
    const caret = caretRef.current;
    if (!input || caret === null) return;
    caretRef.current = null;
    input.focus();
    input.setSelectionRange(caret, caret);
  }, [value]);

  function applyEdit(next: { value: string; cursor: number }) {
    caretRef.current = next.cursor;
    setValue(next.value);
    setCursor(-1);
    draftRef.current = next.value;
  }

  function insert(token: TokenShortcut) {
    const input = inputRef.current;
    const start = input?.selectionStart ?? value.length;
    const end = input?.selectionEnd ?? value.length;
    applyEdit(insertToken(value, start, end, token.text, token.cursor));
  }

  function complete() {
    const next = completeCommand(value);
    if (next) applyEdit(next);
  }

  function recall(direction: 'older' | 'newer') {
    if (cursor === -1) draftRef.current = value;
    const next = recallHistory(past, cursor, direction, draftRef.current);
    caretRef.current = next.value.length;
    setCursor(next.cursor);
    setValue(next.value);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const command = value.trim();
    if (!command) return;
    onSubmit(command);
    setPast((items) => [...items, command]);
    setCursor(-1);
    draftRef.current = '';
    setValue('');
    inputRef.current?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      recall(event.key === 'ArrowUp' ? 'older' : 'newer');
      return;
    }
    if (event.key === 'Tab' && !event.shiftKey) {
      const next = completeCommand(value);
      if (!next) return;
      event.preventDefault();
      applyEdit(next);
    }
  }

  const canComplete = completeCommand(value) !== null;

  return (
    <section className="terminal" aria-label="Terminal">
      <pre
        ref={logRef}
        className="terminal-log"
        role="log"
        tabIndex={0}
        aria-label="Saída do terminal"
      >
        {lines.map((line, index) => (
          <span key={index} className={`term-line term-${line.kind}`}>
            {line.kind === 'cmd' ? <span className="prompt">$ </span> : null}
            {line.text}
            {'\n'}
          </span>
        ))}
      </pre>
      <p id="comando-ajuda" className="command-help">
        Tab completa o comando. Seta para cima e para baixo percorrem o histórico.
      </p>
      <div className="keys">
        {TOKEN_SHORTCUTS.map((token) => (
          <button
            key={token.id}
            className="btn key"
            type="button"
            aria-label={token.description}
            onPointerDown={(event) => event.preventDefault()}
            onClick={() => insert(token)}
          >
            {token.label}
          </button>
        ))}
        <button
          className="btn key"
          type="button"
          aria-label="Tab: completar comando"
          onPointerDown={(event) => event.preventDefault()}
          onClick={complete}
          disabled={!canComplete}
        >
          Tab
        </button>
        <button
          className="btn key"
          type="button"
          aria-label="Comando anterior"
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => recall('older')}
          disabled={past.length === 0}
        >
          Anterior
        </button>
        <button
          className="btn key"
          type="button"
          aria-label="Comando seguinte"
          onPointerDown={(event) => event.preventDefault()}
          onClick={() => recall('newer')}
          disabled={cursor < 0}
        >
          Seguinte
        </button>
      </div>
      <form className="command-form" onSubmit={submit}>
        <label htmlFor="comando">Comando</label>
        <input
          ref={inputRef}
          id="comando"
          name="comando"
          value={value}
          aria-describedby="comando-ajuda"
          onChange={(event) => {
            const next = event.target.value;
            setValue(next);
            setCursor(-1);
            draftRef.current = next;
          }}
          onKeyDown={onKeyDown}
          onFocus={(event) => {
            const field = event.currentTarget;
            if (typeof field.scrollIntoView === 'function') {
              field.scrollIntoView({ block: 'nearest' });
            }
          }}
          autoCapitalize="none"
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
