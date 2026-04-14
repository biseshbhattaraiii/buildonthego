const axios = require('axios');
const { getConfig } = require('./config');

const BASE_URL = 'https://api.clickup.com/api/v2';

function client() {
  const config = getConfig();
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      Authorization: config.clickupToken,
      'Content-Type': 'application/json'
    }
  });
}

// ─── Workspace / Space ───────────────────────────────────────────────────────

async function getWorkspaceId() {
  const config = getConfig();
  if (config.clickupWorkspaceId) return config.clickupWorkspaceId;
  const res = await client().get('/team');
  const team = res.data.teams[0];
  return team.id;
}

async function getOrCreateSpace(workspaceId, spaceName = 'startups') {
  const config = getConfig();
  if (config.clickupSpaceId) return config.clickupSpaceId;

  const res = await client().get(`/team/${workspaceId}/space`);
  const existing = res.data.spaces.find(s => s.name.toLowerCase() === spaceName.toLowerCase());
  if (existing) return existing.id;

  const created = await client().post(`/team/${workspaceId}/space`, {
    name: spaceName,
    multiple_assignees: true,
    features: { due_dates: { enabled: true }, time_tracking: { enabled: true } }
  });
  return created.data.id;
}

// ─── Lists (one per startup) ──────────────────────────────────────────────────

async function getOrCreateList(spaceId, startupName) {
  const res = await client().get(`/space/${spaceId}/list`);
  const existing = res.data.lists.find(l => l.name.toLowerCase() === startupName.toLowerCase());
  if (existing) return existing.id;

  const created = await client().post(`/space/${spaceId}/list`, { name: startupName });
  return created.data.id;
}

// ─── Tasks ───────────────────────────────────────────────────────────────────

// Status map — aligned to ClickUp workspace defaults
const STATUS_MAP = {
  'open':        'to do',
  'to do':       'to do',
  'in-progress': 'in progress',
  'in progress': 'in progress',
  'done':        'complete',
  'complete':    'complete',
  'closed':      'complete'
};

async function createTask(listId, { title, description, priority = 3, status = 'to do', dueDate }) {
  const priorityMap = { critical: 1, high: 2, medium: 3, low: 4 };
  const payload = {
    name: title,
    description,
    priority: typeof priority === 'string' ? priorityMap[priority] || 3 : priority,
    status: STATUS_MAP[status] || 'to do'
  };
  if (dueDate) payload.due_date = new Date(dueDate).getTime();

  const res = await client().post(`/list/${listId}/task`, payload);
  return res.data;
}

async function updateTaskStatus(taskId, status) {
  const res = await client().put(`/task/${taskId}`, { status: STATUS_MAP[status] || status });
  return res.data;
}

async function getTasks(listId) {
  const res = await client().get(`/list/${listId}/task`);
  return res.data.tasks;
}

// ─── High-level: setup a startup in ClickUp ──────────────────────────────────

async function setupStartupInClickUp(startupName, description, type) {
  const workspaceId = await getWorkspaceId();
  const spaceId = await getOrCreateSpace(workspaceId, 'startups');
  const listId = await getOrCreateList(spaceId, startupName);

  // Create default tasks
  const defaultTasks = [
    { title: '📋 Review & finalize spec', priority: 'high', description: 'Review the generated spec.md and update as needed' },
    { title: '🏗 Scaffold project', priority: 'high', description: `Run: buildonthego scaffold --name "${startupName}" --type ${type}` },
    { title: '🔑 Setup Firebase project', priority: 'high', description: 'Firebase is auto-created via firebase-tools. Verify project in Firebase Console.' },
    { title: '✅ Write & run tests', priority: 'medium', description: 'Review generated test cases and run the test suite' },
    { title: '🚀 First deploy', priority: 'medium', description: `Run: buildonthego deploy --name "${startupName}"` }
  ];

  const created = [];
  for (const task of defaultTasks) {
    const t = await createTask(listId, task);
    created.push(t);
  }

  const listUrl = `https://app.clickup.com/${workspaceId}/v/l/${listId}`;
  return { listId, listUrl, tasks: created };
}

module.exports = {
  getWorkspaceId,
  getOrCreateSpace,
  getOrCreateList,
  createTask,
  updateTaskStatus,
  getTasks,
  setupStartupInClickUp
};
