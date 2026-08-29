#!/usr/bin/env node
/**
 * ShineCraft App Launcher & Auto-Setup
 * ------------------------------------
 * Zero-dependency Node script that:
 *   1. Detects (and auto-downloads if missing) a portable Node.js + npm
 *   2. Detects (and auto-initializes if missing) a PostgreSQL server
 *   3. Creates the database if absent
 *   4. Installs backend + frontend dependencies (npm ci)
 *   5. Applies the Prisma schema + seeds the admin account & company profile
 *   6. Builds backend (tsc) and frontend (next build)
 *   7. Starts both servers, health-checks and opens the default browser
 *   8. Stops everything cleanly on Ctrl+C / window close
 *
 * Usage:
 *   node launcher.js run     (default) — setup if needed, then start
 *   node launcher.js setup   — force a full re-setup (re-download/install)
 *   node launcher.js start   — start only (errors if not set up)
 *   node launcher.js doctor  — print environment / dependency status
 *
 * Env overrides (all optional):
 *   SC_FORCE_PORTABLE_NODE=1   ignore a system Node and download portable
 *   SC_NODE_VERSION=v22.12.0   pin the portable Node version
 *   SC_FORCE_PORTABLE_PG=1      ignore a running system Postgres and use embedded
 *   SC_PG_VERSION=16.4-1       pin the portable Postgres version (EDB binaries)
 *   SC_PG_PORT=5432            Postgres port
 *   SC_DB_USER=postgres        DB user
 *   SC_DB_PASSWORD=root123     DB password (used for the connection string)
 *   SC_DB_NAME=payslip_shinecraft  DB name
 *   SC_DB_HOST=localhost       DB host
 *   SC_PUPPETEER_CACHE_DIR=... Chromium cache dir for puppeteer PDF generation
 *   SC_BACKEND_PORT=5000       backend port
 *   SC_FRONTEND_PORT=3000      frontend port
 */
'use strict';

process.noDeprecation = true; // avoid cosmetic DEP0190 warning when spawning .cmd scripts

const fs = require('fs');
const path = require('path');
const net = require('net');
const https = require('https');
const crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');

// ---------------------------------------------------------------------------
// Paths & config
// ---------------------------------------------------------------------------

const isPkg = !!process.pkg;
const APP_ROOT = isPkg ? path.dirname(process.execPath) : path.join(__dirname, '..');
const DEPLOY_DIR = path.join(APP_ROOT, 'deploy');
const TOOLS_DIR = path.join(DEPLOY_DIR, 'tools');
const DATA_DIR = path.join(DEPLOY_DIR, 'data');
const LOGS_DIR = path.join(DEPLOY_DIR, 'logs');
const STATE_FILE = path.join(DEPLOY_DIR, 'state.json');
const BACKEND_DIR = path.join(APP_ROOT, 'backend');
const FRONTEND_DIR = path.join(APP_ROOT, 'frontend');
const PG_DATA_DIR = path.join(DATA_DIR, 'pgsql');
const TOOLS_PGSQL = path.join(TOOLS_DIR, 'pgsql');
const PUPPETEER_CACHE = process.env.SC_PUPPETEER_CACHE_DIR || path.join(TOOLS_DIR, 'chrome');

const env = (k, d) => (process.env[k] !== undefined && process.env[k] !== '' ? process.env[k] : d);
const envNum = (k, d) => Number(env(k, d));

const CFG = {
  forcePortableNode: env('SC_FORCE_PORTABLE_NODE', '0') === '1',
  nodeVersion: env('SC_NODE_VERSION', ''),
  forcePortablePg: env('SC_FORCE_PORTABLE_PG', '0') === '1',
  pgVersion: env('SC_PG_VERSION', '16.4-1'),
  pgPort: envNum('SC_PG_PORT', 5432),
  dbUser: env('SC_DB_USER', 'postgres'),
  dbPassword: env('SC_DB_PASSWORD', 'root123'),
  dbName: env('SC_DB_NAME', 'payslip_shinecraft'),
  dbHost: env('SC_DB_HOST', 'localhost'),
  backendPort: envNum('SC_BACKEND_PORT', envNum('PORT', 5000)),
  frontendPort: envNum('SC_FRONTEND_PORT', 3000),
  // Secrets are intentionally NOT hardcoded here. The real values come from
  // a gitignored backend/.env (bundled into the distributable ZIP by
  // package.ps1) or from SC_* environment variables at runtime.
  jwtSecret: env('SC_JWT_SECRET', ''),
  jibbleClientId: env('SC_JIBBLE_CLIENT_ID', ''),
  jibbleClientSecret: env('SC_JIBBLE_CLIENT_SECRET', ''),
  smtpUser: env('SC_SMTP_USER', ''),
  smtpPass: env('SC_SMTP_PASS', ''),
};

