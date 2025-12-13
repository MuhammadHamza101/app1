#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const MIN_NODE_MAJOR = 18;
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const collaborationDir = path.join(rootDir, 'mini-services', 'collaboration-service');
const children = [];

function fail(message) {
  console.error(`\n❌ ${message}`);
  process.exit(1);
}

function logStep(message) {
  console.log(`\n👉 ${message}`);
}

function ensureNodeVersion() {
  const [major] = process.versions.node.split('.').map(Number);
  if (Number.isNaN(major) || major < MIN_NODE_MAJOR) {
    fail(`Node.js ${MIN_NODE_MAJOR}+ is required. Detected ${process.versions.node}.`);
  }
  console.log(`✅ Node.js ${process.versions.node} detected`);
}

function assertCommandAvailable(command, friendlyName) {
  const result = spawnSync(command, ['--version'], { stdio: 'ignore', shell: true });
  if (result.status !== 0) {
    fail(`${friendlyName} is not available. Please install it and re-run this script.`);
  }
  console.log(`✅ ${friendlyName} available`);
}

function runSync(command, args, cwd, friendlyName) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });

  if (result.status !== 0) {
    fail(`${friendlyName} failed (exit code ${result.status ?? 'unknown'}).`);
  }
}

function installIfMissing(dir, label) {
  const nodeModulesPath = path.join(dir, 'node_modules');
  if (existsSync(nodeModulesPath)) {
    console.log(`✅ ${label} dependencies already installed`);
    return;
  }

  logStep(`Installing ${label} dependencies`);
  runSync('npm', ['install'], dir, `${label} dependency installation`);
}

function ensureEnvFiles() {
  const envLocalPath = path.join(rootDir, '.env.local');
  const envPath = path.join(rootDir, '.env');

  const envLocalExists = existsSync(envLocalPath);
  const envExists = existsSync(envPath);

  if (envLocalExists && envExists) {
    console.log('✅ Found existing .env.local and .env');
    return;
  }

  const secret = crypto.randomBytes(32).toString('hex');
  const content = [
    'DATABASE_URL="file:./dev.db"',
    `NEXTAUTH_SECRET="${secret}"`,
    'NEXTAUTH_URL="http://localhost:3000"',
    `ENCRYPTION_KEY="${secret.slice(0, 32)}"`,
  ].join('\n');

  if (!envLocalExists) {
    writeFileSync(envLocalPath, `${content}\n`, 'utf8');
    console.log('📝 Created .env.local with starter values. Update it with real secrets as needed.');
  }

  if (!envExists) {
    writeFileSync(envPath, `${content}\n`, 'utf8');
    console.log('📝 Created .env for Prisma with starter values.');
  }
}

function startService(label, command, args, cwd) {
  logStep(`Starting ${label}`);
  const child = spawn(command, args, {
    cwd,
    shell: true,
    stdio: 'inherit',
    env: process.env,
  });

  children.push(child);

  child.on('exit', (code) => {
    if (code === 0) {
      console.log(`✅ ${label} stopped cleanly`);
    } else {
      console.error(`❌ ${label} exited with code ${code ?? 'unknown'}`);
    }
  });
}

function registerShutdown() {
  const shutdown = () => {
    console.log('\n🛑 Shutting down services...');
    children.forEach((child) => {
      if (!child.killed) {
        child.kill('SIGINT');
      }
    });
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

async function main() {
  console.log('🚀 One-click starter for PatentFlow Enterprise');

  ensureNodeVersion();
  assertCommandAvailable('npm', 'npm');

  ensureEnvFiles();

  installIfMissing(rootDir, 'Web app');
  installIfMissing(collaborationDir, 'Collaboration service');

  logStep('Pushing database schema (Prisma)');
  runSync('npm', ['run', 'db:push'], rootDir, 'Database push');

  logStep('Resetting default admin user');
  runSync('npm', ['run', 'reset:admin'], rootDir, 'Default admin reset');

  logStep('Seeding sample patents');
  runSync('npm', ['run', 'seed:patents'], rootDir, 'Patent seed');

  registerShutdown();

  startService('Collaboration service', 'npm', ['run', 'dev'], collaborationDir);
  startService('Web app', 'npm', ['run', 'dev'], rootDir);

  console.log('\n🎉 All services started. Web app: http://localhost:3000  |  Collaboration: http://localhost:3003');
  console.log('Press Ctrl+C to stop.');

  await new Promise(() => {});
}

main().catch((error) => {
  console.error('❌ Startup failed:', error);
  process.exit(1);
});
