#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

const RUNTIME_ENTRIES = [
  'index.html',
  'css',
  'js',
  'assets',
  'handoff'
];

async function rmIfExists(targetPath) {
  await fs.rm(targetPath, { recursive: true, force: true });
}

async function copyRuntimeEntry(entry) {
  const source = path.join(ROOT_DIR, entry);
  const target = path.join(DIST_DIR, entry);
  await fs.cp(source, target, { recursive: true });
}

async function main() {
  await rmIfExists(DIST_DIR);
  await fs.mkdir(DIST_DIR, { recursive: true });

  for (const entry of RUNTIME_ENTRIES) {
    await copyRuntimeEntry(entry);
  }

  console.log(`Prepared Cloudflare Pages bundle in ${DIST_DIR}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
