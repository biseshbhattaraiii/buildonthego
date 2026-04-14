const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const { getStartupDir, slugify, getConfig } = require('../lib/config');
const { getStartup, updateStartup } = require('../lib/tracker');
const { setupFirebaseProject } = require('../lib/firebase');
const { setupGitHubRepo } = require('../lib/github');
const { getAllStartups } = require('../lib/tracker');

async function runScaffold(opts = {}) {
  console.log(chalk.cyan('Scaffolding your project...\n'));

  // Resolve startup name
  let name = opts.name;
  let type = opts.type;

  if (!name) {
    const startups = getAllStartups().filter(s => s.Status === 'idea' || s.Status === 'scaffolding');
    if (startups.length === 0) {
      console.log(chalk.yellow('No startups found. Run: buildonthego idea'));
      return;
    }
    const { chosen } = await inquirer.prompt([{
      type: 'list',
      name: 'chosen',
      message: 'Which startup to scaffold?',
      choices: startups.map(s => ({ name: `${s.Name} (${s.Type})`, value: s.Slug }))
    }]);
    name = chosen;
  }

  const slug = slugify(name);
  const startup = getStartup(slug);

  if (!startup) {
    console.log(chalk.red(`Startup "${name}" not found. Run: buildonthego idea first.`));
    return;
  }

  type = type || startup.Type;

  const startupDir = getStartupDir(slug);
  const srcDir = path.join(startupDir, 'src');

  console.log(`\nScaffolding ${chalk.bold(startup.Name)} (${type})\n`);

  updateStartup(slug, { Status: 'scaffolding' });

  if (type === 'web' || type === 'both') {
    await scaffoldWeb(slug, startup, srcDir, type);
  }

  if (type === 'mobile' || type === 'both') {
    const mobileDir = type === 'both' ? path.join(startupDir, 'src-mobile') : srcDir;
    await scaffoldMobile(slug, startup, mobileDir);
  }

  updateStartup(slug, { Status: 'in-progress', Progress: '10%' });

  console.log(`
${chalk.bold.green('✔ Scaffold complete!')}

${chalk.bold('Location:')} ~/startups/${slug}/
${type === 'web' || type === 'both' ? `${chalk.bold('Web:')}      ~/startups/${slug}/src/\n  Run: cd ~/startups/${slug}/src && npm run dev` : ''}
${type === 'mobile' || type === 'both' ? `${chalk.bold('Mobile:')}   ~/startups/${slug}/${type === 'both' ? 'src-mobile' : 'src'}/\n  Run: cd ~/startups/${slug}/${type === 'both' ? 'src-mobile' : 'src'} && npx expo start` : ''}

${chalk.bold('Next:')} buildonthego deploy --name "${startup.Name}"
`);
}

async function scaffoldWeb(slug, startup, srcDir, projectType) {
  const config = getConfig();

  // 1. Create Next.js app
  const nextSpin = ora('Creating Next.js app...').start();
  fs.ensureDirSync(srcDir);
  try {
    execSync(
      `npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --yes`,
      { cwd: srcDir, stdio: 'pipe' }
    );
    nextSpin.succeed('Next.js app created');
  } catch (e) {
    nextSpin.fail(`Next.js scaffold failed: ${e.message}`);
    return;
  }

  // 2. Install Firebase
  const firebasePkgSpin = ora('Installing Firebase SDK...').start();
  try {
    execSync('npm install firebase', { cwd: srcDir, stdio: 'pipe' });
    firebasePkgSpin.succeed('Firebase SDK installed');
  } catch {
    firebasePkgSpin.fail('Firebase SDK install failed');
  }

  // 3. Setup Firebase project
  const firebaseSpin = ora('Creating Firebase project...').start();
  let firebaseProjectId = '';
  let firebaseConfig = '';
  try {
    const result = await setupFirebaseProject(slug, startup.Name, srcDir);
    firebaseProjectId = result.projectId;
    firebaseConfig = result.webConfig || '';
    firebaseSpin.succeed(`Firebase project created: ${firebaseProjectId}`);
  } catch (e) {
    firebaseSpin.fail(`Firebase setup failed: ${e.message}`);
  }

  // 4. Copy template files
  const templateSpin = ora('Applying buildonthego templates...').start();
  applyWebTemplate(srcDir, startup, firebaseConfig, firebaseProjectId);
  templateSpin.succeed('Templates applied');

  // 5. Create GitHub repo
  const githubSpin = ora(`Creating GitHub repo: ${config.githubUsername}/${slug}...`).start();
  let repoUrl = '';
  try {
    repoUrl = await setupGitHubRepo(slug, startup.Description, srcDir);
    updateStartup(slug, { GitHub: repoUrl });
    githubSpin.succeed(`GitHub repo: ${chalk.underline(repoUrl)}`);
  } catch (e) {
    githubSpin.fail(`GitHub repo creation failed: ${e.message}`);
  }
}

