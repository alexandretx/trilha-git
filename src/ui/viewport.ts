import { useEffect } from 'react';

export function useViewportHeight(): void {
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const viewport = window.visualViewport;
      const height = viewport?.height ?? window.innerHeight;
      const offset = viewport?.offsetTop ?? 0;
      root.style.setProperty('--vv-height', `${height}px`);
      root.style.setProperty('--vv-offset', `${offset}px`);
      root.dataset.keyboard = window.innerHeight - height > 80 ? 'open' : 'closed';
    };
    apply();
    const viewport = window.visualViewport;
    viewport?.addEventListener('resize', apply);
    viewport?.addEventListener('scroll', apply);
    window.addEventListener('resize', apply);
    return () => {
      viewport?.removeEventListener('resize', apply);
      viewport?.removeEventListener('scroll', apply);
      window.removeEventListener('resize', apply);
      root.style.removeProperty('--vv-height');
      root.style.removeProperty('--vv-offset');
    };
  }, []);
}
