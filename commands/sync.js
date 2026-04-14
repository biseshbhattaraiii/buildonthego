const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const { slugify } = require('../lib/config');
const { getStartup, getAllStartups, updateStartup } = require('../lib/tracker');
const { syncMasterSheet, createStartupSheet, addRowToStartupSheet } = require('../lib/sheets');
const { createTask, getOrCreateList, getTasks, setupStartupInClickUp } = require('../lib/clickup');
const { getConfig, saveConfig } = require('../lib/config');

async function runSync(opts = {}) {
  console.log(chalk.cyan('Syncing to Google Sheets and ClickUp...\n'));

  if (opts.name) {
    const slug = slugify(opts.name);
    const startup = getStartup(slug);
    if (!startup) {
      console.log(chalk.red(`Startup "${opts.name}" not found.`));
      return;
    }
    await syncOne(startup);
  } else {
    await syncAll();
  }
}

async function syncAll() {
  const startups = getAllStartups();
  if (startups.length === 0) {
    console.log(chalk.yellow('No startups yet. Run: buildonthego idea'));
    return;
  }

  const config = getConfig();
  const googleConfigured = config.googleRefreshToken || (config.googleClientId && config.googleClientSecret);
  const clickupConfigured = !!(config.clickupToken && config.clickupSpaceId);

  if (googleConfigured) {
    const masterSpin = ora('Syncing master Google Sheet...').start();
    try {
      const { url } = await syncMasterSheet();
      if (!config.masterSheetUrl) {
        config.masterSheetUrl = url;
        saveConfig(config);
      }
      masterSpin.succeed(`Master sheet synced: ${chalk.underline(url)}`);
    } catch (e) {
      masterSpin.fail(`Master sheet sync failed: ${e.message}`);
    }
  } else {
    console.log(chalk.dim('  ↷ Google Sheets skipped (not configured)'));
  }

  if (!clickupConfigured) {
    console.log(chalk.dim('  ↷ ClickUp skipped (not configured)'));
  }

  console.log(`\nSyncing ${startups.length} startup(s)...\n`);
  for (const startup of startups) {
    await syncOne(startup, googleConfigured, clickupConfigured);
  }
}

async function syncOne(startup, googleConfigured = false, clickupConfigured = false) {
  const config = getConfig();
  const spin = ora(`Syncing ${startup.Name}...`).start();
  try {
    if (googleConfigured && !startup.SheetURL) {
      const { url } = await createStartupSheet(startup.Name, startup);
      updateStartup(startup.Slug, { SheetURL: url });
      startup.SheetURL = url;
    }

    if (clickupConfigured && !startup.ClickUpURL) {
      const { listUrl } = await setupStartupInClickUp(startup.Name, startup.Description, startup.Type);
      updateStartup(startup.Slug, { ClickUpURL: listUrl });
      startup.ClickUpURL = listUrl;
    }

    const parts = [];
    if (startup.SheetURL) parts.push(`Sheet: ${chalk.underline(startup.SheetURL)}`);
    if (startup.ClickUpURL) parts.push(`ClickUp: ${chalk.underline(startup.ClickUpURL)}`);
    const msg = parts.length
      ? `${startup.Name} synced → ${parts.join('  ')}`
      : `${startup.Name} synced (local only)`;
    spin.succeed(msg);
  } catch (e) {
    spin.fail(`${startup.Name} sync failed: ${e.message}`);
  }
}

module.exports = { runSync };
