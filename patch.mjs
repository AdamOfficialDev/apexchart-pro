// patch.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

function getPartNumber(filename) {
  const m = filename.match(/part(\d+)/i);
  if (m) return Number(m[1]);
  const fallback = filename.match(/(\d+)/);
  return fallback ? Number(fallback[1]) : 0;
}

function loadPatchContent() {
  const cwd = process.cwd();
  const candidates = ['v5-bundle.txt', 'v42-bundle.txt', 'v41-bundle.txt'];
  for (const name of candidates) {
    const p = path.join(cwd, name);
    if (fs.existsSync(p)) {
      console.log(`📦 Membaca ${name}...`);
      return fs.readFileSync(p, 'utf8');
    }
  }

  const files = fs.readdirSync(cwd);
  const prefixes = [
    /^v5[-._]?part\d+\.txt$/i,
    /^v42[-._]?part\d+\.txt$/i,
    /^v41[-._]?part\d+\.txt$/i,
    /^v4[-._]?part\d+\.txt$/i,
  ];
  for (const regex of prefixes) {
    const matched = files
      .filter((f) => regex.test(f))
      .sort((a, b) => getPartNumber(a) - getPartNumber(b));
    if (matched.length > 0) {
      console.log(`📦 Membaca ${matched.length} file part: ${matched.join(', ')}`);
      return matched.map((f) => fs.readFileSync(path.join(cwd, f), 'utf8')).join('\n');
    }
  }

  console.error('❌ File part patch tidak ditemukan!');
  process.exit(1);
}

function extractFiles(rawContent) {
  const normalized = rawContent.replace(/\r\n/g, '\n');
  const fileRegex =
    /<<<===\s*FILE:\s*(.+?)\s*===>>>[ \t]*\n([\s\S]*?)\n<<<===\s*END FILE\s*===>>>/g;

  const entries = [];
  let match;
  while ((match = fileRegex.exec(normalized)) !== null) {
    entries.push({
      filePath: match[1].trim(),
      content: match[2],
    });
  }
  return entries;
}

function main() {
  const cwd = process.cwd();
  if (!fs.existsSync(path.join(cwd, 'package.json'))) {
    console.error('❌ Jalankan patch.mjs di dalam root folder project (yang ada package.json).');
    process.exit(1);
  }

  console.log('🔧 ApexChart Pro — Applying Patch...\n');
  const raw = loadPatchContent();
  const entries = extractFiles(raw);

  if (entries.length === 0) {
    console.error('❌ Tidak ada blok file valid di dalam bundle.');
    process.exit(1);
  }

  entries.forEach((entry, idx) => {
    const fullPath = path.join(cwd, entry.filePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const existed = fs.existsSync(fullPath);
    fs.writeFileSync(fullPath, entry.content + '\n', 'utf8');
    console.log(
      `  [${idx + 1}/${entries.length}] ${existed ? '↻ Updated' : '+ Created'} ${entry.filePath}`
    );
  });

  console.log('\n🔍 Memeriksa TypeScript via pnpm typecheck...');
  try {
    execSync('pnpm typecheck', { cwd, stdio: 'inherit' });
    console.log('\n✅ Patch berhasil diterapkan & lolos TypeScript check!');
  } catch {
    console.warn('\n⚠️  Typecheck selesai dengan peringatan/error. Cek output di atas.');
  }

  console.log('\n🔥 Jalankan `pnpm dev`!\n');
}

main();