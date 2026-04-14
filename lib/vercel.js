const axios = require('axios');
const { execSync } = require('child_process');
const { getConfig } = require('./config');

function client() {
  const config = getConfig();
  return axios.create({
    baseURL: 'https://api.vercel.com',
    headers: { Authorization: `Bearer ${config.vercelToken}` }
  });
}

async function getProjects() {
  const res = await client().get('/v9/projects');
  return res.data.projects;
}

async function projectExists(name) {
  try {
    const res = await client().get(`/v9/projects/${name}`);
    return res.data;
  } catch {
    return null;
  }
}

async function deployProject(localPath, projectName) {
  // Use vercel CLI for actual deployment
  const config = getConfig();
  const env = { ...process.env, VERCEL_TOKEN: config.vercelToken };

  // Link or create project
  execSync(
    `cd "${localPath}" && npx vercel --token ${config.vercelToken} --yes --prod --name ${projectName}`,
    { stdio: 'pipe', env }
  );

  // Get the deployment URL
  const project = await projectExists(projectName);
  if (project && project.latestDeployments && project.latestDeployments[0]) {
    return `https://${project.latestDeployments[0].url}`;
  }
  return `https://${projectName}.vercel.app`;
}

async function getDeploymentUrl(projectName) {
  try {
    const res = await client().get(`/v9/projects/${projectName}/deployments?limit=1`);
    const deployment = res.data.deployments[0];
    return deployment ? `https://${deployment.url}` : null;
  } catch {
    return null;
  }
}

module.exports = { getProjects, projectExists, deployProject, getDeploymentUrl };
