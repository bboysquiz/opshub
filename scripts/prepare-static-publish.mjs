import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const [, , targetDirArg, ...restArgs] = process.argv;

if (!targetDirArg) {
  console.error(
    'Usage: node scripts/prepare-static-publish.mjs <target-dir> [source-dir...] [--spa]',
  );
  process.exit(1);
}

const flags = new Set(restArgs.filter((arg) => arg.startsWith('--')));
const sourceDirArgs = restArgs.filter((arg) => !arg.startsWith('--'));
const targetDir = path.resolve(process.cwd(), targetDirArg);
const candidateDirs = [targetDirArg, ...sourceDirArgs]
  .map((dir) => path.resolve(process.cwd(), dir))
  .filter((dir, index, dirs) => dirs.indexOf(dir) === index);

const sourceDir = candidateDirs.find((dir) => existsSync(path.join(dir, 'index.html')));

if (!sourceDir) {
  console.error(
    `[netlify] no generated index.html found in: ${candidateDirs
      .map((dir) => path.relative(process.cwd(), dir) || '.')
      .join(', ')}`,
  );
  process.exit(1);
}

if (sourceDir !== targetDir) {
  await rm(targetDir, { recursive: true, force: true });
  await cp(sourceDir, targetDir, { recursive: true });
  console.log(
    `[netlify] copied static output from ${path.relative(process.cwd(), sourceDir)} to ${path.relative(
      process.cwd(),
      targetDir,
    )}`,
  );
}

const apiProxyUrl = (
  process.env.NETLIFY_API_PROXY_URL?.trim() ||
  process.env.API_PROXY_URL?.trim() ||
  'https://opshub-api.netlify.app'
).replace(/\/+$/, '');
const lines = [`/api/* ${apiProxyUrl}/:splat 200!`];

if (flags.has('--spa')) {
  lines.push('/* /index.html 200');
}

await mkdir(targetDir, { recursive: true });
await writeFile(path.join(targetDir, '_redirects'), `${lines.join('\n')}\n`, 'utf8');

console.log(`[netlify] prepared static publish directory ${path.relative(process.cwd(), targetDir)}`);
console.log(`[netlify] /api/* -> ${apiProxyUrl}/:splat`);
