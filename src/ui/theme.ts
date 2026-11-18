import { useEffect, useState } from 'react';

const THEME_KEY = 'trilha-git.theme';

export type ThemeName = 'light' | 'dark';

function currentTheme(): ThemeName {
  const preset = document.documentElement.dataset.theme;
  if (preset === 'light' || preset === 'dark') return preset;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useTheme(): { theme: ThemeName; toggle: () => void } {
  const [theme, setTheme] = useState<ThemeName>(currentTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', theme === 'dark' ? '#141311' : '#f3efe6');
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch {
      // A private window can refuse storage. The theme still applies for this visit.
    }
  }, [theme]);

  return {
    theme,
    toggle: () => setTheme((value) => (value === 'dark' ? 'light' : 'dark')),
  };
}
