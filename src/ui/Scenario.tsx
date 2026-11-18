import { useEffect, useRef, useState } from 'react';

interface ScenarioProps {
  text: string;
}

function scenarioIsCut(node: HTMLElement): boolean {
  const rect = node.getBoundingClientRect();
  if (rect.height === 0) return false;
  const view = window.visualViewport?.height ?? window.innerHeight;
  if (rect.bottom > view - 4 || rect.top < 0) return true;
  if (node.scrollHeight > node.clientHeight + 1) return true;
  let parent = node.parentElement;
  while (parent) {
    const style = getComputedStyle(parent);
    const overflow = style.overflowY;
    if (overflow === 'auto' || overflow === 'hidden' || overflow === 'scroll') {
      const box = parent.getBoundingClientRect();
      if (rect.top < box.top - 1 || rect.bottom > box.bottom + 1) return true;
    }
    parent = parent.parentElement;
  }
  return false;
}

export function Scenario({ text }: ScenarioProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const chosen = useRef(false);
  const [open, setOpen] = useState(true);
  const [cut, setCut] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || chosen.current || !open) return;
    if (scenarioIsCut(node)) {
      setOpen(false);
      setCut(true);
    }
  }, [open, text]);

  function toggle() {
    chosen.current = true;
    setOpen((value) => !value);
    setCut(true);
  }

  return (
    <div className="scenario-block">
      <p ref={ref} id="enunciado" className={open ? 'scenario' : 'scenario is-folded'}>
        {text}
      </p>
      {cut ? (
        <button
          className="btn scenario-toggle"
          type="button"
          aria-expanded={open}
          aria-controls="enunciado"
          onClick={toggle}
        >
          {open ? 'Recolher enunciado' : 'Mostrar o enunciado inteiro'}
        </button>
      ) : null}
    </div>
  );
}
