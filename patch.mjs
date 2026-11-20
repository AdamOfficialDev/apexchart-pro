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
  const argFile = process.argv[2];
  if (argFile) {
    const p = path.resolve(cwd, argFile);
    if (!fs.existsSync(p)) {
      console.error(`❌ File ${argFile} tidak ditemukan!`);
      process.exit(1);
    }
    console.log(`📦 Membaca ${argFile}...`);
    return fs.readFileSync(p, 'utf8');
  }

  const candidates = ['v51-patch.txt', 'v5-bundle.txt', 'v42-bundle.txt', 'v41-bundle.txt'];
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

  console.error('❌ File patch tidak ditemukan!');
  process.exit(1);
}

function applyFullFiles(cwd, normalized) {
  const fileRegex =
    /<<<===\s*FILE:\s*(.+?)\s*===>>>[ \t]*\n([\s\S]*?)\n<<<===\s*END FILE\s*===>>>/g;
  let count = 0;
  let match;
  while ((match = fileRegex.exec(normalized)) !== null) {
    const filePath = match[1].trim();
    const content = match[2];
    const fullPath = path.join(cwd, filePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    const existed = fs.existsSync(fullPath);
    fs.writeFileSync(fullPath, content + '\n', 'utf8');
    count++;
    console.log(`  ${existed ? '↻ Updated' : '+ Created'} ${filePath}`);
  }
  return count;
}

function applySurgicalPatches(cwd, normalized) {
  const patchRegex =
    /<<<===\s*PATCH:\s*(.+?)\s*===>>>[ \t]*\n([\s\S]*?)\n<<<===\s*END PATCH\s*===>>>/g;
  const hunkRegex =
    /<<<---\s*FIND\s*--->>>[ \t]*\n([\s\S]*?)\n<<<---\s*REPLACE\s*--->>>[ \t]*\n([\s\S]*?)<<<---\s*END HUNK\s*--->>>/g;

  let totalFiles = 0;
  let patchMatch;
  while ((patchMatch = patchRegex.exec(normalized)) !== null) {
    const relPath = patchMatch[1].trim();
    const body = patchMatch[2];
    const fullPath = path.join(cwd, relPath);

    if (!fs.existsSync(fullPath)) {
      console.error(`  ❌ File target tidak ditemukan: ${relPath}`);
      continue;
    }

    let source = fs.readFileSync(fullPath, 'utf8').replace(/\r\n/g, '\n');
    let hunkMatch;
    let applied = 0;
    let failed = 0;

    hunkRegex.lastIndex = 0;
    while ((hunkMatch = hunkRegex.exec(body)) !== null) {
      const findStr = hunkMatch[1];
      const replaceStr = hunkMatch[2].replace(/\n$/, '');

      if (source.includes(findStr)) {
        source = source.replace(findStr, replaceStr);
        applied++;
      } else {
        failed++;
        console.warn(`  ⚠️  Hunk tidak cocok di ${relPath}:\n     ${findStr.slice(0, 70)}...`);
      }
    }

    fs.writeFileSync(fullPath, source, 'utf8');
    totalFiles++;
    console.log(
      `  ✓ Patched ${relPath} (${applied} hunk berhasil${failed ? `, ${failed} gagal` : ''})`
    );
  }
  return totalFiles;
}

function main() {
  const cwd = process.cwd();
  if (!fs.existsSync(path.join(cwd, 'package.json'))) {
    console.error('❌ Jalankan patch.mjs di dalam root folder project (yang ada package.json).');
    process.exit(1);
  }

  console.log('🔧 ApexChart Pro — Applying Patch...\n');
  const normalized = loadPatchContent().replace(/\r\n/g, '\n');

  const fullCount = applyFullFiles(cwd, normalized);
  const patchCount = applySurgicalPatches(cwd, normalized);

  if (fullCount === 0 && patchCount === 0) {
    console.error('❌ Tidak ada blok FILE atau PATCH valid yang ditemukan.');
    process.exit(1);
  }

  console.log('\n🔍 Memeriksa TypeScript via pnpm typecheck...');
  try {
    execSync('pnpm typecheck', { cwd, stdio: 'inherit' });
    console.log('\n✅ Patch berhasil diterapkan & lolos TypeScript check!');
  } catch {
    console.warn('\n⚠️  Typecheck selesai dengan error. Cek output di atas.');
  }

  console.log('\n🔥 Jalankan `pnpm dev`!\n');
}

main();