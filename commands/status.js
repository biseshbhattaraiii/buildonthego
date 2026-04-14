const chalk = require('chalk');
const { getAllStartups } = require('../lib/tracker');
const { getConfig } = require('../lib/config');

const STATUS_COLOR = {
  'idea':         chalk.blue,
  'scaffolding':  chalk.yellow,
  'in-progress':  chalk.cyan,
  'deployed':     chalk.green,
  'paused':       chalk.gray,
  'archived':     chalk.dim
};

function progressBar(pct) {
  const num = parseInt(pct) || 0;
  const filled = Math.round(num / 10);
  const empty = 10 - filled;
  return chalk.green('█'.repeat(filled)) + chalk.dim('░'.repeat(empty)) + ` ${num}%`;
}

async function runStatus() {
  const startups = getAllStartups();
  const config = getConfig();

  if (startups.length === 0) {
    console.log(chalk.yellow('\nNo startups yet.\n'));
    console.log(`Start with: ${chalk.cyan('buildonthego idea')}\n`);
    return;
  }

  console.log(chalk.bold(`\nStartups (${startups.length} total)\n`));
  console.log(chalk.dim('─'.repeat(80)));

  for (const s of startups) {
    const statusFn = STATUS_COLOR[s.Status] || chalk.white;
    const typeIcon = s.Type === 'web' ? '🌐' : s.Type === 'mobile' ? '📱' : '🌐📱';

    console.log(`${chalk.bold(s.ID)} ${chalk.bold.white(s.Name)} ${typeIcon}`);
    console.log(`   Status:   ${statusFn(s.Status)}`);
    console.log(`   Progress: ${progressBar(s.Progress)}`);
    console.log(`   Created:  ${chalk.dim(s.Created)}`);
    if (s.GitHub)     console.log(`   GitHub:   ${chalk.underline.dim(s.GitHub)}`);
    if (s.VercelURL)  console.log(`   Vercel:   ${chalk.underline.cyan(s.VercelURL)}`);
    if (s.ExpoURL)    console.log(`   Expo:     ${chalk.underline.cyan(s.ExpoURL)}`);
    if (s.ClickUpURL) console.log(`   ClickUp:  ${chalk.underline.dim(s.ClickUpURL)}`);
    if (s.SheetURL)   console.log(`   Sheet:    ${chalk.underline.dim(s.SheetURL)}`);
    console.log(chalk.dim('─'.repeat(80)));
  }

  if (config.masterSheetUrl) {
    console.log(`\n📊 Master sheet: ${chalk.underline(config.masterSheetUrl)}\n`);
  }
}

module.exports = { runStatus };
