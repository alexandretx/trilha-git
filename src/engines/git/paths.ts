const MAX_PATH = 240;

export function normalizePath(input: string): string | null {
  if (!input || input.length > MAX_PATH || input.includes('\0')) return null;
  if (input.startsWith('/') || input.startsWith('~')) return null;
  const segments = input.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..'))
    return null;
  return segments.join('/');
}

export function parentPath(path: string): string {
  const slash = path.lastIndexOf('/');
  return slash === -1 ? '' : path.slice(0, slash);
}

export function baseName(path: string): string {
  const slash = path.lastIndexOf('/');
  return slash === -1 ? path : path.slice(slash + 1);
}

export function isInside(path: string, dir: string): boolean {
  return path === dir || path.startsWith(`${dir}/`);
}
