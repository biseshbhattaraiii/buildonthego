const fs = require('fs-extra');
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.buildonthego');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
const STARTUPS_DIR = path.join(os.homedir(), 'startups');

function getConfig() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return null;
    return fs.readJsonSync(CONFIG_FILE);
  } catch {
    return null;
  }
}

function saveConfig(config) {
  fs.ensureDirSync(CONFIG_DIR);
  fs.writeJsonSync(CONFIG_FILE, config, { spaces: 2 });
}

function getStartupsDir() {
  return STARTUPS_DIR;
}

function getStartupDir(name) {
  return path.join(STARTUPS_DIR, slugify(name));
}

function slugify(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

module.exports = { getConfig, saveConfig, getStartupsDir, getStartupDir, slugify, CONFIG_DIR };