const NODE_FALLBACK_VERSIONS = ['v22.12.0', 'v20.18.1', 'v22.14.0'];
const PG_FALLBACK_VERSIONS = ['16.4-1', '15.7-1', '14.12-1', '16.3-1', '15.6-1', '14.11-1', '13.14-1', '12.18-1'];

// Inline backend .env template (kept here so the packaged EXE needs no extra assets)
// Secret values are filled from the gitignored backend/.env if it exists, else from
// SC_* env vars; if neither provides a value, a placeholder is used so the real
// credentials never end up in version control.
function loadBackendEnvSecrets() {
  const out = {};
  const existing = path.join(BACKEND_DIR, '.env');
  if (fs.existsSync(existing)) {
    for (const raw of fs.readFileSync(existing, 'utf8').split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*"?([^"\r\n]*)"?\s*$/.exec(raw);
      if (m) out[m[1]] = m[2];
    }
  }
  const merged = {
    JWT_SECRET: CFG.jwtSecret || out.JWT_SECRET || '',
    JIBBLE_CLIENT_ID: CFG.jibbleClientId || out.JIBBLE_CLIENT_ID || '',
    JIBBLE_CLIENT_SECRET: CFG.jibbleClientSecret || out.JIBBLE_CLIENT_SECRET || '',
    SMTP_USER: CFG.smtpUser || out.SMTP_USER || '',
    SMTP_PASS: CFG.smtpPass || out.SMTP_PASS || '',
  };
  return merged;
}

const BACKEND_ENV_TEMPLATE = (cfg) => {
  const s = loadBackendEnvSecrets();
  return `PORT=${cfg.backendPort}
DATABASE_URL="postgresql://${encodeURIComponent(cfg.dbUser)}:${encodeURIComponent(cfg.dbPassword)}@${cfg.dbHost}:${cfg.pgPort}/${cfg.dbName}?schema=public"
JWT_SECRET="${s.JWT_SECRET || 'change-me-in-backend-.env'}"
JWT_EXPIRES_IN="7d"
BCRYPT_SALT_ROUNDS=10

# Jibble API Configuration (OAuth2 client_credentials)
JIBBLE_CLIENT_ID="${s.JIBBLE_CLIENT_ID || 'change-me'}"
JIBBLE_CLIENT_SECRET="${s.JIBBLE_CLIENT_SECRET || 'change-me'}"
JIBBLE_IDENTITY_URL="https://identity.prod.jibble.io/connect/token"
JIBBLE_WORKSPACE_URL="https://workspace.prod.jibble.io/v1"
JIBBLE_TIME_TRACKING_URL="https://time-tracking.prod.jibble.io/v1"

# SMTP Configuration
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="${s.SMTP_USER || 'your_email@gmail.com'}"
SMTP_PASS="${s.SMTP_PASS || 'your_app_password'}"
SMTP_SECURE=false
SENDER_NAME="ShineCraft HR"
SENDER_EMAIL="hr@shinecraft.com"
`;
};

