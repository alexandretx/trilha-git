try {
  var saved = localStorage.getItem('trilha-git.theme');
  var theme = saved === 'light' || saved === 'dark' ? saved : null;
  if (!theme) {
    theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.dataset.theme = theme;
  var color = document.querySelector('meta[name="theme-color"]');
  if (color) color.setAttribute('content', theme === 'dark' ? '#141311' : '#f3efe6');
} catch {
  document.documentElement.dataset.theme = 'light';
}
