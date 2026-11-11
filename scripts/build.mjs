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
const jsonMarker = '/* @inline-json i18n/en.json */ {}';
if (!html.includes(jsonMarker)) throw new Error(`index.html is missing "${jsonMarker}"`);
const en = JSON.stringify(JSON.parse(readFileSync(join(src, 'i18n', 'en.json'), 'utf8')));
writeFileSync(
  join(dist, 'index.html'),
  html.replace(marker, () => `<script>\n${lib}</script>`).replace(jsonMarker, () => en),
);

mkdirSync(join(dist, 'i18n'));
for (const lang of manifest.i18n?.languages ?? []) {
  const f = join(src, 'i18n', `${lang}.json`);
  JSON.parse(readFileSync(f, 'utf8')); // fail the build on invalid JSON
  copyFileSync(f, join(dist, 'i18n', `${lang}.json`));
}

for (const f of ['manifest.json', 'plugin.js', 'icon.svg']) copyFileSync(join(src, f), join(dist, f));

mkdirSync(join(root, 'release'), { recursive: true });
const zipPath = join(root, 'release', zipName);
rmSync(zipPath, { force: true });
execFileSync('zip', ['-q', '-X', '-r', zipPath, 'manifest.json', 'plugin.js', 'index.html', 'icon.svg', 'i18n'], { cwd: dist });
console.log(`Built ${zipPath}`);
