const fs = require('fs');
const path = require('path');

function stripQuotes(value) {
  return String(value || '').replace(/^["']|["']$/g, '').trim();
}

function readEnvFileValue(filePath, key) {
  if (!fs.existsSync(filePath)) {
    return undefined;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(new RegExp(`^\\s*${key}\\s*=\\s*(.+?)\\s*$`));
    if (match) {
      return stripQuotes(match[1]);
    }
  }

  return undefined;
}

function loadEnvValue(key, skillRoot) {
  const filePath = path.join(skillRoot, '.env');
  const fromFile = readEnvFileValue(filePath, key);
  if (fromFile !== undefined && fromFile !== '') {
    return fromFile;
  }

  return process.env[key];
}

module.exports = {
  loadEnvValue
};
