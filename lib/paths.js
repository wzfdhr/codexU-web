'use strict';
const os = require('os');
const path = require('path');

function homeDir() {
  return process.env.USERPROFILE || process.env.HOME || os.homedir();
}

const home = homeDir();
const codexDir = path.join(home, '.codex');
const claudeDir = path.join(home, '.claude');

const paths = {
  home,
  codexDir,
  stateDb: path.join(codexDir, 'state_5.sqlite'),
  sessionsDir: path.join(codexDir, 'sessions'),
  archivedDir: path.join(codexDir, 'archived_sessions'),
  sessionIndex: path.join(codexDir, 'session_index.jsonl'),
  claudeProjects: path.join(claudeDir, 'projects'),
  settingsFile: path.join(__dirname, '..', 'data', 'settings.json'),
};

module.exports = paths;
