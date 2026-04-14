const fs = require('fs-extra');
const path = require('path');
const ExcelJS = require('exceljs');
const { stringify } = require('csv-stringify/sync');
const { parse } = require('csv-parse/sync');
const { getStartupsDir, getStartupDir, slugify } = require('./config');
const { format } = require('date-fns');

const MASTER_CSV = path.join(getStartupsDir(), 'startups.csv');

const MASTER_HEADERS = [
  'ID', 'Name', 'Slug', 'Type', 'Status', 'Progress',
  'Description', 'Created', 'Updated',
  'GitHub', 'VercelURL', 'ExpoURL', 'ClickUpURL', 'SheetURL'
];

const TICKET_STATUSES = ['open', 'in-progress', 'review', 'done', 'closed'];
const TICKET_PRIORITIES = ['critical', 'high', 'medium', 'low'];

// ─── Master CSV ───────────────────────────────────────────────────────────────

function ensureMasterCSV() {
  fs.ensureDirSync(getStartupsDir());
  if (!fs.existsSync(MASTER_CSV)) {
    const header = stringify([MASTER_HEADERS]);
    fs.writeFileSync(MASTER_CSV, header);
  }
}

function readMasterCSV() {
  ensureMasterCSV();
  const content = fs.readFileSync(MASTER_CSV, 'utf8');
  const rows = parse(content, { columns: true, skip_empty_lines: true });
  return rows;
}

function writeMasterCSV(rows) {
  ensureMasterCSV();
  const output = stringify(rows, { header: true, columns: MASTER_HEADERS });
  fs.writeFileSync(MASTER_CSV, output);
}

function addStartup(startup) {
  const rows = readMasterCSV();
  const id = String(rows.length + 1).padStart(3, '0');
  const now = format(new Date(), 'yyyy-MM-dd');
  const slug = slugify(startup.name);
  const newRow = {
    ID: id,
    Name: startup.name,
    Slug: slug,
    Type: startup.type || 'web',
    Status: 'idea',
    Progress: '0%',
    Description: startup.description || '',
    Created: now,
    Updated: now,
    GitHub: '',
    VercelURL: '',
    ExpoURL: '',
    ClickUpURL: startup.clickupUrl || '',
    SheetURL: startup.sheetUrl || ''
  };
  rows.push(newRow);
  writeMasterCSV(rows);
  return newRow;
}

function updateStartup(slug, updates) {
  const rows = readMasterCSV();
  const idx = rows.findIndex(r => r.Slug === slug);
  if (idx === -1) throw new Error(`Startup "${slug}" not found in master CSV`);
  rows[idx] = { ...rows[idx], ...updates, Updated: format(new Date(), 'yyyy-MM-dd') };
  writeMasterCSV(rows);
  return rows[idx];
}

function getStartup(slug) {
  const rows = readMasterCSV();
  return rows.find(r => r.Slug === slug) || null;
}

function getAllStartups() {
  return readMasterCSV();
}

// ─── Per-startup Excel ────────────────────────────────────────────────────────

