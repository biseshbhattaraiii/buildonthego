const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const fs = require('fs-extra');
const path = require('path');
const { getStartupDir, slugify } = require('../lib/config');
const { addStartup, createStartupExcel, getStartup } = require('../lib/tracker');
const { setupStartupInClickUp } = require('../lib/clickup');
const { createStartupSheet, syncMasterSheet } = require('../lib/sheets');
const { saveConfig, getConfig } = require('../lib/config');

async function runIdea(opts = {}) {
  console.log(chalk.cyan('Let\'s capture your startup idea.\n'));

  // Step 1: Basic info
  const basicAnswers = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'What is the name of your app / startup?',
      default: opts.name || '',
      validate: v => v.trim() !== '' || 'Name is required'
    },
    {
      type: 'editor',
      name: 'description',
      message: 'Describe your idea (be as detailed as possible):',
      default: opts.desc || ''
    },
    {
      type: 'list',
      name: 'type',
      message: 'What type of app is this?',
      choices: [
        { name: 'Web App (Next.js + Firebase + Vercel)', value: 'web' },
        { name: 'Mobile App (Expo + React Native + EAS)', value: 'mobile' },
        { name: 'Both Web + Mobile', value: 'both' }
      ]
    },
    {
      type: 'list',
      name: 'industry',
      message: 'Which industry?',
      choices: [
        'Fintech', 'Healthtech', 'Edtech', 'E-commerce', 'SaaS',
        'Social', 'Marketplace', 'Productivity', 'Entertainment',
        'Travel', 'Food & Beverage', 'Real Estate', 'Other'
      ]
    },
    {
      type: 'input',
      name: 'targetAudience',
      message: 'Who is the target audience?',
      validate: v => v.trim() !== '' || 'Required'
    },
    {
      type: 'input',
      name: 'problem',
      message: 'What core problem does it solve?',
      validate: v => v.trim() !== '' || 'Required'
    },
    {
      type: 'input',
      name: 'coreFeatues',
      message: 'List the top 3-5 core features (comma separated):',
      validate: v => v.trim() !== '' || 'Required'
    },
    {
      type: 'list',
      name: 'monetization',
      message: 'Monetization model?',
      choices: ['Subscription', 'Freemium', 'One-time purchase', 'Marketplace commission', 'Ads', 'Enterprise', 'Not decided']
    },
    {
      type: 'confirm',
      name: 'isPrivate',
      message: 'Should the GitHub repo be private?',
      default: true
    }
  ]);

  const slug = slugify(basicAnswers.name);
  const startupDir = getStartupDir(slug);

  // Check if already exists
  if (getStartup(slug)) {
    const { overwrite } = await inquirer.prompt([{
      type: 'confirm',
      name: 'overwrite',
      message: `Startup "${basicAnswers.name}" already exists. Continue and update it?`,
      default: false
    }]);
    if (!overwrite) return;
  }

  // Step 2: Create folder structure
  const structureSpin = ora('Creating startup folder structure...').start();
  fs.ensureDirSync(path.join(startupDir, 'src'));
  fs.ensureDirSync(path.join(startupDir, 'assets'));
  fs.ensureDirSync(path.join(startupDir, 'docs'));
  structureSpin.succeed(`Created: ~/startups/${slug}/`);

  // Step 3: Generate spec
  const specSpin = ora('Generating spec.md...').start();
  const specContent = generateSpec(basicAnswers);
  fs.writeFileSync(path.join(startupDir, 'spec.md'), specContent);
  specSpin.succeed('spec.md generated');

  // Step 4: Generate test cases
  const testSpin = ora('Generating test cases...').start();
  const testContent = generateTestCases(basicAnswers);
  fs.ensureDirSync(path.join(startupDir, 'docs'));
  fs.writeFileSync(path.join(startupDir, 'docs', 'test-cases.md'), testContent);
  testSpin.succeed('docs/test-cases.md generated');

  // Step 5: Generate roadmap
  const roadmapContent = generateRoadmap(basicAnswers);
  fs.writeFileSync(path.join(startupDir, 'docs', 'roadmap.md'), roadmapContent);

  // Step 6: Add to master tracker
  const trackerSpin = ora('Adding to startups tracker...').start();
  const startup = addStartup({
    name: basicAnswers.name,
    type: basicAnswers.type,
    description: basicAnswers.description.substring(0, 200),
    industry: basicAnswers.industry
  });
  trackerSpin.succeed('Added to ~/startups/startups.csv');

  // Step 7: Create Excel progress file
  const excelSpin = ora('Creating progress.xlsx...').start();
  await createStartupExcel(slug);
  excelSpin.succeed(`Created: ~/startups/${slug}/progress.xlsx`);

  // Step 8: ClickUp setup
  const clickupSpin = ora('Setting up ClickUp list and tasks...').start();
  let clickupUrl = '';
  try {
    const { listUrl } = await setupStartupInClickUp(basicAnswers.name, basicAnswers.description, basicAnswers.type);
    clickupUrl = listUrl;
    clickupSpin.succeed(`ClickUp list created: ${chalk.underline(listUrl)}`);
  } catch (e) {
    clickupSpin.fail(`ClickUp setup failed: ${e.message}`);
  }

  // Step 9: Google Sheet for this startup (only if Google is configured)
  const config = getConfig();
  let sheetUrl = '';
  if (config.googleRefreshToken || (config.googleClientId && config.googleClientSecret)) {
    const sheetSpin = ora('Creating Google Sheet for this startup...').start();
    try {
      const updatedStartup = { ...startup, ClickUpURL: clickupUrl };
      const { url } = await createStartupSheet(basicAnswers.name, updatedStartup);
      sheetUrl = url;
      sheetSpin.succeed(`Sheet created: ${chalk.underline(url)}`);
    } catch (e) {
      sheetSpin.fail(`Google Sheet creation failed: ${e.message}`);
    }
  } else {
    console.log(chalk.dim('  ↷ Google Sheets skipped (not configured — run buildonthego init to add)'));
  }

  // Step 10: Update tracker with URLs
  if (clickupUrl || sheetUrl) {
    const { updateStartup } = require('../lib/tracker');
    updateStartup(slug, { ClickUpURL: clickupUrl, SheetURL: sheetUrl });
    try { await syncMasterSheet(); } catch { /* skip if Google not configured */ }
  }

  // Done
  console.log(`
${chalk.bold.green('✔ Idea captured!')}

${chalk.bold('Startup:')}  ${basicAnswers.name}
${chalk.bold('Type:')}     ${basicAnswers.type}
${chalk.bold('Folder:')}   ~/startups/${slug}/

${chalk.bold('Files created:')}
  📄 spec.md
  📄 docs/test-cases.md
  📄 docs/roadmap.md
  📊 progress.xlsx
${clickupUrl ? `  🔗 ClickUp: ${chalk.underline(clickupUrl)}` : ''}
${sheetUrl ? `  🔗 Sheet:   ${chalk.underline(sheetUrl)}` : ''}

${chalk.bold('Next steps:')}
  1. Review ${chalk.cyan(`~/startups/${slug}/spec.md`)}
  2. Run ${chalk.cyan(`buildonthego scaffold --name "${basicAnswers.name}" --type ${basicAnswers.type}`)}
  3. Or open Claude Code and use ${chalk.cyan('/build')}
`);
}

