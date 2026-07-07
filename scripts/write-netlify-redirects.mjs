import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const [, , publishDirArg, ...flags] = process.argv;

if (!publishDirArg) {
  console.error('Usage: node scripts/write-netlify-redirects.mjs <publish-dir> [--spa]');
  process.exit(1);
}

const publishDir = path.resolve(process.cwd(), publishDirArg);
const apiProxyUrl = (
  process.env.NETLIFY_API_PROXY_URL?.trim() ||
  process.env.API_PROXY_URL?.trim() ||
  'https://opshub-api.netlify.app'
).replace(/\/+$/, '');
const includeSpaFallback = flags.includes('--spa');

const lines = [`/api/* ${apiProxyUrl}/:splat 200!`];

if (includeSpaFallback) {
  lines.push('/* /index.html 200');
}

await mkdir(publishDir, { recursive: true });
await writeFile(path.join(publishDir, '_redirects'), `${lines.join('\n')}\n`, 'utf8');

console.log(`[netlify] wrote redirects to ${path.relative(process.cwd(), publishDir) || '.'}`);
console.log(`[netlify] /api/* -> ${apiProxyUrl}/:splat`);
