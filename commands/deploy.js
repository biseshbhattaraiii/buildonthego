const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const path = require('path');
const { getStartupDir, slugify } = require('../lib/config');
const { getStartup, updateStartup, addTicketToExcel } = require('../lib/tracker');
const { deployProject } = require('../lib/vercel');
const { buildApp, submitApp } = require('../lib/expo');
const { getAllStartups } = require('../lib/tracker');
const { format } = require('date-fns');
const { syncMasterSheet } = require('../lib/sheets');

async function runDeploy(opts = {}) {
  console.log(chalk.cyan('Deploying your app...\n'));

  let name = opts.name;
  let platform = opts.platform;

  if (!name) {
    const startups = getAllStartups().filter(s => s.Status === 'in-progress' || s.Status === 'scaffolding');
    if (startups.length === 0) {
      console.log(chalk.yellow('No in-progress startups. Run: buildonthego scaffold first.'));
      return;
    }
    const { chosen } = await inquirer.prompt([{
      type: 'list',
      name: 'chosen',
      message: 'Which startup to deploy?',
      choices: startups.map(s => ({ name: `${s.Name} (${s.Type})`, value: s.Slug }))
    }]);
    name = chosen;
  }

  const slug = slugify(name);
  const startup = getStartup(slug);
  if (!startup) {
    console.log(chalk.red(`Startup "${name}" not found.`));
    return;
  }

  platform = platform || startup.Type;

  // Ask for deploy type if not specified and it's 'both'
  if (!opts.platform && startup.Type === 'both') {
    const { deployPlatform } = await inquirer.prompt([{
      type: 'list',
      name: 'deployPlatform',
      message: 'Deploy which platform?',
      choices: ['web', 'mobile', 'both']
    }]);
    platform = deployPlatform;
  }

  const startupDir = getStartupDir(slug);

  if (platform === 'web' || platform === 'both') {
    await deployWeb(slug, startup, startupDir);
  }

  if (platform === 'mobile' || platform === 'both') {
    await deployMobile(slug, startup, startupDir);
  }

  // Sync after deploy
  await syncMasterSheet();

  console.log(`\n${chalk.bold.green('✔ Deploy complete!')}`);
}

async function deployWeb(slug, startup, startupDir) {
  const srcDir = path.join(startupDir, 'src');
  const projectName = slug;

  const spin = ora(`Deploying ${startup.Name} to Vercel...`).start();
  try {
    const url = await deployProject(srcDir, projectName);
    updateStartup(slug, { VercelURL: url, Status: 'deployed' });

    // Log to Excel
    await addTicketToExcel(slug, 'Deploy History', {
      version: 'v1.0',
      date: format(new Date(), 'yyyy-MM-dd'),
      platform: 'web',
      status: 'success',
      url,
      notes: 'First deploy via buildonthego'
    });

    spin.succeed(`Deployed to Vercel: ${chalk.underline(url)}`);
  } catch (e) {
    spin.fail(`Vercel deploy failed: ${e.message}`);

    await addTicketToExcel(slug, 'Deploy History', {
      version: 'v1.0',
      date: format(new Date(), 'yyyy-MM-dd'),
      platform: 'web',
      status: 'failed',
      url: '',
      notes: e.message
    });
  }
}

async function deployMobile(slug, startup, startupDir) {
  const mobileDir = startup.Type === 'both'
    ? path.join(startupDir, 'src-mobile')
    : path.join(startupDir, 'src');

  const { profileChoice } = await inquirer.prompt([{
    type: 'list',
    name: 'profileChoice',
    message: 'EAS build profile?',
    choices: [
      { name: 'Preview (internal testing)', value: 'preview' },
      { name: 'Production', value: 'production' }
    ]
  }]);

  const spin = ora(`Building ${startup.Name} with EAS (${profileChoice})...`).start();
  try {
    await buildApp(mobileDir, 'all', profileChoice);

    const expoUrl = `https://expo.dev/accounts/${slug}`;
    updateStartup(slug, { ExpoURL: expoUrl });

    await addTicketToExcel(slug, 'Deploy History', {
      version: 'v1.0',
      date: format(new Date(), 'yyyy-MM-dd'),
      platform: 'mobile',
      status: 'success',
      url: expoUrl,
      notes: `EAS build (${profileChoice})`
    });

    spin.succeed(`EAS build complete: ${chalk.underline(expoUrl)}`);
  } catch (e) {
    spin.fail(`EAS build failed: ${e.message}`);
  }
}

module.exports = { runDeploy };
