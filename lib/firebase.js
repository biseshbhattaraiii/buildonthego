const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');
const { getConfig } = require('./config');

function runFirebase(command, cwd) {
  return execSync(`npx firebase-tools ${command}`, {
    cwd: cwd || process.cwd(),
    stdio: 'pipe',
    encoding: 'utf8'
  });
}

async function isLoggedIn() {
  try {
    const output = runFirebase('login:list');
    return output.includes('@');
  } catch {
    return false;
  }
}

async function login() {
  execSync('npx firebase-tools login', { stdio: 'inherit' });
}

async function createProject(projectId, displayName) {
  try {
    runFirebase(`projects:create ${projectId} --display-name "${displayName}"`);
    return projectId;
  } catch (e) {
    // Project may already exist
    if (e.message.includes('already exists')) return projectId;
    throw e;
  }
}

async function addWebApp(projectId, appDisplayName) {
  try {
    const output = runFirebase(`apps:create WEB "${appDisplayName}" --project ${projectId}`);
    return output;
  } catch (e) {
    return null;
  }
}

async function getWebConfig(projectId) {
  try {
    // List apps and get config for the first web app
    const appsOutput = runFirebase(`apps:list WEB --project ${projectId}`);
    const appIdMatch = appsOutput.match(/([0-9]+:[0-9]+:web:[a-f0-9]+)/);
    if (!appIdMatch) return null;

    const configOutput = runFirebase(`apps:sdkconfig WEB ${appIdMatch[1]} --project ${projectId}`);
    // Extract the config object from output
    const configMatch = configOutput.match(/const firebaseConfig = ({[\s\S]*?});/);
    if (!configMatch) return null;

    return configMatch[1].trim();
  } catch {
    return null;
  }
}

async function initFirestore(projectId, localPath) {
  const rulesContent = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`;
  fs.writeFileSync(path.join(localPath, 'firestore.rules'), rulesContent);

  const firebaseJson = {
    firestore: { rules: 'firestore.rules', indexes: 'firestore.indexes.json' },
    hosting: { public: 'out', ignore: ['firebase.json', '**/.*', '**/node_modules/**'] }
  };
  fs.writeJsonSync(path.join(localPath, 'firebase.json'), firebaseJson, { spaces: 2 });
  fs.writeJsonSync(path.join(localPath, 'firestore.indexes.json'), { indexes: [], fieldOverrides: [] }, { spaces: 2 });
}

async function setupFirebaseProject(slug, displayName, localPath) {
  const projectId = `botg-${slug}`.substring(0, 30).replace(/[^a-z0-9-]/g, '-');

  await createProject(projectId, displayName);
  await addWebApp(projectId, displayName);
  await initFirestore(projectId, localPath);

  const webConfig = await getWebConfig(projectId);
  return { projectId, webConfig };
}

module.exports = { isLoggedIn, login, createProject, addWebApp, getWebConfig, setupFirebaseProject };
