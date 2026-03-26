#!/usr/bin/env node

import { execSync }      from 'child_process';
import path              from 'path';
import { fileURLToPath } from 'url';
import chalk             from 'chalk';
import ora               from 'ora';
import { Command }       from 'commander';
import { confirm }       from '@inquirer/prompts';
import fs                from 'fs-extra';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const TEMPLATE_DIR      = path.join(__dirname, '..', 'templates', 'fullstack');
const AUTH_TEMPLATE_DIR = path.join(__dirname, '..', 'templates', 'fullstack-auth');

// Module-level so abort() and the global handler can stop it from any point
let spinner = null;

// ─── Global catch ─────────────────────────────────────────────────────────────
// Catches any unhandled exception or rejected promise not caught elsewhere.
// Stops the spinner (if running), cleans up, and exits with code 1.
const globalErrorHandler = async (err) => {
  spinner?.stop();
  if (typeof projectRoot !== 'undefined' && await fs.pathExists(projectRoot)) {
    await fs.remove(projectRoot);
  }
  console.error(
    chalk.red('\n  ✖ Setup failed. Please check logs and try again.\n') +
    chalk.dim(`    ${err?.message ?? err}\n`)
  );
  process.exit(1);
};

process.on('uncaughtException',  globalErrorHandler);
process.on('unhandledRejection', globalErrorHandler);

