const INTRO_KEY = 'trilha-git.intro.v1';

export function introSeen(): boolean {
  try {
    return localStorage.getItem(INTRO_KEY) === '1';
  } catch {
    return true;
  }
}

export function rememberIntro(): void {
  try {
    localStorage.setItem(INTRO_KEY, '1');
  } catch {
    // The screen still closes for this visit.
  }
}
