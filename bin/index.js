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
let projectRoot;  // declared here so the global error handler can safely reference it

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


// Step 1 — Check Node version (exit if < 16)
const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);
if (nodeMajor < 16) {
  console.error(
    chalk.red(`\n  ✖ QuickStack requires Node.js v16 or higher.\n`) +
    chalk.dim(`    You are running v${process.versions.node}\n`) +
    chalk.dim('    Download the latest LTS at https://nodejs.org\n')
  );
  process.exit(1);
}

// Step 2 — Parse project name from argv[2]
const rawName = process.argv[2];

// Step 3 — Validate project name (empty, invalid chars)
// ─────────────────────────────────────────────────────────────────────────────
const isHelpOrVersion = ['--help', '-h', '--version', '-v'].includes(rawName);

if (!isHelpOrVersion && (!rawName || rawName.startsWith('--'))) {
  console.error(
    chalk.red('\n  ✖ Project name is required.\n') +
    chalk.dim('    Usage: create-quickstack <project-name> [--auth]\n')
  );
  process.exit(1);
}

const INVALID_CHARS = /[^a-zA-Z0-9\s\-_]/;
if (INVALID_CHARS.test(rawName)) {
  console.error(
    chalk.red(`\n  ✖ Invalid project name: "${rawName}"\n`) +
    chalk.dim('    Allowed characters: letters, numbers, spaces, hyphens, underscores.\n') +
    chalk.dim('    Example: create-quickstack my-app\n')
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
projectRoot = path.resolve(process.cwd(), projectName);

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
  .name('create-quickstack')
  .description('Create a full-stack MERN app with QuickStack')
  .version('1.0.0', '-v, --version')
  .argument('[project-name]', 'Name of the project')
  .option('--auth', 'Add authentication (JWT + bcrypt)')
  .allowUnknownOption()
  .parse(process.argv);

const options = program.opts();

// ─────────────────────────────────────────────────────────────────────────────
// Step 7 — If no --auth flag → prompt user (y/N)
// ─────────────────────────────────────────────────────────────────────────────
let withAuth = Boolean(options.auth);

if (!options.auth) {
  withAuth = await confirm({
    message: 'Add authentication?',
    default: false,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 8 — Show setup summary, then ask for confirmation
// ─────────────────────────────────────────────────────────────────────────────
const divider = chalk.dim('  ' + '─'.repeat(43));

console.log('');
console.log(chalk.bold.cyan('  QuickStack') + chalk.dim(' — Project Setup Summary'));
console.log(divider);
console.log(`  ${chalk.dim('Project name')}   ${chalk.bold.white(projectName)}`);
console.log(`  ${chalk.dim('Location    ')}   ${chalk.white(projectRoot)}`);
console.log(`  ${chalk.dim('Auth        ')}   ${withAuth ? chalk.green('yes') : chalk.yellow('no')}`);
console.log(divider);
console.log('');

const proceed = await confirm({
  message: `Create project "${projectName}"?`,
  default: true,
});

if (!proceed) {
  console.log(chalk.yellow('\n  Cancelled. No files were created.\n'));
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
// Step 9.5 — Create .env from .env.example
// ─────────────────────────────────────────────────────────────────────────────
try {
  await fs.copy(
    path.join(projectRoot, '.env.example'),
    path.join(projectRoot, '.env')
  );
  console.log(chalk.blue('  ℹ') + chalk.dim(' Created .env from example'));
} catch (err) {
  await abort('Failed to create .env file.', err.message);
}

// ─────────────────────────────────────────────────────────────────────────────
// Step 10 — Replace {{PROJECT_NAME}} tokens
//           Targets: MONGO_URI in .env | name in package.json | title in README.md
// ─────────────────────────────────────────────────────────────────────────────
const TOKEN      = /\{\{PROJECT_NAME\}\}/g;
const tokenFiles = [
  path.join(projectRoot, '.env'),
  path.join(projectRoot, '.env.example'),
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
// Step 11 — Install Dependencies (Workspaces)
//           With NPM Workspaces configured, running `npm install` at the root
//           automatically installs and hoists dependencies for client/ & server/
// ─────────────────────────────────────────────────────────────────────────────

spinner = ora({ text: chalk.cyan('Installing project dependencies (this may take a minute)...'), color: 'cyan' }).start();
spinner.stop(); // Stop spinner before execSync so stdio:inherit prints cleanly

try {
  execSync('npm install', { cwd: projectRoot, stdio: 'inherit' });
} catch (err) {
  await abort('npm install failed.', err.message);
}

console.log(chalk.green('  ✔') + ' All project dependencies installed');
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
console.log(chalk.bold.green('  🚀 QuickStack setup complete!'));
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
