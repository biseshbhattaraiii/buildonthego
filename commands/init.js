const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const { saveConfig, getConfig, getStartupsDir, CONFIG_DIR } = require('../lib/config');
const { isLoggedIn, login } = require('../lib/firebase');
const { ensureMasterCSV } = require('../lib/tracker');
const { syncMasterSheet, getOrCreateMasterSheet } = require('../lib/sheets');

async function runInit() {
  console.log(chalk.cyan('Setting up BuildOnTheGo...\n'));

  const existingConfig = getConfig();

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'githubUsername',
      message: 'GitHub username:',
      default: existingConfig?.githubUsername || 'biseshbhattaraiii',
      validate: v => v.trim() !== '' || 'Required'
    },
    {
      type: 'password',
      name: 'githubToken',
      message: 'GitHub Personal Access Token (repo + workflow scopes):',
      default: existingConfig?.githubToken || '',
      validate: v => v.trim() !== '' || 'Required'
    },
    {
      type: 'password',
      name: 'clickupToken',
      message: 'ClickUp Personal API Token:',
      default: existingConfig?.clickupToken || '',
      validate: v => v.trim() !== '' || 'Required'
    },
    {
      type: 'editor',
      name: 'googleServiceAccountRaw',
      message: 'Paste your Google Service Account JSON (opens editor):',
      default: existingConfig?.googleServiceAccountRaw || '{}',
      validate: (v) => {
        try { JSON.parse(v); return true; } catch { return 'Must be valid JSON'; }
      }
    },
    {
      type: 'password',
      name: 'vercelToken',
      message: 'Vercel Personal Access Token:',
      default: existingConfig?.vercelToken || '',
      validate: v => v.trim() !== '' || 'Required'
    },
    {
      type: 'password',
      name: 'expoToken',
      message: 'Expo Access Token:',
      default: existingConfig?.expoToken || '',
      validate: v => v.trim() !== '' || 'Required'
    },
    {
      type: 'input',
      name: 'expoUsername',
      message: 'Expo username:',
      default: existingConfig?.expoUsername || '',
      validate: v => v.trim() !== '' || 'Required'
    }
  ]);

  const spinner = ora('Saving configuration...').start();

  const config = {
    initialized: true,
    githubUsername: answers.githubUsername.trim(),
    githubToken: answers.githubToken.trim(),
    clickupToken: answers.clickupToken.trim(),
    googleServiceAccount: JSON.parse(answers.googleServiceAccountRaw),
    googleServiceAccountRaw: answers.googleServiceAccountRaw,
    vercelToken: answers.vercelToken.trim(),
    expoToken: answers.expoToken.trim(),
    expoUsername: answers.expoUsername.trim(),
    // Preserve cached IDs from previous init
    clickupWorkspaceId: existingConfig?.clickupWorkspaceId,
    clickupSpaceId: existingConfig?.clickupSpaceId,
    masterSheetId: existingConfig?.masterSheetId
  };

  saveConfig(config);
  spinner.succeed('Configuration saved to ~/.buildonthego/config.json');

  // Setup startups folder
  const startupsSpin = ora('Creating ~/startups/ folder...').start();
  fs.ensureDirSync(getStartupsDir());
  ensureMasterCSV();
  startupsSpin.succeed(`Startups folder ready at ${getStartupsDir()}`);

  // Firebase login
  const firebaseSpin = ora('Checking Firebase login...').start();
  const loggedIn = await isLoggedIn();
  if (!loggedIn) {
    firebaseSpin.warn('Not logged into Firebase. Opening browser...');
    await login();
  } else {
    firebaseSpin.succeed('Firebase already authenticated');
  }

  // Setup master Google Sheet
  const sheetSpin = ora('Setting up master Google Sheet...').start();
  try {
    const { spreadsheetId, url } = await syncMasterSheet();
    const updatedConfig = getConfig();
    updatedConfig.masterSheetId = spreadsheetId;
    updatedConfig.masterSheetUrl = url;
    saveConfig(updatedConfig);
    sheetSpin.succeed(`Master sheet ready: ${chalk.underline(url)}`);
  } catch (e) {
    sheetSpin.fail(`Google Sheets setup failed: ${e.message}`);
    console.log(chalk.yellow('  → Check your Google Service Account JSON and that Sheets + Drive APIs are enabled'));
  }

  // Setup ClickUp space
  const clickupSpin = ora('Setting up ClickUp "startups" space...').start();
  try {
    const { getWorkspaceId, getOrCreateSpace } = require('../lib/clickup');
    const workspaceId = await getWorkspaceId();
    const spaceId = await getOrCreateSpace(workspaceId, 'startups');
    const updatedConfig = getConfig();
    updatedConfig.clickupWorkspaceId = workspaceId;
    updatedConfig.clickupSpaceId = spaceId;
    saveConfig(updatedConfig);
    clickupSpin.succeed(`ClickUp "startups" space ready`);
  } catch (e) {
    clickupSpin.fail(`ClickUp setup failed: ${e.message}`);
    console.log(chalk.yellow('  → Check your ClickUp API token'));
  }

  // Copy Claude commands to ~/.claude/commands/
  const claudeSpin = ora('Installing Claude slash commands...').start();
  try {
    const sourceCmdsDir = path.join(__dirname, '..', 'claude', 'commands');
    const targetCmdsDir = path.join(os.homedir(), '.claude', 'commands');
    fs.ensureDirSync(targetCmdsDir);
    fs.copySync(sourceCmdsDir, targetCmdsDir, { overwrite: true });
    claudeSpin.succeed('Claude slash commands installed → /idea, /build, /deploy, /sync');
  } catch (e) {
    claudeSpin.fail(`Claude commands install failed: ${e.message}`);
  }

  console.log(`
${chalk.bold.green('✔ Setup complete!')}

${chalk.bold('Available commands:')}
  ${chalk.cyan('buildonthego idea')}     — capture a new startup idea
  ${chalk.cyan('buildonthego scaffold')} — scaffold a project (web/mobile/both)
  ${chalk.cyan('buildonthego deploy')}   — deploy to Vercel / EAS
  ${chalk.cyan('buildonthego sync')}     — sync to Google Sheets + ClickUp
  ${chalk.cyan('buildonthego status')}   — view all startups

${chalk.bold('In Claude Code, use:')}
  ${chalk.cyan('/idea')}   — AI-powered idea validation + spec
  ${chalk.cyan('/build')}  — scaffold + build flow
  ${chalk.cyan('/deploy')} — deploy flow
  ${chalk.cyan('/sync')}   — sync flow
`);
}

module.exports = { runInit };