async function createStartupExcel(slug) {
  const dir = getStartupDir(slug);
  fs.ensureDirSync(dir);
  const filePath = path.join(dir, 'progress.xlsx');

  const wb = new ExcelJS.Workbook();
  wb.creator = 'buildonthego';
  wb.created = new Date();

  // Sheet 1: Overview
  const overview = wb.addWorksheet('Overview');
  overview.columns = [
    { header: 'Field', key: 'field', width: 20 },
    { header: 'Value', key: 'value', width: 60 }
  ];
  styleHeaderRow(overview);
  const startup = getStartup(slug);
  if (startup) {
    overview.addRows([
      { field: 'App Name', value: startup.Name },
      { field: 'Type', value: startup.Type },
      { field: 'Status', value: startup.Status },
      { field: 'Progress', value: startup.Progress },
      { field: 'Description', value: startup.Description },
      { field: 'Created', value: startup.Created },
      { field: 'GitHub', value: startup.GitHub },
      { field: 'Vercel URL', value: startup.VercelURL },
      { field: 'Expo URL', value: startup.ExpoURL },
      { field: 'ClickUp URL', value: startup.ClickUpURL },
      { field: 'Sheet URL', value: startup.SheetURL }
    ]);
  }

  // Sheet 2: Tickets
  const tickets = wb.addWorksheet('Tickets');
  tickets.columns = [
    { header: 'ID', key: 'id', width: 8 },
    { header: 'Title', key: 'title', width: 35 },
    { header: 'Description', key: 'description', width: 50 },
    { header: 'Priority', key: 'priority', width: 12 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'ClickUp ID', key: 'clickupId', width: 15 },
    { header: 'Created', key: 'created', width: 14 },
    { header: 'Updated', key: 'updated', width: 14 }
  ];
  styleHeaderRow(tickets);

  // Sheet 3: Bugs
  const bugs = wb.addWorksheet('Bugs');
  bugs.columns = [
    { header: 'ID', key: 'id', width: 8 },
    { header: 'Title', key: 'title', width: 35 },
    { header: 'Description', key: 'description', width: 50 },
    { header: 'Severity', key: 'severity', width: 12 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Steps to Reproduce', key: 'steps', width: 50 },
    { header: 'Reported', key: 'reported', width: 14 },
    { header: 'Fixed', key: 'fixed', width: 14 }
  ];
  styleHeaderRow(bugs);

  // Sheet 4: Improvements
  const improvements = wb.addWorksheet('Improvements');
  improvements.columns = [
    { header: 'ID', key: 'id', width: 8 },
    { header: 'Title', key: 'title', width: 35 },
    { header: 'Description', key: 'description', width: 50 },
    { header: 'Priority', key: 'priority', width: 12 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Created', key: 'created', width: 14 },
    { header: 'Updated', key: 'updated', width: 14 }
  ];
  styleHeaderRow(improvements);

  // Sheet 5: Deploy History
  const deploys = wb.addWorksheet('Deploy History');
  deploys.columns = [
    { header: 'Version', key: 'version', width: 12 },
    { header: 'Date', key: 'date', width: 14 },
    { header: 'Platform', key: 'platform', width: 12 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'URL', key: 'url', width: 50 },
    { header: 'Notes', key: 'notes', width: 40 }
  ];
  styleHeaderRow(deploys);

  await wb.xlsx.writeFile(filePath);
  return filePath;
}

async function addTicketToExcel(slug, sheetName, rowData) {
  const dir = getStartupDir(slug);
  const filePath = path.join(dir, 'progress.xlsx');
  if (!fs.existsSync(filePath)) await createStartupExcel(slug);

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);

  const ws = wb.getWorksheet(sheetName);
  if (!ws) throw new Error(`Sheet "${sheetName}" not found`);

  const lastRow = ws.lastRow ? ws.lastRow.number : 1;
  const id = String(lastRow).padStart(3, '0');
  const now = format(new Date(), 'yyyy-MM-dd');

  ws.addRow({ id, ...rowData, created: now, updated: now });
  await wb.xlsx.writeFile(filePath);
}

async function updateOverviewInExcel(slug, updates) {
  const dir = getStartupDir(slug);
  const filePath = path.join(dir, 'progress.xlsx');
  if (!fs.existsSync(filePath)) return;

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(filePath);
  const ws = wb.getWorksheet('Overview');
  if (!ws) return;

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const fieldCell = row.getCell(1).value;
    const mappings = {
      'Status': updates.status,
      'Progress': updates.progress,
      'GitHub': updates.github,
      'Vercel URL': updates.vercelUrl,
      'Expo URL': updates.expoUrl
    };
    if (fieldCell && mappings[fieldCell] !== undefined) {
      row.getCell(2).value = mappings[fieldCell];
    }
  });

  await wb.xlsx.writeFile(filePath);
}

function styleHeaderRow(ws) {
  const headerRow = ws.getRow(1);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a1a2e' } };
  headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  headerRow.height = 22;
}

module.exports = {
  ensureMasterCSV,
  addStartup,
  updateStartup,
  getStartup,
  getAllStartups,
  createStartupExcel,
  addTicketToExcel,
  updateOverviewInExcel,
  MASTER_CSV
};
