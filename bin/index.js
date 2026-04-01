#!/usr/bin/env node

// QuickStack CLI - Create MERN Project from templates

import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import { Command } from "commander";
import { confirm, select } from "@inquirer/prompts";
import fs from "fs-extra";

import { presets } from "../lib/presets.js";
import { features } from "../lib/features.js";
import * as engine from "../lib/engine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_TEMPLATE = path.join(__dirname, "..", "templates", "base");
const FEATURES_BASE_DIR = path.join(__dirname, "..", "templates");

// Global state for cleanup on failure
let projectRoot = null;

function isSafeToRemoveProjectRoot(root) {
  const resolvedTarget = path.resolve(root);

  const resolvedCwd = path.resolve(process.cwd());

  if (resolvedTarget === resolvedCwd) {
    return false;
  }

  const rel = path.relative(resolvedCwd, resolvedTarget);

  if (!rel || rel.startsWith("..") || path.isAbsolute(rel)) {
    return false;
  }

  return true;
}

function isWithinProjectRoot(root, candidate) {
  const rel = path.relative(path.resolve(root), path.resolve(candidate));

  return rel === "" || (!rel.startsWith("..") && !path.isAbsolute(rel));
}

async function run() {
  try {
    checkNode();
    checkTools();

    // Get basics from CLI arguments
    const { rawName, options } = parseArguments();
    const projectName = cleanName(rawName);
    projectRoot = path.resolve(process.cwd(), projectName);

    await checkFolder(projectName, projectRoot);

    const config = await askUser(options);

    showSummary(projectName, projectRoot, config, options);

    if (await getGoAhead(projectName, options)) {
      await buildCore(projectRoot, config);
      await patchFiles(projectRoot, projectName);
      if (options.noInstall) {
        console.log(
          chalk.yellow(
            "\n  ⚠ Skipping dependency installation (--no-install). Generated project is ready to run.\n",
          ),
        );
      } else {
        await installPackages(projectRoot);
      }
      await initGit(projectRoot);
      printDone(projectName);
    } else {
      console.log(chalk.yellow("\n  ⚠ Setup Cancelled.\n"));
    }
  } catch (err) {
    onError(err);
  }
}

function checkNode() {
  const nodeMajor = parseInt(process.versions.node.split(".")[0], 10);

  if (nodeMajor < 16) {
    console.error(
      chalk.red("\n  ✖ QuickStack requires Node.js v16 or higher.\n"),
    );
    process.exit(1);
  }
}

function checkTools() {
  try {
    execSync("npm --version", { stdio: "ignore" });
  } catch {
    console.error(
      chalk.red("\n  ✖ QuickStack requires npm to be installed.\n"),
    );
    process.exit(1);
  }

  try {
    execSync("git --version", { stdio: "ignore" });
  } catch {
    console.warn(
      chalk.yellow(
        "\n  ⚠ Warning: git is not installed. Git initialization will be skipped.\n",
      ),
    );
  }
}

function parseArguments() {
  const program = new Command();
  program
    .name("create-quickstack-app")
    .argument("[project-name]", "Name of the project")
    .option("--auth", "Add authentication (JWT + bcrypt)")
    .option("--latest", "Use the latest stack")
    .option("--stable", "Use the stable stack")
    .option("--yes", "Skip confirmation prompts")
    .option("--no-install", "Skip running npm install in the generated project")
    .parse(process.argv);

  const rawName = program.args[0];
  const options = program.opts();

  if (!rawName || rawName.startsWith("--")) {
    console.error(chalk.red("\n  ✖ Please provide a project name.\n"));
    process.exit(1);
  }

  return { rawName, options };
}

function cleanName(name) {
  const INVALID_CHARS = /[^a-zA-Z0-9\s\-_]/;
  if (INVALID_CHARS.test(name)) {
    console.error(chalk.red(`\n  ✖ Invalid project name: "${name}"\n`));
    process.exit(1);
  }
  const normalized = name.trim().toLowerCase().replace(/\s+/g, "-");
  if (
    !normalized ||
    normalized === "." ||
    normalized === ".." ||
    !/[a-z0-9]/.test(normalized)
  ) {
    console.error(
      chalk.red(
        `\n  ✖ Invalid project name: must be non-empty and include at least one letter or number.\n`,
      ),
    );
    process.exit(1);
  }
  return normalized;
}

async function checkFolder(name, root) {
  if (await fs.pathExists(root)) {
    console.error(chalk.red(`\n  ✖ Folder "${name}" already exists.\n`));
    process.exit(1);
  }
}

async function askUser(options) {
  if (options.latest && options.stable) {
    console.error(
      chalk.red("\n  ✖ Use either --latest or --stable, not both.\n"),
    );
    process.exit(1);
  }

  let stability = null;

  if (options.latest) {
    stability = "latest";
  } else if (options.stable) {
    stability = "stable";
  }

  if (!stability) {
    stability = await select({
      message: "Choose stability preset:",
      choices: [
        {
          name: "Latest - (React 19, Tailwind v4, Router v7)",
          value: "latest",
        },
        {
          name: "Stable - (React 18, Tailwind v3, Router v6)",
          value: "stable",
        },
      ],
    });
  }

  const preset = presets[stability];

  let withAuth = Boolean(options.auth);

  if (!options.auth) {
    withAuth = await confirm({
      message: "Add authentication?",
      default: false,
    });
  }

  const chosenFeatures = [];
  if (withAuth) {
    chosenFeatures.push("auth");
  }

  return { stability, preset, withAuth, chosenFeatures };
}