// ─── Spec Generator ───────────────────────────────────────────────────────────

function generateSpec(answers) {
  const features = answers.coreFeatues.split(',').map(f => `- ${f.trim()}`).join('\n');
  const date = new Date().toISOString().split('T')[0];

  return `# ${answers.name} — Product Specification

> **Industry:** ${answers.industry}
> **Type:** ${answers.type}
> **Status:** Idea
> **Created:** ${date}

---

## 1. Problem Statement

${answers.problem}

## 2. Target Audience

${answers.targetAudience}

## 3. Solution Overview

${answers.description}

## 4. Core Features

${features}

## 5. Monetization

${answers.monetization}

## 6. Tech Stack

${answers.type === 'web' || answers.type === 'both' ? `### Web
- **Framework:** Next.js 14 (App Router)
- **Styling:** TailwindCSS
- **Backend/Auth/DB:** Firebase (Auth, Firestore, Storage)
- **Deployment:** Vercel
` : ''}
${answers.type === 'mobile' || answers.type === 'both' ? `### Mobile
- **Framework:** Expo (React Native)
- **Styling:** NativeWind (TailwindCSS)
- **Backend/Auth/DB:** Firebase (Auth, Firestore, Storage)
- **Build/Deploy:** EAS (Expo Application Services)
` : ''}

## 7. Key User Flows

### Flow 1: Onboarding
1. User lands on app
2. User signs up / logs in (Firebase Auth)
3. User completes profile setup
4. User is taken to dashboard

### Flow 2: Core Action
1. [Define the primary action users take]
2. [Step 2]
3. [Step 3]

## 8. Data Models

\`\`\`
users/
  {userId}/
    name: string
    email: string
    createdAt: timestamp
    [add more fields]

[add more collections]
\`\`\`

## 9. Out of Scope (v1)

- [ ] Advanced analytics
- [ ] Third-party integrations
- [ ] Admin dashboard
- [ ] [Add more]

## 10. Success Metrics

- [ ] 100 users in first month
- [ ] Core flow completion rate > 60%
- [ ] [Add more]

---

*Generated by BuildOnTheGo — review and update this spec before scaffolding.*
`;
}

