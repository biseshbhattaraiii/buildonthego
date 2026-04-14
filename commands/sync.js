const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const { slugify } = require('../lib/config');
const { getStartup, getAllStartups, updateStartup } = require('../lib/tracker');
const { syncMasterSheet, createStartupSheet, addRowToStartupSheet } = require('../lib/sheets');
const { createTask } = require('../lib/clickup');
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

  // Sync master sheet
  const masterSpin = ora('Syncing master Google Sheet...').start();
  try {
    const { url } = await syncMasterSheet();
    const config = getConfig();
    if (!config.masterSheetUrl) {
      config.masterSheetUrl = url;
      saveConfig(config);
    }
    masterSpin.succeed(`Master sheet synced: ${chalk.underline(url)}`);
  } catch (e) {
    masterSpin.fail(`Master sheet sync failed: ${e.message}`);
  }

  console.log(`\nSyncing ${startups.length} startup(s)...\n`);
  for (const startup of startups) {
    await syncOne(startup);
  }
}

async function syncOne(startup) {
  const spin = ora(`Syncing ${startup.Name}...`).start();
  try {
    // If no sheet URL yet, create one
    if (!startup.SheetURL) {
      const { url, spreadsheetId } = await createStartupSheet(startup.Name, startup);
      updateStartup(startup.Slug, { SheetURL: url });
      startup.SheetURL = url;
      startup.sheetId = spreadsheetId;
    }

    spin.succeed(`${startup.Name} synced → ${chalk.underline(startup.SheetURL)}`);
  } catch (e) {
    spin.fail(`${startup.Name} sync failed: ${e.message}`);
  }
}

module.exports = { runSync };