function showSummary(name, root, config, options) {
  const divider = chalk.dim("  " + "─".repeat(43));
  console.log("");
  console.log(
    chalk.bold.cyan("  QuickStack") + chalk.dim(" - Project Setup Summary"),
  );
  console.log(divider);
  console.log(`  ${chalk.dim("Project name")}   ${chalk.bold.white(name)}`);
  console.log(`  ${chalk.dim("Location    ")}   ${chalk.white(root)}`);
  console.log(
    `  ${chalk.dim("Stability   ")}   ${chalk.bold.cyan(config.preset.name)}`,
  );
  console.log(
    `  ${chalk.dim("Auth        ")}   ${config.withAuth ? chalk.green("yes") : chalk.yellow("no")}`,
  );
  console.log(
    `  ${chalk.dim("Install     ")}   ${
      options?.noInstall ? chalk.yellow("no") : chalk.green("yes")
    }`,
  );
  console.log(divider);
  console.log("");
}

async function getGoAhead(name, options) {
  if (options.yes) return true;
  return await confirm({
    message: `Ready to create project "${name}"?`,
    default: true,
  });
}

async function buildCore(root, config) {
  await fs.copy(BASE_TEMPLATE, root);
  console.log(
    chalk.blue("  ℹ") + chalk.dim(" Copying the core template files..."),
  );

  for (const featureKey of config.chosenFeatures) {
    const f = features[featureKey];
    if (!f?.templatePath) {
      throw new Error(`Unknown or misconfigured feature: "${featureKey}"`);
    }
    await fs.copy(path.join(FEATURES_BASE_DIR, f.templatePath), root);
    if (f.onApply) await f.onApply(root, config.preset);
    console.log(
      chalk.blue("  ℹ") +
        chalk.dim(` Merging ${f.name.toLowerCase()} modules...`),
    );
  }

  // Create everything for React, Tailwind, and Router versions
  await engine.updatePackages(root, config.preset, config, features);
  await engine.setupTailwind(root, config.preset);
  await engine.setupVite(root, config.preset);
  console.log(
    chalk.blue("  ℹ") +
      chalk.dim(
        ` Polishing your configuration for the ${config.preset.name} stack...`,
      ),
  );
}

async function patchFiles(root, name) {
  // Create .env from .env.example
  const envPath = path.join(root, ".env");
  const examplePath = path.join(root, ".env.example");
  if (await fs.pathExists(examplePath)) {
    await fs.copy(examplePath, envPath);
  }

  // Replace {{PROJECT_NAME}} under project root
  const rootResolved = path.resolve(root);

  const BINARY_EXTS = [
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".ico",
    ".pdf",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
    ".webp",
    ".zip",
  ];
  async function tokenizeFolder(dir) {
    const items = await fs.readdir(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      if (!isWithinProjectRoot(rootResolved, fullPath)) continue;

      const stat = await fs.lstat(fullPath);
      if (stat.isSymbolicLink()) continue;

      if (stat.isDirectory()) {
        if (item === "node_modules" || item === ".git") continue;
        await tokenizeFolder(fullPath);
      } else if (stat.isFile()) {
        const ext = path.extname(fullPath).toLowerCase();
        if (BINARY_EXTS.includes(ext)) continue;

        let content = await fs.readFile(fullPath, "utf8");
        if (content.includes("{{PROJECT_NAME}}")) {
          content = content.replace(/\{\{PROJECT_NAME\}\}/g, name);
          await fs.writeFile(fullPath, content, "utf8");
        }
      }
    }
  }

  await tokenizeFolder(root);
  console.log(
    chalk.blue("  ℹ") + chalk.dim(" All project tokens replaced successfully."),
  );
}

function installPackages(root) {
  console.log("");
  console.log(
    chalk.cyan("  ℹ ") +
      chalk.dim(
        "Installing project dependencies (this might take a minute)...",
      ),
  );

  try {
    execSync("npm install", { cwd: root, stdio: "inherit" });
    console.log(chalk.green("\n  ✔") + " Project dependencies installed.");
  } catch (err) {
    const detail = err?.message || String(err);
    const wrapped = new Error(`Dependency install failed: ${detail}`);
    wrapped.cause = err;
    throw wrapped;
  }
}

async function initGit(root) {
  try {
    execSync("git init -b main", { cwd: root, stdio: "ignore" });
  } catch {
    console.warn(
      chalk.yellow("  ⚠ git init failed - continuing regardless.\n"),
    );
  }
}

function printDone(name) {
  console.log("");
  console.log(chalk.bold.green("  🚀 QuickStack setup complete!"));
  console.log("");
  console.log(chalk.white("  Next steps:"));
  console.log(`    ${chalk.cyan(`cd ${name}`)}`);
  console.log(`    ${chalk.cyan("npm run dev")}`);
  console.log("");
}

function onError(err) {
  if (
    projectRoot &&
    fs.existsSync(projectRoot) &&
    isSafeToRemoveProjectRoot(projectRoot)
  ) {
    fs.removeSync(projectRoot);
  }
  let msg = err?.message || String(err);
  if (err?.cause?.message) msg += ` (${err.cause.message})`;
  console.error(
    chalk.red("  ✖ Something went wrong during the setup.\n") +
      chalk.dim(`    Error: ${msg}\n`),
  );
  process.exit(1);
}

run();