// ─── Test Cases Generator ─────────────────────────────────────────────────────

function generateTestCases(answers) {
  const date = new Date().toISOString().split('T')[0];
  return `# ${answers.name} — Test Cases

> **Generated:** ${date}
> **Type:** ${answers.type}

---

## Authentication

| ID | Test Case | Expected Result | Status |
|----|-----------|-----------------|--------|
| TC-001 | User can sign up with email/password | Account created, user redirected to dashboard | ⬜ |
| TC-002 | User can log in with valid credentials | Login successful, session created | ⬜ |
| TC-003 | User cannot log in with wrong password | Error message shown | ⬜ |
| TC-004 | User can reset password via email | Reset email sent | ⬜ |
| TC-005 | User can log out | Session cleared, redirected to login | ⬜ |

## Core Features

| ID | Test Case | Expected Result | Status |
|----|-----------|-----------------|--------|
| TC-010 | [Feature 1] happy path | [Expected] | ⬜ |
| TC-011 | [Feature 1] edge case | [Expected] | ⬜ |
| TC-012 | [Feature 2] happy path | [Expected] | ⬜ |
| TC-013 | [Feature 2] error state | [Expected] | ⬜ |

## Data Validation

| ID | Test Case | Expected Result | Status |
|----|-----------|-----------------|--------|
| TC-020 | Required fields are validated | Form shows errors for empty required fields | ⬜ |
| TC-021 | Email format is validated | Invalid email shows error | ⬜ |
| TC-022 | Input is sanitized | XSS attempts are neutralized | ⬜ |

## Navigation / UX

| ID | Test Case | Expected Result | Status |
|----|-----------|-----------------|--------|
| TC-030 | All navigation links work | No broken links | ⬜ |
| TC-031 | App works on mobile viewport | Responsive layout, no overflow | ⬜ |
| TC-032 | App works offline (if applicable) | Graceful offline message shown | ⬜ |

## Performance

| ID | Test Case | Expected Result | Status |
|----|-----------|-----------------|--------|
| TC-040 | Initial page load | < 3 seconds on 4G | ⬜ |
| TC-041 | Firestore queries | < 500ms response | ⬜ |

---

**Status Legend:** ⬜ Pending | ✅ Passed | ❌ Failed | 🔄 In Progress

*Update this file as you build. Add test cases for each new feature.*
`;
}

// ─── Roadmap Generator ────────────────────────────────────────────────────────

function generateRoadmap(answers) {
  const date = new Date().toISOString().split('T')[0];
  return `# ${answers.name} — Roadmap

> **Created:** ${date}

---

## Phase 1 — Foundation (Week 1-2)
- [ ] Finalize spec
- [ ] Scaffold project (buildonthego scaffold)
- [ ] Setup Firebase project
- [ ] Implement authentication
- [ ] Setup base layout / navigation

## Phase 2 — Core Features (Week 3-4)
- [ ] Implement core feature 1
- [ ] Implement core feature 2
- [ ] Implement core feature 3
- [ ] Write and run test cases
- [ ] Internal testing

## Phase 3 — Polish & Launch (Week 5-6)
- [ ] UI/UX polish
- [ ] Performance optimization
- [ ] Beta testing with 5-10 users
- [ ] Bug fixes from beta
- [ ] First deploy (buildonthego deploy)

## Phase 4 — Growth (Week 7+)
- [ ] User feedback collection
- [ ] Feature iteration
- [ ] Marketing / distribution
- [ ] Analytics setup

---

*Update progress % in startups.csv or run: buildonthego sync*
`;
}

module.exports = { runIdea };
