#!/usr/bin/env node

import { promises as fs } from 'fs';
import { spawn } from 'child_process';
import path from 'path';
import url from 'url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const repoRoot = __dirname;
const extensionDir = path.join(repoRoot, 'extension');
const distDir = path.join(repoRoot, 'dist');
const buildDir = path.join(distDir, 'scroll-resistance-trainer');
const zipPath = path.join(distDir, 'scroll-resistance-trainer.zip');

async function ensureCleanDist() {
  await fs.rm(distDir, { recursive: true, force: true });
  await fs.mkdir(buildDir, { recursive: true });
}

async function copyDirectory(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  const entries = await fs.readdir(src, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        await copyDirectory(srcPath, destPath);
      } else if (entry.isFile()) {
        await fs.copyFile(srcPath, destPath);
      }
    })
  );
}

async function zipBuildDirectory() {
  return new Promise((resolve, reject) => {
    const zipArgs = ['-r', '-q', zipPath, '.'];
    const child = spawn('zip', zipArgs, { cwd: buildDir, stdio: 'inherit' });

    child.on('error', (error) => {
      reject(error);
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`zip command exited with code ${code}`));
      }
    });
  });
}

async function main() {
  try {
    await ensureCleanDist();
    await copyDirectory(extensionDir, buildDir);
    await zipBuildDirectory();
    console.log(`Extension packaged at ${zipPath}`);
  } catch (error) {
    console.error('Failed to build extension:', error);
    process.exitCode = 1;
  }
}

await main();