// ---------------------------------------------------------------------------
// State persistence (idempotency) + logging
// ---------------------------------------------------------------------------

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return {};
  }
}
function saveState(state) {
  fs.mkdirSync(DEPLOY_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

let state = loadState();

// --- logging ----------------------------------------------------------------
let logStream = null;
const colors = { reset: '\x1b[0m', dim: '\x1b[2m', red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', cyan: '\x1b[36m', magenta: '\x1b[35m' };
function log(msg, color = '') {
  const line = `[${new Date().toLocaleTimeString('en-IN')}] ${msg}`;
  const colored = color ? `${colors[color]}${line}${colors.reset}` : line;
  process.stdout.write(colored + '\n');
  if (logStream) logStream.write(line + '\n');
}
function info(m) { log(m); }
function ok(m) { log('✔ ' + m, 'green'); }
function step(m) { log('▶ ' + m, 'cyan'); }
function warn(m) { log('⚠ ' + m, 'yellow'); }
function fail(m) { log('✖ ' + m, 'red'); }

function openLog() {
  try {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
    logStream = fs.createWriteStream(path.join(LOGS_DIR, 'launcher.log'), { flags: 'a' });
  } catch { /* non fatal */ }
}

// ---------------------------------------------------------------------------
// Process helpers
// ---------------------------------------------------------------------------

function buildEnv(extra) {
  const env = { ...process.env, ...(extra || {}) };
  // keep PATH consistent on Windows (both common spellings)
  env.PATH = env.PATH || process.env.Path || process.env.PATH || '';
  env.Path = env.PATH;
  return env;
}

function quoteArg(s) {
  return '"' + String(s).replace(/(\\*)"/g, '$1$1\\"').replace(/(\\*)$/, '$1$1') + '"';
}

/** Run a command, inherit stdio. Resolves when it exits 0. Throws otherwise. */
function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const useShell = process.platform === 'win32' && /\.(cmd|bat)$/i.test(String(cmd));
    const opt = { cwd: opts.cwd || APP_ROOT, env: buildEnv(opts.env), windowsHide: true, shell: useShell };
    const child = spawn(cmd, args, opt);
    child.stdout && child.stdout.pipe(process.stdout);
    child.stderr && child.stderr.pipe(process.stderr);
    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with code ${code}`));
    });
  });
}

/** Run a command, capture combined output. Resolves {code, output}. Never throws. */
function runCapture(cmd, args, opts = {}) {
  const useShell = process.platform === 'win32' && /\.(cmd|bat)$/i.test(String(cmd));
  const opt = { cwd: opts.cwd || APP_ROOT, env: buildEnv(opts.env), windowsHide: true, shell: useShell, encoding: 'utf8' };
  const res = spawnSync(cmd, args, opt);
  return { code: res.status, output: (res.stdout || '') + (res.stderr || '') };
}

function safeExec(cmd, args, opts) {
  const r = runCapture(cmd, args, opts);
  if (r.code === 0) return r.output.trim();

  if (process.platform === 'win32' && !/\.(exe|cmd|bat)$/i.test(String(cmd))) {
    const r2 = runCapture(String(cmd) + '.cmd', args, opts);
    if (r2.code === 0) return r2.output.trim();
  }
  return '';
}

// ---------------------------------------------------------------------------
// Downloads & extraction
// ---------------------------------------------------------------------------

function download(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) {
      info(`Already downloaded: ${path.basename(dest)}`);
      return resolve(dest);
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const tmp = dest + '.part';
    info(`Downloading ${path.basename(dest)} (${url})...`);
    const file = fs.createWriteStream(tmp);
    const doGet = (u) => {
      https.get(u, { headers: { 'User-Agent': 'ShineCraft-Setup/1.0' } }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          return doGet(new URL(res.headers.location, u).toString());
        }
        if (!res.statusCode || res.statusCode !== 200) {
          res.resume();
          return reject(new Error(`HTTP ${res.statusCode} for ${u}`));
        }
        const total = Number(res.headers['content-length'] || 0);
        let got = 0;
        res.on('data', (chunk) => { got += chunk.length; if (process.stdout.isTTY && total) process.stdout.write(`\r  ${Math.round((got / total) * 100)}%  `); });
        res.on('end', () => { if (process.stdout.isTTY) process.stdout.write('\r          \r'); });
        res.pipe(file);
        file.on('finish', () => file.close(() => { fs.renameSync(tmp, dest); ok(`Downloaded ${path.basename(dest)}`); resolve(dest); }));
      }).on('error', (e) => { try { fs.unlinkSync(tmp); } catch {} reject(e); });
    };
    doGet(url);
  });
}

function unzip(zipPath, destDir) {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(destDir, { recursive: true });
    info(`Extracting ${path.basename(zipPath)} ...`);
    const tar = runCapture('tar', ['-xf', zipPath, '-C', destDir]);
    if (tar.code === 0) { ok(`Extracted ${path.basename(zipPath)}`); return resolve(); }
    // fallback to PowerShell Expand-Archive
    const ps = `Expand-Archive -LiteralPath '${String(zipPath).replace(/'/g, "''")}' -DestinationPath '${String(destDir).replace(/'/g, "''")}' -Force`;
    run('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps])
      .then(() => { ok(`Extracted ${path.basename(zipPath)}`); resolve(); })
      .catch(reject);
  });
}

// ---------------------------------------------------------------------------
// Node.js detection & portable install
// ---------------------------------------------------------------------------

/** Return the first existing file path for a program found via PATH (Windows), else ''. */
function whereExe(name) {
  if (!process.env.PATH) return '';
  const exts = (process.env.PATHEXT || '.EXE;.CMD;.BAT;.COM').split(';');
  const dirs = String(process.env.PATH).split(';').filter(Boolean);
  for (const dir of dirs) {
    for (const base of [name, name.toUpperCase()]) {
      for (const ext of exts) {
        const p = path.join(dir, base + ext.toLowerCase());
        if (/^[a-z]:[\\/]/i.test(p) && fs.existsSync(p)) return p;
      }
    }
  }
  return '';
}

/** Find npm-cli.js next to a known node.exe (standard install layouts). */
function npmCliFromNode(nodeExe) {
  try {
    const cands = [
      path.join(path.dirname(nodeExe), 'node_modules', 'npm', 'bin', 'npm-cli.js'),
      path.join(path.dirname(nodeExe), '..', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    ];
    for (const c of cands) if (fs.existsSync(c)) return c;
  } catch { /* ignore */ }
  return '';
}

function systemNodeInfo() {
  // Resolve the REAL node.exe by absolute path. NB: inside the packaged EXE,
  // spawning the bare name "node" is hijacked by pkg and runs in-snapshot, so
  // we must always spawn an absolute path.
  const exe = process.platform === 'win32' ? whereExe('node') || whereExe('node.exe') : '';
  const nodeCmd = exe || 'node';
  const nodeV = safeExec(nodeCmd, ['--version']);
  if (!nodeV) return null;
  const npmCli = npmCliFromNode(exe);
  let npmV = '';
  if (npmCli) npmV = safeExec(nodeCmd, [npmCli, '--version']);
  if (npmV) return { source: 'system', node: nodeCmd, npmCli, nodeVersion: nodeV, npmVersion: npmV ? npmV : '?' };
  // node works but no npm -> let portable node handle npm
  return { source: 'system', node: nodeCmd, npmCli, nodeVersion: nodeV, npmVersion: '?' };
}

async function fetchLatestNodeVersion() {
  return new Promise((resolve) => {
    https.get('https://nodejs.org/dist/index.json', { headers: { 'User-Agent': 'ShineCraft-Setup/1.0' } }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try {
          const arr = JSON.parse(body);
          const lts22 = arr.find((v) => v.version.startsWith('v22.') && v.lts);
          if (lts22) return resolve(lts22.version);
          const v22 = arr.find((v) => v.version.startsWith('v22.'));
          if (v22) return resolve(v22.version);
        } catch { /* ignore */ }
        resolve('');
      });
    }).on('error', () => resolve(''));
  });
}

function portableNodeDir(version) {
  return path.join(TOOLS_DIR, version);
}

async function ensureNode() {
  if (!CFG.forcePortableNode) {
    const sys = systemNodeInfo();
    if (sys) return sys;
  }

  let version = CFG.nodeVersion || state.nodeVersion || '';
  if (!version) version = await fetchLatestNodeVersion();
  if (!version) {
    for (const v of NODE_FALLBACK_VERSIONS) {
      if (v.startsWith('v')) { version = v; break; }
    }
  }
  if (!version) throw new Error('Could not determine a portable Node version to install.');

  const dir = portableNodeDir(version);
  const nodeExe = path.join(dir, 'node.exe');
  if (!fs.existsSync(nodeExe)) {
    step(`Installing portable Node.js ${version} ...`);
    const zip = path.join(TOOLS_DIR, `${version}-win-x64.zip`);
    await download(`https://nodejs.org/dist/${version}/node-${version}-win-x64.zip`, zip);
    await unzip(zip, TOOLS_DIR);
    const inner = path.join(TOOLS_DIR, `node-${version}-win-x64`);
    // normalize name -> tools/node-<version>
    if (fs.existsSync(inner) && !fs.existsSync(dir)) {
      try { fs.renameSync(inner, dir); } catch { /* dir may already exist */ }
    }
    if (!fs.existsSync(nodeExe)) throw new Error(`Portable Node install failed: ${nodeExe} not found`);
  }
  const nodeV = safeExec(nodeExe, ['--version']);
  ok(`Portable Node.js ready (${nodeV || version})`);
  state.nodeVersion = version;
  return {
    source: 'portable',
    node: nodeExe,
    nodeDir: dir,
    npmCli: path.join(dir, 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    nodeVersion: nodeV,
    npmVersion: safeExec(nodeExe, [path.join(dir, 'node_modules', 'npm', 'bin', 'npm-cli.js'), '--version']) || '?',
    dir,
  };
}

/** Run npm via the cleanest available entry point (node + npm-cli.js, else npm.cmd). */
function npmRun(node, args, opts = {}) {
  if (node && node.npmCli && fs.existsSync(node.npmCli)) {
    return run(node.node, [node.npmCli, ...args].filter(Boolean), opts);
  }
  return run(process.platform === 'win32' ? 'npm.cmd' : 'npm', args, opts);
}

// ---------------------------------------------------------------------------
// PostgreSQL detection / portable setup
// ---------------------------------------------------------------------------

function tcpOpen(host, port, timeoutMs = 2000) {
  return new Promise((resolve) => {
    const sock = net.connect({ host, port, timeout: timeoutMs });
    sock.once('connect', () => { sock.destroy(); resolve(true); });
    sock.once('error', () => { sock.destroy(); resolve(false); });
    sock.once('timeout', () => { sock.destroy(); resolve(false); });
  });
}

function psqlFrom(paths) {
  for (const p of paths) if (fs.existsSync(p)) return p;
  return null;
}

function getPsqlClient() {
  const portable = psqlFrom([path.join(TOOLS_PGSQL, 'bin', 'psql.exe')]);
  if (portable) return portable;
  const sys = safeExec('psql', ['--version']);
  if (sys) return 'psql.exe';
  return null;
}

function pgTools() {
  return {
    initdb: path.join(TOOLS_PGSQL, 'bin', 'initdb.exe'),
    pgCtl: path.join(TOOLS_PGSQL, 'bin', 'pg_ctl.exe'),
    pgIsReady: path.join(TOOLS_PGSQL, 'bin', 'pg_isready.exe'),
    createdb: path.join(TOOLS_PGSQL, 'bin', 'createdb.exe'),
    psql: path.join(TOOLS_PGSQL, 'bin', 'psql.exe'),
  };
}

async function waitForPg(host, port, timeoutMs = 60000) {
  const t0 = Date.now();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  while (Date.now() - t0 < timeoutMs) {
    if (await tcpOpen(host, port, 1500)) return true;
    await sleep(1500);
  }
  return false;
}

async function downloadPortablePg() {
  const tools = pgTools();
  if (fs.existsSync(tools.psql)) return;
  step('Downloading portable PostgreSQL ...');
  const versions = [CFG.pgVersion, ...PG_FALLBACK_VERSIONS.filter((v) => v !== CFG.pgVersion)];
  let lastErr = null;
  for (const v of versions) {
    const zip = path.join(TOOLS_DIR, `postgresql-${v}-windows-x64-binaries.zip`);
    const url = `https://get.enterprisedb.com/postgresql/postgresql-${v}-windows-x64-binaries.zip`;
    try {
      await download(url, zip);
      await unzip(zip, TOOLS_DIR);
      // EDB binaries extract a top-level 'pgsql' folder
      const inner = path.join(TOOLS_DIR, 'pgsql');
      if (fs.existsSync(inner) && !fs.existsSync(TOOLS_PGSQL)) fs.renameSync(inner, TOOLS_PGSQL);
      if (fs.existsSync(tools.psql)) { ok(`Portable PostgreSQL ${v} ready`); return; }
    } catch (e) {
      lastErr = e;
      warn(`PostgreSQL ${v} failed: ${e.message}`);
    }
  }
  throw new Error(`Could not install portable PostgreSQL. Last error: ${lastErr && lastErr.message}`);
}

function initPortablePg() {
  const tools = pgTools();
  if (!fs.existsSync(tools.initdb)) throw new Error('Portable Postgres binaries not found; initdb is missing.');
  if (!fs.existsSync(path.join(PG_DATA_DIR, 'PG_VERSION'))) {
    step('Initializing PostgreSQL data directory ...');
    const r = runCapture(tools.initdb, ['-D', PG_DATA_DIR, '-U', CFG.dbUser, '-A', 'trust', '-E', 'UTF8']);
    if (r.code !== 0) throw new Error(`initdb failed: ${r.output.slice(-1200)}`);
    ok('PostgreSQL data directory initialized');
  }
}

async function startPortablePg() {
  const tools = pgTools();
  initPortablePg();
  if (await tcpOpen('localhost', CFG.pgPort, 1200)) return; // already running
  step(`Starting portable PostgreSQL on port ${CFG.pgPort} ...`);
  const r = runCapture(tools.pgCtl, ['-D', PG_DATA_DIR, '-l', path.join(LOGS_DIR, 'postgres.log'), '-o', `-p ${CFG.pgPort}`, 'start']);
  if (r.code !== 0) throw new Error(`pg_ctl start failed: ${r.output.slice(-1200)}`);
  ok('PostgreSQL started');
}

async function ensureDatabase(psql) {
  await waitForPg(CFG.dbHost, CFG.pgPort, 45000);
  const psqlEnv = { PGPASSWORD: CFG.dbPassword || '', PGCONNECT_TIMEOUT: '15' };
  const base = ['-h', CFG.dbHost, '-p', String(CFG.pgPort), '-U', CFG.dbUser, '-d', 'postgres', '-tAc'];
  const exists = safeExec(psql, [...base, `SELECT 1 FROM pg_database WHERE datname='${CFG.dbName}'`], { env: psqlEnv });
  if (String(exists).trim() === '1') {
    ok(`Database "${CFG.dbName}" already exists`);
    return;
  }
  step(`Creating database "${CFG.dbName}" ...`);
  await run(psql, ['-h', CFG.dbHost, '-p', String(CFG.pgPort), '-U', CFG.dbUser, '-d', 'postgres', '-c', `CREATE DATABASE "${CFG.dbName}"`], { env: psqlEnv });
  ok(`Database "${CFG.dbName}" created`);
}

async function ensurePg() {
  const listening = await tcpOpen(CFG.dbHost, CFG.pgPort, 1500);

  if (listening && !CFG.forcePortablePg) {
    ok(`PostgreSQL already responding on ${CFG.dbHost}:${CFG.pgPort}`);
    // make sure we have a psql client for createdb checks
    const psql = getPsqlClient();
    if (!psql) {
      warn('No psql client found; downloading portable Postgres for its client tools only.');
      await downloadPortablePg();
    }
    const p = getPsqlClient();
    await ensureDatabase(p);
    state.pg = { source: 'system', port: CFG.pgPort };
    return p;
  }

  // portable path
  await downloadPortablePg();
  await startPortablePg();
  const psql = getPsqlClient();
  await ensureDatabase(psql);
  state.pg = { source: 'portable', port: CFG.pgPort };
  return psql;
}

// ---------------------------------------------------------------------------
// Prisma helpers (invoke CLI directly via node, no npx needed)
// ---------------------------------------------------------------------------

function prismaCli() {
  const p = path.join(BACKEND_DIR, 'node_modules', 'prisma', 'build', 'index.js');
  if (!fs.existsSync(p)) throw new Error(`Prisma CLI not found at ${p}. Run "npm ci" in backend first.`);
  return p;
}
function tsNodeBin() {
  const p = path.join(BACKEND_DIR, 'node_modules', 'ts-node', 'dist', 'bin.js');
  if (!fs.existsSync(p)) throw new Error(`ts-node not found at ${p}. Run "npm ci" in backend first.`);
  return p;
}
function dbEnv() {
  const url = `postgresql://${encodeURIComponent(CFG.dbUser)}:${encodeURIComponent(CFG.dbPassword)}@${CFG.dbHost}:${CFG.pgPort}/${CFG.dbName}?schema=public`;
  return { DATABASE_URL: url };
}

// ---------------------------------------------------------------------------
// Env file creation
// ---------------------------------------------------------------------------

function writeEnvIfMissing() {
  const backendEnv = path.join(BACKEND_DIR, '.env');
  const frontendEnv = path.join(FRONTEND_DIR, '.env.local');
  let changed = false;

  if (!fs.existsSync(backendEnv)) {
    fs.writeFileSync(backendEnv, BACKEND_ENV_TEMPLATE(CFG));
    ok('Created backend/.env');
    changed = true;
  }
  if (!fs.existsSync(frontendEnv)) {
    fs.writeFileSync(frontendEnv, `NEXT_PUBLIC_API_URL=http://localhost:${CFG.backendPort}/api\n`);
    ok('Created frontend/.env.local');
    changed = true;
  }
  return changed;
}

// ---------------------------------------------------------------------------
// Dependency install + build
// ---------------------------------------------------------------------------

function dirFingerprint(root, dirs) {
  const h = crypto.createHash('sha1');
  const walk = (base, rel) => {
    let list = [];
    try { list = fs.readdirSync(base, { withFileTypes: true }); } catch { return; }
    for (const ent of list) {
      if (ent.name === 'node_modules' || ent.name === '.next' || ent.name === 'dist') continue;
      const fp = path.join(base, ent.name);
      const rp = path.join(rel, ent.name);
      if (ent.isDirectory()) walk(fp, rp);
      else {
        try {
          const st = fs.statSync(fp);
          h.update(rp); h.update(':').update(String(st.size)).update(':').update(String(st.mtimeMs)).update('|');
        } catch { /* ignore */ }
      }
    }
  };
  for (const d of dirs) walk(path.join(root, d), d);
  return h.digest('hex').slice(0, 16);
}

function lockfileHash(pkgRoot) {
  const h = crypto.createHash('sha256');
  for (const f of ['package.json', 'package-lock.json']) {
    try { h.update(f); h.update(fs.readFileSync(path.join(pkgRoot, f))); } catch { /* ignore */ }
  }
  return h.digest('hex').slice(0, 16);
}

async function ensureDeps(node) {
  for (const [label, root] of [['Backend', BACKEND_DIR], ['Frontend', FRONTEND_DIR]]) {
    const stamp = `deps-${label.toLowerCase()}-${lockfileHash(root)}`;
    if (state[stamp]) {
      ok(`${label} dependencies already installed`);
      continue;
    }
    step(`Installing ${label} dependencies (npm ci, this may take a few minutes) ...`);
    try {
      await npmRun(node, ['ci', '--no-audit', '--no-fund', '--no-progress'], {
        cwd: root,
        env: { PUPPETEER_CACHE_DIR: PUPPETEER_CACHE },
      });
    } catch (err) {
      // npm ci is strict about lockfile/package.json sync; fall back to npm install
      warn(`${label}: npm ci failed (${err.message || 'unknown'}). Falling back to npm install ...`);
      await npmRun(node, ['install', '--no-audit', '--no-fund', '--no-progress'], {
        cwd: root,
        env: { PUPPETEER_CACHE_DIR: PUPPETEER_CACHE },
      });
    }
    state[stamp] = true;
    saveState(state);
    ok(`${label} dependencies installed`);
  }
}

async function ensureSchemaAndSeed(node) {
  const stepOpens = state['db-applied'];
  if (stepOpens) {
    ok('Database schema already applied');
    return;
  }
  step('Generating Prisma client ...');
  await run(node.node, [prismaCli(), 'generate'], { cwd: BACKEND_DIR, env: dbEnv() });
  step('Synchronizing database schema (prisma db push) ...');
  await run(node.node, [prismaCli(), 'db', 'push', '--skip-generate'], { cwd: BACKEND_DIR, env: dbEnv() });
  step('Seeding admin account & company profile ...');
  await run(node.node, [tsNodeBin(), 'prisma/seed.ts'], { cwd: BACKEND_DIR, env: dbEnv() });
  state['db-applied'] = true;
  saveState(state);
  ok('Database ready (schema + seed)');
}

async function ensureBuild(node) {
  const srcStamp = dirFingerprint(BACKEND_DIR, ['src', 'prisma']) + '-' + dirFingerprint(FRONTEND_DIR, ['app', 'components', 'hooks', 'lib']);
  const built = state['build'] || '';
  if (built === srcStamp && fs.existsSync(path.join(BACKEND_DIR, 'dist', 'index.js')) && fs.existsSync(path.join(FRONTEND_DIR, '.next'))) {
    ok('Backend & frontend already built');
    return;
  }
  step('Building backend (tsc) ...');
  const tsc = path.join(BACKEND_DIR, 'node_modules', 'typescript', 'bin', 'tsc');
  await run(node.node, [tsc, '-p', path.join(BACKEND_DIR, 'tsconfig.json')], { cwd: BACKEND_DIR });
  step('Building frontend (next build) ...');
  const nextBin = path.join(FRONTEND_DIR, 'node_modules', 'next', 'dist', 'bin', 'next');
  await run(node.node, [nextBin, 'build'], {
    cwd: FRONTEND_DIR,
    env: { NEXT_PUBLIC_API_URL: `http://localhost:${CFG.backendPort}/api` },
  });
  state['build'] = srcStamp;
  saveState(state);
  ok('Backend & frontend built');
}

// ---------------------------------------------------------------------------
// Server startup + health checks + browser
// ---------------------------------------------------------------------------

const children = [];
function track(child, label) {
  children.push(child);
  child.on('exit', (code) => {
    const i = children.indexOf(child);
    if (i >= 0) children.splice(i, 1);
    if (child._intentional !== true) {
      warn(`${label} exited unexpectedly (code ${code})`);
    }
  });
}

function killAll() {
  for (const child of children) {
    try {
      if (process.platform === 'win32') spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true });
      else child.kill('SIGTERM');
    } catch { /* ignore */ }
  }
}

async function waitHttp(url, timeoutMs, label) {
  const t0 = Date.now();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  while (Date.now() - t0 < timeoutMs) {
    try {
      const res = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(3000) });
      if (res.ok) return true;
    } catch { /* retry */ }
    await sleep(1500);
  }
  return false;
}

function openBrowser(url) {
  try {
    if (process.platform === 'win32') {
      spawn('cmd.exe', ['/c', 'start', '', url], { windowsHide: true, detached: true }).unref();
    } else if (process.platform === 'darwin') {
      spawn('open', [url], { detached: true }).unref();
    } else {
      spawn('xdg-open', [url], { detached: true }).unref();
    }
  } catch { warn('Could not open browser automatically'); }
}

async function startServers(node) {
  if (!fs.existsSync(path.join(BACKEND_DIR, 'dist', 'index.js'))) throw new Error('Backend build missing — run setup first.');
  if (!fs.existsSync(path.join(FRONTEND_DIR, '.next'))) throw new Error('Frontend build missing — run setup first.');

  // Pre-flight: the exact ports must be free, otherwise a foreign process could
  // answer our health checks (and our own services would fail with EADDRINUSE).
  const busyBackend = await tcpOpen('localhost', CFG.backendPort, 800);
  const busyFrontend = await tcpOpen('localhost', CFG.frontendPort, 800);
  if (busyBackend || busyFrontend) {
    if (busyBackend) warn(`Port ${CFG.backendPort} is already in use by another process.`);
    if (busyFrontend) warn(`Port ${CFG.frontendPort} is already in use by another process.`);
    warn('Stop the application using that port first, or run with different ports:');
    warn(`  set SC_BACKEND_PORT=5001`);
    warn(`  set SC_FRONTEND_PORT=3001`);
    throw new Error('Required port already in use');
  }

  const backendUrl = `http://localhost:${CFG.backendPort}/api/health`;
  const frontendUrl = `http://localhost:${CFG.frontendPort}`;

  step(`Starting backend on port ${CFG.backendPort} ...`);
  const backend = spawn(node.node, [path.join(BACKEND_DIR, 'dist', 'index.js')], {
    cwd: BACKEND_DIR,
    env: buildEnv(dbEnv()),
    windowsHide: false,
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  track(backend, 'Backend');

  step(`Waiting for backend ...`);
  if (!(await waitHttp(backendUrl, 60000, 'Backend'))) {
    fail('Backend did not become ready on time. See logs above.');
    throw new Error('Backend health check timed out');
  }
  ok('Backend is up');

  step(`Starting frontend on port ${CFG.frontendPort} ...`);
  const nextBin = path.join(FRONTEND_DIR, 'node_modules', 'next', 'dist', 'bin', 'next');
  const nextArgs = ['start', CFG.frontendPort !== 3000 ? '-p' : '', CFG.frontendPort !== 3000 ? String(CFG.frontendPort) : ''].filter((x) => x !== '');
  const frontend = spawn(node.node, [nextBin, ...nextArgs], {
    cwd: FRONTEND_DIR,
    env: buildEnv({ NEXT_PUBLIC_API_URL: `http://localhost:${CFG.backendPort}/api` }),
    windowsHide: false,
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  track(frontend, 'Frontend');

  step(`Waiting for frontend ...`);
  if (!(await waitHttp(frontendUrl, 90000, 'Frontend'))) {
    fail('Frontend did not become ready on time. See logs above.');
    throw new Error('Frontend health check timed out');
  }
  ok('Frontend is up');

  info('');
  info('────────────────────────────────────────────────────────────');
  ok('ShineCraft is running!');
  info(`   App:   ${frontendUrl}`);
  info(`   Admin: admin@shinecraft.com  /  Admin@123`);
  info(`   Backend: ${backendUrl}`);
  info('   Press Ctrl+C to stop the app safely.');
  info('────────────────────────────────────────────────────────────');

  openBrowser(frontendUrl);
}

// ---------------------------------------------------------------------------
// Top-level orchestration
// ---------------------------------------------------------------------------

async function doctor() {
  info('ShineCraft environment doctor');
  info('────────────────────────────────────────────');
  const sys = systemNodeInfo();
  if (sys) ok(`Node.js: ${sys.nodeVersion}  npm: ${sys.npmVersion}  (system)`);
  else warn('Node.js: not found on PATH');

  const ny = await fetchLatestNodeVersion();
  info(`Latest Node LTS (v22): ${ny || 'unknown'}`);

  const listening = await tcpOpen(CFG.dbHost, CFG.pgPort, 1500);
  info(`PostgreSQL on ${CFG.dbHost}:${CFG.pgPort}: ${listening ? 'responding' : 'not responding'}`);
  const psql = getPsqlClient();
  info(`psql client: ${psql ? psql : 'not found'}`);

  for (const [label, root] of [['Backend', BACKEND_DIR], ['Frontend', FRONTEND_DIR]]) {
    const deps = fs.existsSync(path.join(root, 'node_modules'));
    info(`${label} node_modules: ${deps ? 'present' : 'missing'}`);
  }
  info(`Backend dist: ${fs.existsSync(path.join(BACKEND_DIR, 'dist', 'index.js')) ? 'present' : 'missing'}`);
  info(`Frontend .next: ${fs.existsSync(path.join(FRONTEND_DIR, '.next')) ? 'present' : 'missing'}`);
  info(`Portable tools dir: ${TOOLS_DIR}`);
  info('────────────────────────────────────────────');
}

let _node = null;
async function resolveNode() {
  if (!_node) _node = await ensureNode();
  return _node;
}

async function runFullSetup() {
  const node = await resolveNode();
  writeEnvIfMissing();
  await ensurePg();
  await ensureDeps(node);
  await ensureSchemaAndSeed(node);
  await ensureBuild(node);
}

async function smartRun() {
  const node = await resolveNode();
  const needSetup =
    !fs.existsSync(path.join(BACKEND_DIR, 'node_modules')) ||
    !fs.existsSync(path.join(FRONTEND_DIR, 'node_modules')) ||
    !fs.existsSync(path.join(BACKEND_DIR, 'dist', 'index.js')) ||
    !fs.existsSync(path.join(FRONTEND_DIR, '.next'));

  if (state['pp-setup'] === true && !needSetup) {
    ok('Setup already completed — starting app.');
  } else {
    await runFullSetup();
    state = loadState();
    state['pp-setup'] = true;
    saveState(state);
    ok('Setup completed. Starting app ...');
  }
}

function installSignalHandlers() {
  const onSignal = (sig) => {
    log(`\nReceived ${sig} — stopping ShineCraft ...`);
    killAll();
    setTimeout(() => process.exit(sig === 'SIGINT' ? 0 : 1), 300).unref();
  };
  process.on('SIGINT', onSignal);
  process.on('SIGTERM', onSignal);
}

async function main() {
  openLog();
  const mode = process.argv[2] || 'run';
  fs.mkdirSync(LOGS_DIR, { recursive: true });
  try {
    if (mode === 'doctor') {
      await doctor();
      return;
    }
    if (mode === 'setup') {
      const node = await resolveNode();
      writeEnvIfMissing();
      await ensurePg();
      await ensureDeps(node);
      await ensureSchemaAndSeed(node);
      await ensureBuild(node);
      state = loadState(); state['pp-setup'] = true; saveState(state);
      ok('Full setup finished. You can now run: "launcher start" (or double-click start.bat / ShineCraft.exe).');
      return;
    }
    if (mode === 'start') {
      state = loadState();
      installSignalHandlers();
      const node = await resolveNode();
      await startServers(node);
      return;
    }
    // default: run
    state = loadState();
    installSignalHandlers();
    await smartRun();
    const n = await resolveNode();
    await startServers(n);
  } catch (e) {
    fail(String(e && e.message || e));
    process.exitCode = 1;
  }
}

main();