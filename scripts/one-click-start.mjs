#!/usr/bin/env node
import 'dotenv/config';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const MIN_NODE_MAJOR = 18;
const SECRET_MIN_LENGTH = 32;
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const collaborationDir = path.join(rootDir, 'mini-services', 'collaboration-service');
const children = [];

const prisma = new PrismaClient();

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

function parseEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return { lines: [], entries: {} };
  }

  const lines = readFileSync(filePath, 'utf8').split(/\r?\n/);
  const parsed = lines.map((line) => {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (match) {
      return { key: match[1], value: match[2] };
    }
    return { raw: line };
  });

  const entries = parsed.reduce((acc, line) => {
    if (line.key) acc[line.key] = line.value;
    return acc;
  }, {});

  return { lines: parsed, entries };
}

function serializeEnvLines(lines) {
  return lines
    .map((line) => (line.key ? `${line.key}=${line.value}` : line.raw))
    .join('\n')
    .replace(/\n+$/, '')
    .concat('\n');
}

function upsertEnvValue(lines, key, value) {
  const idx = lines.findIndex((line) => line.key === key);
  if (idx !== -1) {
    lines[idx] = { key, value };
  } else {
    lines.push({ key, value });
  }
}

function isLikelySecureSecret(value) {
  return (
    typeof value === 'string' &&
    value.length >= SECRET_MIN_LENGTH &&
    new Set(value.split('')).size >= Math.min(10, value.length)
  );
}

function ensureEnvFiles() {
  const envLocalPath = path.join(rootDir, '.env.local');
  const envPath = path.join(rootDir, '.env');

  const parsedFiles = {
    [envPath]: parseEnvFile(envPath),
    [envLocalPath]: parseEnvFile(envLocalPath),
  };

  const existingNextAuthSecret = [envPath, envLocalPath]
    .map((file) => parsedFiles[file].entries.NEXTAUTH_SECRET)
    .find((value) => isLikelySecureSecret(value?.replace(/^"|"$/g, '')));

  const existingEncryptionKey = [envPath, envLocalPath]
    .map((file) => parsedFiles[file].entries.ENCRYPTION_KEY)
    .find((value) => isLikelySecureSecret(value?.replace(/^"|"$/g, '')));

  const generatedSecrets = {
    nextAuthSecret: crypto.randomBytes(32).toString('hex'),
    encryptionKey: crypto.randomBytes(32).toString('hex').slice(0, 32),
  };

  const nextAuthSecret = existingNextAuthSecret?.replace(/^"|"$/g, '') ?? generatedSecrets.nextAuthSecret;
  const encryptionKey = existingEncryptionKey?.replace(/^"|"$/g, '') ?? generatedSecrets.encryptionKey;

  [envPath, envLocalPath].forEach((file) => {
    const parsed = parsedFiles[file];
    const label = path.basename(file);

    if (!isLikelySecureSecret(parsed.entries.NEXTAUTH_SECRET?.replace(/^"|"$/g, ''))) {
      console.log(`🛡️ ${label}: setting a secure NEXTAUTH_SECRET`);
    }

    if (!isLikelySecureSecret(parsed.entries.ENCRYPTION_KEY?.replace(/^"|"$/g, ''))) {
      console.log(`🛡️ ${label}: setting a secure ENCRYPTION_KEY`);
    }

    upsertEnvValue(parsed.lines, 'DATABASE_URL', '"file:./dev.db"');
    upsertEnvValue(parsed.lines, 'NEXTAUTH_SECRET', `"${nextAuthSecret}"`);
    upsertEnvValue(parsed.lines, 'NEXTAUTH_URL', '"http://localhost:3000"');
    upsertEnvValue(parsed.lines, 'OPENAI_API_KEY', parsed.entries.OPENAI_API_KEY ?? '"your-openai-key"');
    upsertEnvValue(parsed.lines, 'ENCRYPTION_KEY', `"${encryptionKey}"`);

    writeFileSync(file, serializeEnvLines(parsed.lines), 'utf8');
    console.log(`✅ Ensured ${label} exists with secure secrets`);
  });
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
    prisma.$disconnect().catch(() => {});
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

async function verifyDefaultAdminUser() {
  try {
    const user = await prisma.user.findUnique({ where: { email: 'admin@patentflow.com' } });

    if (!user) {
      fail('Default admin user not found. Run "npm run seed:default" to recreate it.');
    }

    if (!user.password) {
      fail('Default admin user exists but does not have a password. Re-run "npm run seed:default".');
    }

    if (!user.password.startsWith('$2')) {
      fail('Default admin user password is not hashed. Rerun "npm run seed:default" to fix the seed.');
    }

    console.log('✅ Verified default admin user exists with hashed password');
  } catch (error) {
    fail(`Unable to verify default admin user: ${error.message ?? error}`);
  }
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

  logStep('Seeding default admin user');
  runSync('npm', ['run', 'seed:default'], rootDir, 'Default user seed');

  logStep('Verifying default admin seed');
  await verifyDefaultAdminUser();

  registerShutdown();

  startService('Collaboration service', 'npm', ['run', 'dev'], collaborationDir);
  startService('Web app', 'npm', ['run', 'dev'], rootDir);

  console.log('\n🎉 All services started. Web app: http://localhost:3000  |  Collaboration: http://localhost:3003');
  console.log('Press Ctrl+C to stop.');

  await new Promise(() => {});
}

main()
  .catch((error) => {
    console.error('❌ Startup failed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
