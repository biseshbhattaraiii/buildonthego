const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const { slugify } = require('../lib/config');
const { getStartup, getAllStartups, addTicketToExcel } = require('../lib/tracker');
const { createTask, getOrCreateList } = require('../lib/clickup');
const { addRowToStartupSheet } = require('../lib/sheets');
const { getConfig } = require('../lib/config');
const { format } = require('date-fns');

async function runTicket(opts = {}) {
  console.log(chalk.cyan('Adding a ticket...\n'));

  let name = opts.name;
  let type = opts.type;

  if (!name) {
    const startups = getAllStartups();
    if (startups.length === 0) {
      console.log(chalk.yellow('No startups found.'));
      return;
    }
    const { chosen } = await inquirer.prompt([{
      type: 'list',
      name: 'chosen',
      message: 'Which startup?',
      choices: startups.map(s => ({ name: `${s.Name} (${s.Status})`, value: s.Slug }))
    }]);
    name = chosen;
  }

  const slug = slugify(name);
  const startup = getStartup(slug);
  if (!startup) {
    console.log(chalk.red(`Startup "${name}" not found.`));
    return;
  }

  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'type',
      message: 'Ticket type?',
      choices: ['bug', 'improvement', 'task'],
      default: type || 'task'
    },
    {
      type: 'input',
      name: 'title',
      message: 'Title:',
      validate: v => v.trim() !== '' || 'Required'
    },
    {
      type: 'editor',
      name: 'description',
      message: 'Description:'
    },
    {
      type: 'list',
      name: 'priority',
      message: 'Priority?',
      choices: ['critical', 'high', 'medium', 'low'],
      default: 'medium'
    },
    ...(type === 'bug' || answers?.type === 'bug' ? [{
      type: 'editor',
      name: 'steps',
      message: 'Steps to reproduce:'
    }, {
      type: 'list',
      name: 'severity',
      message: 'Severity?',
      choices: ['critical', 'high', 'medium', 'low']
    }] : [])
  ]);

  const spin = ora('Creating ticket...').start();

  try {
    // Add to Excel
    const sheetName = answers.type === 'bug' ? 'Bugs'
      : answers.type === 'improvement' ? 'Improvements'
      : 'Tickets';

    const rowData = answers.type === 'bug'
      ? { title: answers.title, description: answers.description, severity: answers.severity || answers.priority, status: 'open', steps: answers.steps || '' }
      : { title: answers.title, description: answers.description, priority: answers.priority, status: 'open' };

    await addTicketToExcel(slug, sheetName, rowData);

    // Create ClickUp task
    const config = getConfig();
    let clickupTaskUrl = '';
    if (config.clickupSpaceId) {
      const listId = await getOrCreateList(config.clickupSpaceId, startup.Name);
      const task = await createTask(listId, {
        title: `[${answers.type.toUpperCase()}] ${answers.title}`,
        description: answers.description,
        priority: answers.priority,
        status: 'open'
      });
      clickupTaskUrl = task.url;
    }

    spin.succeed(`Ticket created: ${answers.title}`);
    if (clickupTaskUrl) {
      console.log(`  ClickUp: ${chalk.underline(clickupTaskUrl)}`);
    }
    console.log(`  Excel:   ~/startups/${slug}/progress.xlsx → ${sheetName}`);
  } catch (e) {
    spin.fail(`Ticket creation failed: ${e.message}`);
  }
}

module.exports = { runTicket };