async function scaffoldMobile(slug, startup, mobileDir) {
  const config = getConfig();

  // 1. Create Expo app
  const expoSpin = ora('Creating Expo app...').start();
  fs.ensureDirSync(path.dirname(mobileDir));
  try {
    execSync(
      `npx create-expo-app@latest ${path.basename(mobileDir)} --template tabs`,
      { cwd: path.dirname(mobileDir), stdio: 'pipe' }
    );
    expoSpin.succeed('Expo app created');
  } catch (e) {
    expoSpin.fail(`Expo scaffold failed: ${e.message}`);
    return;
  }

  // 2. Install NativeWind + Firebase
  const pkgSpin = ora('Installing NativeWind + Firebase...').start();
  try {
    execSync('npm install nativewind firebase', { cwd: mobileDir, stdio: 'pipe' });
    execSync('npm install --save-dev tailwindcss@3.3.2', { cwd: mobileDir, stdio: 'pipe' });
    pkgSpin.succeed('NativeWind + Firebase installed');
  } catch {
    pkgSpin.fail('Package install failed');
  }

  // 3. Apply mobile template
  const templateSpin = ora('Applying mobile templates...').start();
  applyMobileTemplate(mobileDir, startup);
  templateSpin.succeed('Mobile templates applied');

  // 4. Init EAS
  const easSpin = ora('Initializing EAS...').start();
  try {
    const { initEASProject } = require('../lib/expo');
    await initEASProject(mobileDir, slug);
    easSpin.succeed('EAS initialized');
  } catch (e) {
    easSpin.warn(`EAS init skipped: ${e.message}`);
  }
}

function applyWebTemplate(srcDir, startup, firebaseConfig, projectId) {
  // .env.local
  const envContent = `# Firebase Config — ${startup.Name}
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${projectId}.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=${projectId}
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${projectId}.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
`;
  fs.writeFileSync(path.join(srcDir, '.env.local'), envContent);
  fs.writeFileSync(path.join(srcDir, '.env.example'), envContent);

  // lib/firebase.ts
  const firebaseLibDir = path.join(srcDir, 'src', 'lib');
  fs.ensureDirSync(firebaseLibDir);
  fs.writeFileSync(path.join(firebaseLibDir, 'firebase.ts'), `import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
`);

  // Add .gitignore entry for .env.local
  const gitignorePath = path.join(srcDir, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const existing = fs.readFileSync(gitignorePath, 'utf8');
    if (!existing.includes('.env.local')) {
      fs.appendFileSync(gitignorePath, '\n.env.local\n');
    }
  }
}

function applyMobileTemplate(mobileDir, startup) {
  // tailwind.config.js for NativeWind
  fs.writeFileSync(path.join(mobileDir, 'tailwind.config.js'), `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [],
};
`);

  // babel.config.js for NativeWind
  fs.writeFileSync(path.join(mobileDir, 'babel.config.js'), `module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['nativewind/babel'],
  };
};
`);

  // lib/firebase.ts
  const libDir = path.join(mobileDir, 'lib');
  fs.ensureDirSync(libDir);
  fs.writeFileSync(path.join(libDir, 'firebase.ts'), `import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;
`);

  // .env
  fs.writeFileSync(path.join(mobileDir, '.env'), `EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
`);
}

module.exports = { runScaffold };
