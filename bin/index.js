#!/usr/bin/env node

/**
 * QuickStack CLI: The Simple Scaffolder
 *
 * This orchestrator is a simple collection of functions that
 * talk through the process of building your new MERN project.
 */

import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import chalk from "chalk";
import ora from "ora";
import { Command } from "commander";
import { confirm, select } from "@inquirer/prompts";
import fs from "fs-extra";

// Library helpers for the "secret sauce"
import { presets } from "../lib/presets.js";
import { features } from "../lib/features.js";
import * as engine from "../lib/engine.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_TEMPLATE = path.join(__dirname, "..", "templates", "base");
const FEATURES_BASE_DIR = path.join(__dirname, "..", "templates");

// Global state for cleanup on catastrophic failure
let spinner = null;
let projectRoot = null;

/**
 * ─── Main Logic ───────────────────────────────────────────────────────────
 */
async function run() {
  try {
    checkNode();

    // 1. Get the basics from the CLI arguments
    const { rawName, options } = parseArguments();
    const projectName = cleanName(rawName);
    projectRoot = path.resolve(process.cwd(), projectName);

    await checkFolder(projectName, projectRoot);

    // 2. Ask the user what they want to build
    const config = await askUser(options);

    showSummary(projectName, projectRoot, config);

    // 3. Let's do the work!
    if (await getGoAhead(projectName, options)) {
      await buildCore(projectRoot, config);
      await patchFiles(projectRoot, projectName);
      await installPackages(projectRoot);
      await initGit(projectRoot);
      printDone(projectName);
    } else {
      console.log(chalk.yellow("\n  ⚠ Setup Cancelled.\n"));
    }
  } catch (err) {
    onError(err);
  }
}

/**
 * ─── Orchestrator Steps ──────────────────────────────────────────────────────
 */

function checkNode() {
  const nodeMajor = parseInt(process.versions.node.split(".")[0], 10);
  if (nodeMajor < 16) {
    console.error(
      chalk.red("\n  ✖ QuickStack requires Node.js v16 or higher.\n"),
    );
    process.exit(1);
  }
}

function parseArguments() {
  const program = new Command();
  program
    .name("create-quickstack")
    .argument("[project-name]", "Name of the project")
    .option("--auth", "Add authentication (JWT + bcrypt)")
    .option("--latest", "Use the latest cutting-edge stack")
    .option("--stable", "Use the stable standard stack")
    .option("--yes", "Skip confirmation prompts")
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
  return name.trim().toLowerCase().replace(/\s+/g, "-");
}

async function checkFolder(name, root) {
  if (await fs.pathExists(root)) {
    console.error(chalk.red(`\n  ✖ Folder "${name}" already exists.\n`));
    process.exit(1);
  }
}

async function askUser(options) {
  let stability = null;

  if (options.latest) stability = "latest";
  else if (options.stable) stability = "stable";

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
  if (withAuth) chosenFeatures.push("auth");

  return { stability, preset, withAuth, chosenFeatures };
}

function showSummary(name, root, config) {
  const divider = chalk.dim("  " + "─".repeat(43));
  console.log("");
  console.log(
    chalk.bold.cyan("  QuickStack") + chalk.dim(" — Project Setup Summary"),
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
  // 1. Start with the clean template files
  await fs.copy(BASE_TEMPLATE, root);
  console.log(
    chalk.blue("  ℹ") + chalk.dim(" Copying the core template files..."),
  );

  // 2. Add extra modules like Authentication
  for (const featureKey of config.chosenFeatures) {
    const f = features[featureKey];
    await fs.copy(path.join(FEATURES_BASE_DIR, f.templatePath), root);
    if (f.onApply) await f.onApply(root, config.preset);
    console.log(
      chalk.blue("  ℹ") +
        chalk.dim(` Merging ${f.name.toLowerCase()} modules...`),
    );
  }

  // 3. Patch everything for React, Tailwind, and Router versions
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
  // 1. Create your first environment file if it doesn't exist
  const envPath = path.join(root, ".env");
  const examplePath = path.join(root, ".env.example");
  if (await fs.pathExists(examplePath)) {
    await fs.copy(examplePath, envPath);
  }

  // 2. Recursive Token Scanner (The "Handwritten" way)
  // This replaces {{PROJECT_NAME}} in EVERY file we just scaffolded.
  // Much cleaner than a hardcoded array!
  async function tokenizeFolder(dir) {
    const items = await fs.readdir(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = await fs.stat(fullPath);

      if (stat.isDirectory()) {
        // Skip node_modules and .git if they somehow exist
        if (item === "node_modules" || item === ".git") continue;
        await tokenizeFolder(fullPath);
      } else {
        let content = await fs.readFile(fullPath, "utf8");
        if (content.includes("{{PROJECT_NAME}}")) {
          content = content.replace(/\{\{PROJECT_NAME\}\}/g, name);
          await fs.writeFile(fullPath, content, "utf8");
        }
      }
    }
  }

  await tokenizeFolder(root);
  console.log(chalk.blue("  ℹ") + chalk.dim(" All project tokens replaced successfully."));
}

async function installPackages(root) {
  console.log("");
  spinner = ora({
    text: chalk.cyan(
      "Installing project dependencies (this might take a minute)...",
    ),
    color: "cyan",
  }).start();
  spinner.stop();

  try {
    execSync("npm install", { cwd: root, stdio: "inherit" });
    console.log(chalk.green("  ✔") + " Project dependencies installed.");
  } catch (err) {
    throw new Error("npm install failed.");
  }
}

async function initGit(root) {
  try {
    execSync("git init -b main", { cwd: root, stdio: "ignore" });
  } catch {
    console.warn(
      chalk.yellow("  ⚠ git init failed — continuing regardless.\n"),
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
  spinner?.stop();
  if (projectRoot && fs.existsSync(projectRoot)) {
    fs.removeSync(projectRoot);
  }
  console.error(
    chalk.red("  ✖ Something went wrong during the setup.\n") +
      chalk.dim(`    Error: ${err.message}\n`),
  );
  process.exit(1);
}

// Kick off the script
run();
