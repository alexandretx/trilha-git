import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

interface HeaderRule {
  source: string;
  headers: { key: string; value: string }[];
}

const config = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8')) as {
  headers: HeaderRule[];
  rewrites?: unknown;
};

function rule(source: string): HeaderRule {
  const found = config.headers.find((item) => item.source === source);
  if (!found) throw new Error(source);
  return found;
}

function header(source: string, key: string): string {
  const found = rule(source).headers.find((item) => item.key === key);
  if (!found) throw new Error(`${source} ${key}`);
  return found.value;
}

describe('vercel headers', () => {
  it('sends a same-origin policy the service worker can live with', () => {
    const csp = header('/(.*)', 'Content-Security-Policy');
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("worker-src 'self'");
    expect(csp).toContain("style-src 'self'");
    expect(csp).toContain("style-src-attr 'unsafe-inline'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).not.toContain('unsafe-eval');
    expect(csp.split("style-src-attr 'unsafe-inline'").join('')).not.toContain('unsafe-inline');
    expect(header('/(.*)', 'X-Content-Type-Options')).toBe('nosniff');
    expect(header('/(.*)', 'Referrer-Policy')).toBe('strict-origin-when-cross-origin');
    expect(header('/(.*)', 'X-Frame-Options')).toBe('DENY');
    expect(header('/(.*)', 'Strict-Transport-Security')).toContain('max-age=63072000');
    expect(header('/(.*)', 'Strict-Transport-Security')).toContain('includeSubDomains');
    expect(header('/(.*)', 'Permissions-Policy')).toContain('camera=()');
    expect(header('/(.*)', 'Permissions-Policy')).toContain('microphone=()');
    expect(header('/(.*)', 'Permissions-Policy')).toContain('geolocation=()');
  });

  it('caches hashed files and revalidates the shell', () => {
    const immutable = 'public, max-age=31536000, immutable';
    expect(header('/assets/(.*)', 'Cache-Control')).toBe(immutable);
    expect(header('/workbox-(.*)', 'Cache-Control')).toBe(immutable);
    for (const source of [
      '/',
      '/index.html',
      '/sw.js',
      '/registerSW.js',
      '/theme-init.js',
      '/manifest.webmanifest',
    ]) {
      expect(header(source, 'Cache-Control')).toBe('no-cache');
    }
  });

  it('does not rewrite paths, because navigation uses the hash', () => {
    expect(config.rewrites).toBeUndefined();
  });
});
