import { readdirSync, readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const dist = new URL('../dist/', import.meta.url);
const html = readFileSync(new URL('index.html', dist), 'utf8');
const match = html.match(/src="(\/assets\/[^"]+\.js)"/);
if (!match?.[1]) {
  console.error('dist/index.html has no module script.');
  process.exit(1);
}

const entryName = match[1].slice(1);
const entry = readFileSync(new URL(entryName, dist));
const entryGzip = gzipSync(entry).length;
const marker = 'not a git repository';
if (entry.includes(marker)) {
  console.error('The initial bundle includes the Git engine.');
  process.exit(1);
}

const others = readdirSync(new URL('assets/', dist)).filter(
  (name) => name.endsWith('.js') && `assets/${name}` !== entryName,
);
const engineChunk = others
  .map((name) => ({ name, bytes: readFileSync(new URL(`assets/${name}`, dist)) }))
  .find((file) => file.bytes.includes(marker));
if (!engineChunk) {
  console.error('No lazy chunk includes the Git engine.');
  process.exit(1);
}

const taskGzip = gzipSync(engineChunk.bytes).length;
const entryLimit = 100 * 1024;
const taskLimit = 40 * 1024;
console.log(`entry ${entryName} gzip ${entryGzip}`);
console.log(`engine ${engineChunk.name} gzip ${taskGzip}`);
if (entryGzip > entryLimit || taskGzip > taskLimit) {
  console.error(`Bundle over budget. Entry limit ${entryLimit}, engine chunk limit ${taskLimit}.`);
  process.exit(1);
}
