// Build: copy src/ to dist/, inline lib.js into index.html, zip dist/ flat into release/.
// No dependencies; uses the system `zip` command.
import { readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
const dist = join(root, 'dist');
const manifest = JSON.parse(readFileSync(join(src, 'manifest.json'), 'utf8'));
const zipName = `daily-report-${manifest.version}.zip`;

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

const marker = '<!-- @inline lib.js -->';
const html = readFileSync(join(src, 'index.html'), 'utf8');
if (!html.includes(marker)) throw new Error(`index.html is missing "${marker}"`);
const lib = readFileSync(join(src, 'lib.js'), 'utf8');
if (lib.includes('</script')) throw new Error('lib.js must not contain "</script"');
writeFileSync(join(dist, 'index.html'), html.replace(marker, () => `<script>\n${lib}</script>`));

for (const f of ['manifest.json', 'plugin.js', 'icon.svg']) copyFileSync(join(src, f), join(dist, f));

mkdirSync(join(root, 'release'), { recursive: true });
const zipPath = join(root, 'release', zipName);
rmSync(zipPath, { force: true });
execFileSync('zip', ['-q', '-X', '-r', zipPath, 'manifest.json', 'plugin.js', 'index.html', 'icon.svg'], { cwd: dist });
console.log(`Built ${zipPath}`);
