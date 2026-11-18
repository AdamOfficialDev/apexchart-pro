// setup.mjs
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const targetArg = process.argv[2];
const targetDir = targetArg ? path.resolve(process.cwd(), targetArg) : process.cwd();

function loadBundleContent() {
  const cwd = process.cwd();
  const singleBundle = path.join(cwd, 'bundle.txt');

  if (fs.existsSync(singleBundle)) {
    console.log('📦 Membaca bundle.txt...');
    return fs.readFileSync(singleBundle, 'utf8');
  }

  // Fallback otomatis membaca bundle-part1.txt, bundle-part2.txt, dst.
  const files = fs.readdirSync(cwd);
  const partFiles = files
    .filter((f) => /^bundle[-._]?part\d+\.txt$/i.test(f))
    .sort((a, b) => {
      const numA = Number(a.match(/(\d+)/)?.[1] ?? 0);
      const numB = Number(b.match(/(\d+)/)?.[1] ?? 0);
      return numA - numB;
    });

  if (partFiles.length > 0) {
    console.log(`📦 Membaca ${partFiles.length} file part: ${partFiles.join(', ')}`);
    return partFiles.map((f) => fs.readFileSync(path.join(cwd, f), 'utf8')).join('\n');
  }

  console.error('❌ File bundle.txt atau bundle-part*.txt tidak ditemukan di folder ini!');
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

function ensurePnpmAvailable() {
  try {
    const version = execSync('pnpm --version', { stdio: 'pipe' }).toString().trim();
    console.log(`✅ pnpm terdeteksi (v${version})`);
    return true;
  } catch {
    console.warn('⚠️  pnpm belum terinstall di sistem.');
    console.warn('   Jalankan: npm install -g pnpm   atau   corepack enable');
    return false;
  }
}

function main() {
  console.log('🚀 ApexChart Pro — Project Setup\n');
  const raw = loadBundleContent();
  const files = extractFiles(raw);

  if (files.length === 0) {
    console.error('❌ Tidak ada blok file valid (<<<=== FILE: ... ===>>>) di dalam bundle.');
    process.exit(1);
  }

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  console.log(`🛠️  Menulis ${files.length} file ke ${targetDir}...\n`);

  files.forEach((entry, idx) => {
    const fullPath = path.join(targetDir, entry.filePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, entry.content + '\n', 'utf8');
    console.log(`  [${idx + 1}/${files.length}] ✓ ${entry.filePath}`);
  });

  console.log('\n🎉 Semua file berhasil diekstrak!');

  const pkgPath = path.join(targetDir, 'package.json');
  if (!fs.existsSync(pkgPath)) {
    console.error('❌ package.json tidak ditemukan. Pastikan semua Part bundle sudah digabung.');
    process.exit(1);
  }

  if (ensurePnpmAvailable()) {
    console.log('\n📥 Menjalankan pnpm install...\n');
    try {
      execSync('pnpm install', { cwd: targetDir, stdio: 'inherit' });
      console.log('\n✨ Setup selesai! Jalankan perintah berikut untuk memulai:');
      if (targetArg) {
        console.log(`   cd ${targetArg}`);
      }
      console.log('   pnpm dev\n');
    } catch (err) {
      console.error('\n❌ Gagal menjalankan pnpm install:', err.message);
      process.exit(1);
    }
  }
}

main();