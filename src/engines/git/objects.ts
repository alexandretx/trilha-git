import { concatBytes, encodeUtf8, sha1, toHex } from './hash';

export const AUTHOR_NAME = 'Estudante';
export const AUTHOR_EMAIL = 'estudante@trilha.local';
export const AUTHOR = `${AUTHOR_NAME} <${AUTHOR_EMAIL}>`;
export const TIMEZONE = '-0300';

export interface ObjectId {
  oid: string;
  raw: Uint8Array;
}

export function hashGitObject(type: 'blob' | 'tree' | 'commit', payload: Uint8Array): ObjectId {
  const header = encodeUtf8(`${type} ${payload.length}\0`);
  const digest = sha1(concatBytes([header, payload]));
  return { oid: toHex(digest), raw: digest };
}

export function hashBlob(content: string): ObjectId {
  return hashGitObject('blob', encodeUtf8(content));
}

interface DirNode {
  kind: 'dir';
  kids: Map<string, TreeNode>;
}

interface FileNode {
  kind: 'file';
  raw: Uint8Array;
}

type TreeNode = DirNode | FileNode;

function hashDirectory(node: DirNode): ObjectId {
  const names = [...node.kids.keys()].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  const parts: Uint8Array[] = [];
  for (const name of names) {
    const child = node.kids.get(name);
    if (!child) continue;
    if (child.kind === 'file') {
      parts.push(encodeUtf8(`100644 ${name}\0`), child.raw);
    } else {
      const sub = hashDirectory(child);
      parts.push(encodeUtf8(`40000 ${name}\0`), sub.raw);
    }
  }
  return hashGitObject('tree', concatBytes(parts));
}

export function hashTree(files: Record<string, string>): ObjectId {
  const root: DirNode = { kind: 'dir', kids: new Map() };
  for (const [path, content] of Object.entries(files)) {
    const blob = hashBlob(content);
    const segments = path.split('/');
    let dir = root;
    for (let index = 0; index < segments.length - 1; index += 1) {
      const name = segments[index];
      if (!name) throw new Error(`caminho inválido: ${path}`);
      const existing = dir.kids.get(name);
      if (existing?.kind === 'file') throw new Error(`caminho inválido: ${path}`);
      const next: DirNode = existing ?? { kind: 'dir', kids: new Map() };
      dir.kids.set(name, next);
      dir = next;
    }
    const fileName = segments[segments.length - 1];
    if (!fileName) throw new Error(`caminho inválido: ${path}`);
    dir.kids.set(fileName, { kind: 'file', raw: blob.raw });
  }
  return hashDirectory(root);
}

export function hashCommit(input: {
  tree: string;
  parents: readonly string[];
  author: string;
  timestamp: number;
  message: string;
}): ObjectId {
  const ident = `${input.author} ${input.timestamp} ${TIMEZONE}`;
  let text = `tree ${input.tree}\n`;
  for (const parent of input.parents) text += `parent ${parent}\n`;
  text += `author ${ident}\n`;
  text += `committer ${ident}\n`;
  text += '\n';
  text += input.message.endsWith('\n') ? input.message : `${input.message}\n`;
  return hashGitObject('commit', encodeUtf8(text));
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export function formatGitDate(unixSeconds: number): string {
  const shifted = new Date((unixSeconds - 3 * 3600) * 1000);
  const weekday = WEEKDAYS[shifted.getUTCDay()] ?? 'Sun';
  const month = MONTHS[shifted.getUTCMonth()] ?? 'Jan';
  const day = String(shifted.getUTCDate()).padStart(2, ' ');
  const pad = (value: number) => String(value).padStart(2, '0');
  const time = `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}:${pad(shifted.getUTCSeconds())}`;
  return `${weekday} ${month} ${day} ${time} ${shifted.getUTCFullYear()} ${TIMEZONE}`;
}
