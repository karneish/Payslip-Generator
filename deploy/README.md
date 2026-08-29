# ShineCraft — Portable Launcher

Turns the ShineCraft payslip + attendance app into a self-contained Windows
package. On a fresh computer it checks every dependency, auto-downloads what is
missing, configures a PostgreSQL database, and starts the app — then opens it in
your default browser at `http://localhost:3000`.

## Included in this folder

| File               | Purpose                                                        |
|--------------------|----------------------------------------------------------------|
| `launcher.js`      | Main orchestrator (also compiled into `ShineCraft.exe`)        |
| `run.ps1`          | PowerShell bootstrap — finds a Node.js, else downloads one     |
| `setup.bat`        | Double-click: full first-time setup, then start                |
| `start.bat`        | Double-click: normal start (installs anything missing)         |
| `doctor.bat`       | Double-click: environment self-check without starting the app  |
| `package.ps1`      | Builds `ShineCraft.exe` + a distributable ZIP                  |
| `README.md`        | This file                                                      |

`deploy/tools/`, `deploy/data/`, `deploy/logs/` and `deploy/state.json` are
created at runtime and are ignored by git.

## Usage

On a machine that already has the project checked out (internet available on
first run):

```
deploy\setup.bat      # one-time: install everything and start
deploy\start.bat      # any later launch
deploy\doctor.bat     # check the environment only
```

Everything is skipped once already done (tracked in `deploy/state.json`), so
re-running `setup.bat` is harmless.

## What happens on first run

1. Picks a Node.js — uses your system Node if present, otherwise downloads a
   portable one from `nodejs.org`.
2. Picks PostgreSQL — uses the service on port 5432 if present, otherwise
   downloads a portable PostgreSQL 16.4 into `deploy/tools/` and runs its own
   instance on port 5492 in `deploy/data/`.
3. Creates the `payslip_shinecraft` database and user if missing.
4. Writes `backend/.env` and `frontend/.env.local` from built-in defaults.
5. `npm ci` for backend and frontend (uses a `deploy/tools` Chromium cache for
   PDF generation).
6. `prisma generate` + `prisma db push` + `prisma/seed.ts` (admin user:
   `admin@shinecraft.com` / `Admin@123`).
7. Builds the Prisma-required Prisma Query Engines for the running platform if
   absent.
8. Builds backend (`tsc`) and frontend (`next build`).
9. Starts both and opens the browser.

## Packaging for the higher official

```
deploy\package.ps1
```

Produces `deploy\release\ShineCraft-<version>.zip` containing:

```
ShineCraft-<version>\
  ShineCraft.exe          <- one-click launcher
  backend\                <- source + lockfiles (node_modules excluded)
  frontend\               <- source (next/src, no build artifacts)
  deploy\                 <- scripts + README (installed tools excluded)
```

### On the target computer

The ZIP is small (a few MB of Kotlin-free, er, source only). First launch
needs internet to download Node.js, PostgreSQL, and npm packages. Start it with
a double-click on `ShineCraft.exe` (or `deploy\setup.bat`). The console window
shows progress; keep it open while using the app — closing/Ctrl+C stops the app
gracefully.

### Notes / environment overrides

Set these as environment variables before launching if defaults aren't right:

| Variable                 | Default                    | Meaning                                  |
|--------------------------|----------------------------|------------------------------------------|
| `SC_FORCE_PORTABLE_NODE` | (use system)               | `1` to always install portable Node      |
| `SC_NODE_VERSION`        | latest Node 22 LTS         | portable Node version, e.g. `v22.12.0`   |
| `SC_FORCE_PORTABLE_PG`   | (use service on :5432)     | `1` to always install portable Postgres  |
| `SC_PG_VERSION`          | `16.4-1`                   | portable Postgres binaries version       |
| `SC_PG_PORT`             | `5492`                     | portable Postgres port                   |
| `SC_DB_HOST/PORT`        | `localhost:5432`           | Postgres connection for the app DB       |
| `SC_DB_USER`             | `postgres`                 | app DB user                              |
| `SC_DB_PASSWORD`         | `root123`                  | app DB password (used only at first run) |
| `SC_DB_NAME`             | `payslip_shinecraft`       | app database name                        |
| `SC_BACKEND_PORT`        | `5000`                     | API port                                 |
| `SC_FRONTEND_PORT`       | `3000`                     | UI port                                  |
| `SC_PUPPETEER_CACHE_DIR` | `deploy\tools\chromium`    | browser download cache for PDFs          |

## Troubleshooting

- **Antivirus flags `ShineCraft.exe` or the browser download** — add an
  exclusion; a portable Chromium and Postgres behave like fresh program installs.
- **Port 3000/5000 already in use** — set `SC_FRONTEND_PORT` / `SC_BACKEND_PORT`.
- **PDF "/tmp" path on Windows** — puppeteer needs `%TEMP%` writable; the
  launcher sets `TMPDIR` for server processes.
- **PostgreSQL 5432 taken by another instance** — the sanitizer/user DB install
  is skipped and the existing service is reused.
- **Diagnostics** — run `deploy\doctor.bat` and inspect `deploy\logs\launcher.log`.