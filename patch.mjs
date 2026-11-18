// patch.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

function loadPatchContent() {
  const cwd = process.cwd();
  const candidates = ['v42-bundle.txt', 'v41-bundle.txt', 'v4-bundle.txt'];
  for (const name of candidates) {
    const p = path.join(cwd, name);
    if (fs.existsSync(p)) {
      console.log(`📦 Membaca ${name}...`);
      return fs.readFileSync(p, 'utf8');
    }
  }

  const files = fs.readdirSync(cwd);
  const prefixes = [
    /^v42[-._]?part\d+\.txt$/i,
    /^v41[-._]?part\d+\.txt$/i,
    /^v4[-._]?part\d+\.txt$/i,
  ];
  for (const regex of prefixes) {
    const matched = files
      .filter((f) => regex.test(f))
      .sort((a, b) => Number(a.match(/(\d+)/)?.[1] ?? 0) - Number(b.match(/(\d+)/)?.[1] ?? 0));
    if (matched.length > 0) {
      console.log(`📦 Membaca ${matched.length} file part: ${matched.join(', ')}`);
      return matched.map((f) => fs.readFileSync(path.join(cwd, f), 'utf8')).join('\n');
    }
  }

  console.error('❌ File v42-part*.txt tidak ditemukan!');
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

  console.log('🔧 ApexChart Pro V4.2 — Applying Live Clock & UX Fix...\n');
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
    console.log('\n✅ V4.2 Patch berhasil diterapkan & lolos TypeScript check!');
  } catch {
    console.warn('\n⚠️  Typecheck selesai dengan peringatan/error. Cek output di atas.');
  }

  console.log('\n🔥 Jalankan `pnpm dev` lalu refresh!\n');
}

main();