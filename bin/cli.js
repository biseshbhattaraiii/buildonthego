#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const { getConfig } = require('../lib/config');
const pkg = require('../package.json');

const BANNER = `
${chalk.bold.cyan('╔══════════════════════════════════╗')}
${chalk.bold.cyan('║')}   ${chalk.bold.white('BUILD ON THE GO')} ${chalk.dim('v' + pkg.version)}        ${chalk.bold.cyan('║')}
${chalk.bold.cyan('║')}   ${chalk.dim('Spec-driven startup builder')}      ${chalk.bold.cyan('║')}
${chalk.bold.cyan('╚══════════════════════════════════╝')}
`;

program
  .name('buildonthego')
  .description('Build startups on the go — spec-driven, AI-powered')
  .version(pkg.version)
  .hook('preAction', async (thisCommand) => {
    const skipInit = ['init'].includes(thisCommand.name());
    if (!skipInit) {
      const config = getConfig();
      if (!config || !config.initialized) {
        console.log(chalk.yellow('\n⚠  Not initialized. Running setup...\n'));
        const { runInit } = require('../commands/init');
        await runInit();
      }
    }
  });

program
  .command('init')
  .description('First-time setup — API keys, Firebase login, folder structure')
  .action(async () => {
    console.log(BANNER);
    const { runInit } = require('../commands/init');
    await runInit();
  });

program
  .command('idea')
  .description('Capture a new startup idea — validates, builds spec, creates structure')
  .option('-n, --name <name>', 'App name (skips prompt)')
  .option('-d, --desc <description>', 'Idea description (skips prompt)')
  .action(async (opts) => {
    console.log(BANNER);
    const { runIdea } = require('../commands/idea');
    await runIdea(opts);
  });

program
  .command('scaffold')
  .description('Scaffold the project — Next.js or Expo with Firebase')
  .option('-n, --name <name>', 'Startup name')
  .option('-t, --type <type>', 'Project type: web | mobile | both')
  .action(async (opts) => {
    console.log(BANNER);
    const { runScaffold } = require('../commands/scaffold');
    await runScaffold(opts);
  });

program
  .command('deploy')
  .description('Deploy web to Vercel or mobile to EAS')
  .option('-n, --name <name>', 'Startup name')
  .option('-p, --platform <platform>', 'Platform: web | mobile | both')
  .action(async (opts) => {
    console.log(BANNER);
    const { runDeploy } = require('../commands/deploy');
    await runDeploy(opts);
  });

program
  .command('sync')
  .description('Sync progress to Google Sheets and ClickUp')
  .option('-n, --name <name>', 'Startup name (syncs all if omitted)')
  .action(async (opts) => {
    console.log(BANNER);
    const { runSync } = require('../commands/sync');
    await runSync(opts);
  });

program
  .command('status')
  .description('Show all startups with progress and status')
  .action(async () => {
    console.log(BANNER);
    const { runStatus } = require('../commands/status');
    await runStatus();
  });

program
  .command('ticket')
  .description('Add a bug, improvement, or task ticket to a startup')
  .option('-n, --name <name>', 'Startup name')
  .option('-t, --type <type>', 'Ticket type: bug | improvement | task')
  .action(async (opts) => {
    console.log(BANNER);
    const { runTicket } = require('../commands/ticket');
    await runTicket(opts);
  });

// Show banner on bare command
if (process.argv.length === 2) {
  console.log(BANNER);
  program.help();
}

program.parse(process.argv);
