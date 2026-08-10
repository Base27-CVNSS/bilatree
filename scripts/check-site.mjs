import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const site = resolve(root, 'site');
const requiredFiles = [
  'index.html',
  'styles.css',
  'app.js',
  'assets/favicon.svg',
  'assets/logo.svg',
  'assets/social-preview.png',
  'manifest.webmanifest',
  'robots.txt',
  'sitemap.xml',
  '.nojekyll',
];

const errors = [];
for (const file of requiredFiles) {
  if (!existsSync(resolve(site, file))) errors.push(`Thiếu tệp: site/${file}`);
}

const html = readFileSync(resolve(site, 'index.html'), 'utf8');
const requiredHtml = [
  '<html lang="vi"',
  '<title>BilaTree',
  'rel="canonical" href="https://base27-cvnss.github.io/bilatree/"',
  'property="og:title"',
  'property="og:image"',
  'name="twitter:card"',
  'rel="manifest" href="./manifest.webmanifest"',
  'src="./app.js"',
  'href="./styles.css"',
];

for (const fragment of requiredHtml) {
  if (!html.includes(fragment)) errors.push(`index.html thiếu: ${fragment}`);
}

if (/<(?:title|meta)[^>]*(?:content=""|<title>\s*<\/title>)/i.test(html)) {
  errors.push('index.html còn metadata rỗng.');
}

const localRefs = [...html.matchAll(/(?:href|src)="\.\/([^"#?]+)"/g)].map((match) => match[1]);
for (const ref of new Set(localRefs)) {
  if (!existsSync(resolve(site, ref))) errors.push(`Liên kết nội bộ không tồn tại: site/${ref}`);
}

const manifest = JSON.parse(readFileSync(resolve(site, 'manifest.webmanifest'), 'utf8'));
if (manifest.lang !== 'vi') errors.push('manifest.webmanifest phải khai báo lang=vi.');
if (!Array.isArray(manifest.icons) || manifest.icons.length < 1) {
  errors.push('manifest.webmanifest cần tối thiểu một icon.');
}

const app = readFileSync(resolve(site, 'app.js'), 'utf8');
for (const feature of ['localStorage', 'BroadcastChannel', 'renderTree', 'FORBIDDEN_KEYS']) {
  if (!app.includes(feature)) errors.push(`Demo thiếu tính năng bắt buộc: ${feature}`);
}

if (errors.length) {
  console.error(`Kiểm tra website thất bại (${errors.length} lỗi):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`✓ Website BilaTree hợp lệ: ${requiredFiles.length} tệp bắt buộc, ${new Set(localRefs).size} liên kết nội bộ.`);
