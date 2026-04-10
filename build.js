#!/usr/bin/env node

/**
 * Build script for Backlog Copy Helper Chrome Extension
 * Creates a zip file ready for Chrome Web Store upload
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const EXTENSION_NAME = 'backlog-copy-helper';
const BUILD_DIR = 'build';

function getVersion() {
  const manifestPath = path.join(__dirname, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  return manifest.version;
}

function cleanBuildDir() {
  const buildPath = path.join(__dirname, BUILD_DIR);
  if (fs.existsSync(buildPath)) {
    fs.rmSync(buildPath, { recursive: true });
  }
  fs.mkdirSync(buildPath, { recursive: true });
  return buildPath;
}

function createStagingDir() {
  return fs.mkdtempSync(path.join(require('os').tmpdir(), 'backlog-build-'));
}

function copyFiles(stagingDir) {
  const filesToCopy = [
    'manifest.json',
    'README.md'
  ];
  const dirsToCopy = [
    'src',
    'icons'
  ];

  // Copy individual files
  for (const file of filesToCopy) {
    const src = path.join(__dirname, file);
    const dest = path.join(stagingDir, file);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  }

  // Copy directories recursively
  function copyDir(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      if (entry.isDirectory()) {
        copyDir(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
  }

  for (const dir of dirsToCopy) {
    const src = path.join(__dirname, dir);
    const dest = path.join(stagingDir, dir);
    if (fs.existsSync(src)) {
      copyDir(src, dest);
    }
  }
}

function createZip(stagingDir, buildDir, version) {
  const zipName = `${EXTENSION_NAME}-v${version}.zip`;
  const zipPath = path.join(buildDir, zipName);

  // Use system zip command
  try {
    execSync(`cd "${stagingDir}" && zip -r "${zipPath}" . -x "*.DS_Store" -x "__MACOSX/*"`, {
      stdio: 'inherit'
    });
  } catch (e) {
    // Fallback to using adm-zip or similar if zip command not available
    console.error('Error: zip command not found. Please install zip.');
    process.exit(1);
  }

  return zipPath;
}

function main() {
  console.log('='.repeat(50));
  console.log(`Building ${EXTENSION_NAME}`);
  console.log('='.repeat(50));

  const version = getVersion();
  console.log(`Version: ${version}`);

  const buildPath = cleanBuildDir();
  console.log(`Build directory: ${buildPath}`);

  const stagingDir = createStagingDir();
  console.log(`Staging directory: ${stagingDir}`);

  console.log('\nCopying files...');
  copyFiles(stagingDir);

  console.log('\nCreating zip...');
  const zipPath = createZip(stagingDir, buildPath, version);

  // Clean up staging
  fs.rmSync(stagingDir, { recursive: true });

  console.log('\n' + '='.repeat(50));
  console.log('Build complete!');
  console.log(`Output: ${path.relative(__dirname, zipPath)}`);
  console.log('='.repeat(50));

  // Show file info
  const stats = fs.statSync(zipPath);
  console.log(`\nFile size: ${(stats.size / 1024).toFixed(2)} KB`);
}

main();
