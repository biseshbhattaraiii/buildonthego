const { google } = require('googleapis');
const { getConfig, saveConfig } = require('./config');
const { getAllStartups } = require('./tracker');
const { getAuthenticatedClient } = require('./google-auth');

// ─── Master Sheet ─────────────────────────────────────────────────────────────

async function getOrCreateMasterSheet() {
  const config = getConfig();
  if (config.masterSheetId) return config.masterSheetId;

  const auth = await getAuthenticatedClient();
  const drive = google.drive({ version: 'v3', auth });
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: 'BuildOnTheGo — Startups' },
      sheets: [{ properties: { title: 'All Startups' } }]
    }
  });

  const spreadsheetId = res.data.spreadsheetId;

  await drive.permissions.create({
    fileId: spreadsheetId,
    requestBody: { role: 'writer', type: 'anyone' }
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'All Startups!A1',
    valueInputOption: 'RAW',
    requestBody: {
      values: [['ID', 'Name', 'Type', 'Status', 'Progress', 'Description', 'Created', 'Updated', 'GitHub', 'Vercel URL', 'Expo URL', 'ClickUp', 'Sheet URL']]
    }
  });

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [{
        repeatCell: {
          range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
          cell: {
            userEnteredFormat: {
              backgroundColor: { red: 0.1, green: 0.1, blue: 0.18 },
              textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }
            }
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat)'
        }
      }]
    }
  });

  // Cache the sheet ID
  const updatedConfig = getConfig();
  updatedConfig.masterSheetId = spreadsheetId;
  updatedConfig.masterSheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
  saveConfig(updatedConfig);

  return spreadsheetId;
}

async function syncMasterSheet() {
  const auth = await getAuthenticatedClient();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = await getOrCreateMasterSheet();
  const startups = getAllStartups();

  const rows = startups.map(s => [
    s.ID, s.Name, s.Type, s.Status, s.Progress,
    s.Description, s.Created, s.Updated,
    s.GitHub, s.VercelURL, s.ExpoURL, s.ClickUpURL, s.SheetURL
  ]);

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: 'All Startups!A2:Z'
  });

  if (rows.length > 0) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'All Startups!A2',
      valueInputOption: 'RAW',
      requestBody: { values: rows }
    });
  }

  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
  return { spreadsheetId, url };
}

// ─── Per-Startup Sheet ────────────────────────────────────────────────────────

async function createStartupSheet(startupName, startup) {
  const auth = await getAuthenticatedClient();
  const drive = google.drive({ version: 'v3', auth });
  const sheets = google.sheets({ version: 'v4', auth });

  const res = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: `${startupName} — Progress` },
      sheets: [
        { properties: { title: 'Overview', sheetId: 0 } },
        { properties: { title: 'Tickets', sheetId: 1 } },
        { properties: { title: 'Bugs', sheetId: 2 } },
        { properties: { title: 'Improvements', sheetId: 3 } },
        { properties: { title: 'Deploy History', sheetId: 4 } }
      ]
    }
  });

  const spreadsheetId = res.data.spreadsheetId;

  await drive.permissions.create({
    fileId: spreadsheetId,
    requestBody: { role: 'writer', type: 'anyone' }
  });

  const headerData = [
    { range: 'Overview!A1', values: [['Field', 'Value']] },
    { range: 'Tickets!A1', values: [['ID', 'Title', 'Description', 'Priority', 'Status', 'ClickUp ID', 'Created', 'Updated']] },
    { range: 'Bugs!A1', values: [['ID', 'Title', 'Description', 'Severity', 'Status', 'Steps to Reproduce', 'Reported', 'Fixed']] },
    { range: 'Improvements!A1', values: [['ID', 'Title', 'Description', 'Priority', 'Status', 'Created', 'Updated']] },
    { range: 'Deploy History!A1', values: [['Version', 'Date', 'Platform', 'Status', 'URL', 'Notes']] }
  ];

  if (startup) {
    headerData[0].values.push(
      ['App Name', startup.Name],
      ['Type', startup.Type],
      ['Status', startup.Status],
      ['Progress', startup.Progress],
      ['Description', startup.Description],
      ['Created', startup.Created],
      ['GitHub', startup.GitHub || ''],
      ['ClickUp', startup.ClickUpURL || '']
    );
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId,
    requestBody: { valueInputOption: 'RAW', data: headerData }
  });

  const headerRequests = [0, 1, 2, 3, 4].map(sheetId => ({
    repeatCell: {
      range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
      cell: {
        userEnteredFormat: {
          backgroundColor: { red: 0.1, green: 0.1, blue: 0.18 },
          textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }
        }
      },
      fields: 'userEnteredFormat(backgroundColor,textFormat)'
    }
  }));

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: { requests: headerRequests }
  });

  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
  return { spreadsheetId, url };
}

async function addRowToStartupSheet(spreadsheetId, sheetName, rowData) {
  const auth = await getAuthenticatedClient();
  const sheets = google.sheets({ version: 'v4', auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A1`,
    valueInputOption: 'RAW',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [rowData] }
  });
}

module.exports = {
  getOrCreateMasterSheet,
  syncMasterSheet,
  createStartupSheet,
  addRowToStartupSheet
};
