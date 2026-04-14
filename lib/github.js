const axios = require('axios');
const { execSync } = require('child_process');
const { getConfig } = require('./config');

function client() {
  const config = getConfig();
  return axios.create({
    baseURL: 'https://api.github.com',
    headers: {
      Authorization: `token ${config.githubToken}`,
      Accept: 'application/vnd.github.v3+json'
    }
  });
}

async function createRepo(name, description, isPrivate = true) {
  const res = await client().post('/user/repos', {
    name,
    description,
    private: isPrivate,
    auto_init: false
  });
  return res.data;
}

async function repoExists(name) {
  const config = getConfig();
  try {
    const res = await client().get(`/repos/${config.githubUsername}/${name}`);
    return res.data;
  } catch {
    return null;
  }
}

function initAndPush(localPath, repoUrl, defaultBranch = 'main') {
  const commands = [
    `cd "${localPath}" && git init`,
    `cd "${localPath}" && git add .`,
    `cd "${localPath}" && git commit -m "chore: initial scaffold via buildonthego"`,
    `cd "${localPath}" && git branch -M ${defaultBranch}`,
    `cd "${localPath}" && git remote add origin ${repoUrl}`,
    `cd "${localPath}" && git push -u origin ${defaultBranch}`
  ];
  for (const cmd of commands) {
    execSync(cmd, { stdio: 'pipe' });
  }
}

async function setupGitHubRepo(slug, description, localPath) {
  const config = getConfig();
  let repo = await repoExists(slug);
  if (!repo) {
    repo = await createRepo(slug, description, true);
  }
  initAndPush(localPath, repo.ssh_url);
  return repo.html_url;
}

module.exports = { createRepo, repoExists, initAndPush, setupGitHubRepo };