async function abort(message, detail = '') {
  spinner?.stop();
  if (await fs.pathExists(projectRoot)) {
    await fs.remove(projectRoot);
    console.error(chalk.dim(`  Cleaned up  → removed ${projectRoot}`));
  }
  console.error(
    chalk.red(`\n  ✖ ${message}\n`) +
    (detail ? chalk.dim(`    ${detail}\n`) : '')
  );
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 1 — Check Node version (exit if < 16)
// ─────────────────────────────────────────────────────────────────────────────
const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
if (nodeMajor < 16) {
  console.error(
    chalk.red(`\n  ✖ StackForge requires Node.js v16 or higher.\n`) +
    chalk.dim(`    You are running v${process.versions.node}\n`) +
    chalk.dim('    Download the latest LTS at https://nodejs.org\n')
  );
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 2 — Parse project name from argv[2]
// ─────────────────────────────────────────────────────────────────────────────
const rawName = process.argv[2];

// ─────────────────────────────────────────────────────────────────────────────
// Step 3 — Validate project name (empty, invalid chars)
// ─────────────────────────────────────────────────────────────────────────────
if (!rawName || rawName.startsWith('--')) {
  console.error(
    chalk.red('\n  ✖ Project name is required.\n') +
    chalk.dim('    Usage: create-stackforge <project-name> [--auth]\n')
  );
  process.exit(1);
}

const INVALID_CHARS = /[^a-zA-Z0-9\s\-_]/;
if (INVALID_CHARS.test(rawName)) {
  console.error(
    chalk.red(`\n  ✖ Invalid project name: "${rawName}"\n`) +
    chalk.dim('    Allowed characters: letters, numbers, spaces, hyphens, underscores.\n') +
    chalk.dim('    Example: create-stackforge my-app\n')
  );
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 4 — Sanitize name (lowercase, spaces → hyphens)
// ─────────────────────────────────────────────────────────────────────────────
const projectName = rawName.trim().toLowerCase().replace(/\s+/g, '-');

// ─────────────────────────────────────────────────────────────────────────────
// Step 5 — Check if target folder already exists (exit if yes)
// ─────────────────────────────────────────────────────────────────────────────
const projectRoot = path.resolve(process.cwd(), projectName);

if (await fs.pathExists(projectRoot)) {
  console.error(
    chalk.red(`\n  ✖ Directory "${projectName}" already exists.\n`) +
    chalk.dim(`    Path: ${projectRoot}\n\n`) +
    chalk.dim('    Either choose a different project name, or remove the existing folder:\n') +
    chalk.dim(`    rm -rf ${projectName}\n`)
  );
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 6 — Parse CLI flags (--auth) with commander
// ─────────────────────────────────────────────────────────────────────────────
const program = new Command();

program
  .name('create-stackforge')
  .description('Scaffold a full-stack MERN project with StackForge')
  .version('1.0.0', '-v, --version')
  .argument('[project-name]', 'Name of the project')
  .option('--auth', 'Include authentication scaffolding (JWT + bcrypt)')
  .allowUnknownOption()
  .parse(process.argv);

const options = program.opts();

// ─────────────────────────────────────────────────────────────────────────────
// Step 7 — If no --auth flag → prompt user (y/N)
// ─────────────────────────────────────────────────────────────────────────────
let withAuth = Boolean(options.auth);

if (!options.auth) {
  withAuth = await confirm({
    message: 'Include authentication scaffolding?',
    default: false,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 8 — Show setup summary, then ask for confirmation
// ─────────────────────────────────────────────────────────────────────────────
const divider = chalk.dim('  ' + '─'.repeat(43));

console.log('');
console.log(chalk.bold.cyan('  StackForge') + chalk.dim(' — Project Setup Summary'));
console.log(divider);
console.log(`  ${chalk.dim('Project name')}   ${chalk.bold.white(projectName)}`);
console.log(`  ${chalk.dim('Location    ')}   ${chalk.white(projectRoot)}`);
console.log(`  ${chalk.dim('Auth        ')}   ${withAuth ? chalk.green('yes') : chalk.yellow('no')}`);
console.log(divider);
console.log('');

const proceed = await confirm({
  message: 'Scaffold this project?',
  default: true,
});

if (!proceed) {
  console.log(chalk.yellow('\n  Aborted — no files were created.\n'));
  process.exit(0);
}

console.log('');

// ─────────────────────────────────────────────────────────────────────────────
// Step 9 — Copy template files using fs-extra
//           Pass 1: always copy the base fullstack template
//           Pass 2: if --auth, merge fullstack-auth/ on top
//                   fs-extra.copy() overwrites existing files, so App.jsx and
//                   any other overlapping paths are replaced with auth versions
// ─────────────────────────────────────────────────────────────────────────────
try {
  await fs.copy(TEMPLATE_DIR, projectRoot);
  console.log(chalk.blue('  ℹ') + chalk.dim(' Copied base template'));
} catch (err) {
  await abort('Failed to copy base template files.', err.message);
}

if (withAuth) {
  try {
    await fs.copy(AUTH_TEMPLATE_DIR, projectRoot);
    console.log(chalk.blue('  ℹ') + chalk.dim(' Merged auth overlay   (controllers · models · routes · middleware · pages)'));
  } catch (err) {
    await abort('Failed to merge auth template files.', err.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 10 — Replace {{PROJECT_NAME}} tokens
//           Targets: MONGO_URI in .env | name in package.json | title in README.md
// ─────────────────────────────────────────────────────────────────────────────
const TOKEN      = /\{\{PROJECT_NAME\}\}/g;
const tokenFiles = [
  path.join(projectRoot, '.env'),
  path.join(projectRoot, 'package.json'),
  path.join(projectRoot, 'README.md'),
  path.join(projectRoot, 'client', 'index.html'),
  path.join(projectRoot, 'client', 'src', 'pages', 'Home.jsx'),
];

for (const filePath of tokenFiles) {
  try {
    const original = await fs.readFile(filePath, 'utf8');
    const replaced = original.replace(TOKEN, projectName);
    await fs.writeFile(filePath, replaced, 'utf8');
    console.log(chalk.blue('  ℹ') + chalk.dim(` Tokens replaced      (${path.relative(projectRoot, filePath)})`));
  } catch (err) {
    await abort(`Token replacement failed in ${path.basename(filePath)}.`, err.message);
  }
}

console.log('');

// ─────────────────────────────────────────────────────────────────────────────
// Step 11 — Spin up ora spinner — 'Installing root dependencies...'
// Steps 12-16: stop spinner before each execSync (stdio:inherit conflicts with
//              spinner frames), restart with updated text for next phase.
// Step 17: final spinner.succeed()
// ─────────────────────────────────────────────────────────────────────────────

// ── Step 11 / 12 — Root ───────────────────────────────────────────────────────
spinner = ora({ text: chalk.cyan('Installing root dependencies...'), color: 'cyan' }).start();
spinner.stop();
try {
  execSync('npm install', { cwd: projectRoot, stdio: 'inherit' });
} catch (err) {
  await abort('Root npm install failed.', err.message);
}
console.log(chalk.green('  ✔') + ' Root dependencies installed');

// ── Step 13 / 14 — Client ─────────────────────────────────────────────────────
spinner.start(chalk.cyan('Installing client dependencies...'));
spinner.stop();
try {
  execSync('npm install', { cwd: path.join(projectRoot, 'client'), stdio: 'inherit' });
} catch (err) {
  await abort('Client npm install failed.', err.message);
}
console.log(chalk.green('  ✔') + ' Client dependencies installed');

// ── Step 15 / 16 — Server ─────────────────────────────────────────────────────
spinner.start(chalk.cyan('Installing server dependencies...'));
spinner.stop();
try {
  execSync('npm install', { cwd: path.join(projectRoot, 'server'), stdio: 'inherit' });
} catch (err) {
  await abort('Server npm install failed.', err.message);
}
console.log(chalk.green('  ✔') + ' Server dependencies installed');

// ── Step 17 — Spinner succeed ─────────────────────────────────────────────────
spinner.succeed(chalk.green('All dependencies installed.'));
console.log('');

// ─────────────────────────────────────────────────────────────────────────────
// Step 18 — git init -b main
//           Non-critical — failure prints a yellow warning and continues.
//           (-b main forces branch name, avoids master/main inconsistency)
// ─────────────────────────────────────────────────────────────────────────────
try {
  execSync('git init -b main', { cwd: projectRoot, stdio: 'inherit' });
} catch {
  console.warn(
    chalk.yellow('  ⚠ git init failed — repository was not initialised.\n') +
    chalk.dim('    You can run "git init" manually inside the project folder.\n')
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 19 — Print success message (Section 13.1 exact format)
// ─────────────────────────────────────────────────────────────────────────────
console.log('');
console.log(chalk.bold.green('  🚀 StackForge setup complete!'));
console.log('');
console.log(chalk.white('  Next steps:'));
console.log(`    ${chalk.cyan(`cd ${projectName}`)}`);
console.log(`    ${chalk.cyan('npm run dev')}`);
console.log('');
console.log(`    ${chalk.dim('Frontend →')} ${chalk.cyan('http://localhost:5173')}`);
console.log(`    ${chalk.dim('Backend  →')} ${chalk.cyan('http://localhost:5000')}`);
console.log('');

// ─────────────────────────────────────────────────────────────────────────────
// Step 20 — Exit cleanly
// ─────────────────────────────────────────────────────────────────────────────
process.exit(0);
