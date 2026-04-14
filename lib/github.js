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
  const fs = require('fs-extra');
  const path = require('path');

  // Ensure there is at least one file to commit
  const readmePath = path.join(localPath, 'README.md');
  if (!fs.existsSync(readmePath)) {
    const name = path.basename(localPath);
    fs.writeFileSync(readmePath, `# ${name}\n\nScaffolded by [BuildOnTheGo](https://github.com/biseshbhattaraiii/buildonthego)\n`);
  }

  // Init only if not already a git repo
  const isGitRepo = fs.existsSync(path.join(localPath, '.git'));
  if (!isGitRepo) {
    execSync(`cd "${localPath}" && git init && git branch -M ${defaultBranch}`, { stdio: 'pipe' });
  }

  // Stage + commit only if there are changes
  try {
    execSync(`cd "${localPath}" && git add . && git diff --cached --quiet || git commit -m "chore: initial scaffold via buildonthego"`, { stdio: 'pipe' });
  } catch { /* nothing to commit */ }

  // Set remote and push
  execSync(`cd "${localPath}" && (git remote set-url origin ${repoUrl} 2>/dev/null || git remote add origin ${repoUrl})`, { stdio: 'pipe' });
  execSync(`cd "${localPath}" && git push -u origin ${defaultBranch}`, { stdio: 'pipe' });
}

async function setupGitHubRepo(slug, description, localPath) {
  const config = getConfig();
  let repo = await repoExists(slug);
  if (!repo) {
    repo = await createRepo(slug, description, true);
  }
  // Use HTTPS with token (no SSH key needed)
  const httpsUrl = `https://${config.githubToken}@github.com/${config.githubUsername}/${slug}.git`;
  initAndPush(localPath, httpsUrl);
  return repo.html_url;
}

module.exports = { createRepo, repoExists, initAndPush, setupGitHubRepo };
