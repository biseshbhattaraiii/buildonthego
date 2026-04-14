const { execSync, spawnSync } = require('child_process');
const { getConfig } = require('./config');

function getEnv() {
  const config = getConfig();
  return { ...process.env, EXPO_TOKEN: config.expoToken };
}

function runEAS(command, cwd) {
  return execSync(`npx eas-cli ${command}`, {
    cwd,
    env: getEnv(),
    stdio: 'pipe',
    encoding: 'utf8'
  });
}

async function initEASProject(localPath, projectName) {
  // Initialize EAS project
  try {
    runEAS(`init --id auto --non-interactive`, localPath);
  } catch {
    // May already be initialized
  }
}

async function buildApp(localPath, platform = 'all', profile = 'preview') {
  const platformFlag = platform === 'both' ? 'all' : platform;
  const output = runEAS(`build --platform ${platformFlag} --profile ${profile} --non-interactive`, localPath);
  return output;
}

async function submitApp(localPath, platform = 'all') {
  const platformFlag = platform === 'both' ? 'all' : platform;
  const output = runEAS(`submit --platform ${platformFlag} --latest --non-interactive`, localPath);
  return output;
}

async function publishUpdate(localPath, message = 'Update via buildonthego') {
  const output = runEAS(`update --message "${message}" --non-interactive`, localPath);
  return output;
}

async function getProjectUrl(slug) {
  const config = getConfig();
  return `https://expo.dev/@${config.expoUsername || 'me'}/${slug}`;
}

module.exports = { initEASProject, buildApp, submitApp, publishUpdate, getProjectUrl };
