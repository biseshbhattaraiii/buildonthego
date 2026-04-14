const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const fs = require('fs-extra');
const path = require('path');
const open = require('open');
const { getConfig, saveConfig, CONFIG_DIR } = require('./config');

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file'
];

function getOAuth2Client() {
  const config = getConfig();
  const { googleClientId, googleClientSecret } = config;
  return new google.auth.OAuth2(googleClientId, googleClientSecret, 'http://localhost:3737/oauth2callback');
}

async function getAuthenticatedClient() {
  const config = getConfig();

  // Already have a refresh token — just use it
  if (config.googleRefreshToken) {
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials({ refresh_token: config.googleRefreshToken });
    return oauth2Client;
  }

  // Need to do the OAuth flow
  return await runOAuthFlow();
}

async function runOAuthFlow() {
  const oauth2Client = getOAuth2Client();

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
  });

  console.log('\nOpening browser for Google authentication...');
  console.log('If it does not open, visit:\n' + authUrl + '\n');

  // Start local server to catch the callback
  const code = await new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const qs = new url.URL(req.url, 'http://localhost:3737').searchParams;
      const code = qs.get('code');
      const error = qs.get('error');

      res.writeHead(200, { 'Content-Type': 'text/html' });
      if (code) {
        res.end('<html><body style="font-family:sans-serif;text-align:center;padding:50px"><h2>✔ Authenticated!</h2><p>You can close this tab and return to the terminal.</p></body></html>');
        server.close();
        resolve(code);
      } else {
        res.end('<html><body><h2>Authentication failed: ' + error + '</h2></body></html>');
        server.close();
        reject(new Error('OAuth error: ' + error));
      }
    });

    server.listen(3737, () => {
      open(authUrl).catch(() => {});
    });

    // Timeout after 5 minutes
    setTimeout(() => {
      server.close();
      reject(new Error('OAuth timeout — no response within 5 minutes'));
    }, 5 * 60 * 1000);
  });

  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  // Save refresh token
  const config = getConfig();
  config.googleRefreshToken = tokens.refresh_token;
  saveConfig(config);

  console.log('Google authentication successful.\n');
  return oauth2Client;
}

module.exports = { getAuthenticatedClient, runOAuthFlow };
