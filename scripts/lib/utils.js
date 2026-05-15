const fs = require('fs');
const path = require('path');
const { AppError } = require('./errors');
const { ERROR_CODES } = require('./constants');

function readTextFileFromCwd(filePath) {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new AppError(ERROR_CODES.VALIDATION, `File not found: ${absolutePath}`);
  }
  return fs.readFileSync(absolutePath, 'utf8');
}

function readBinaryFileFromCwd(filePath) {
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new AppError(ERROR_CODES.VALIDATION, `File not found: ${absolutePath}`);
  }
  return {
    absolutePath,
    buffer: fs.readFileSync(absolutePath)
  };
}

function isNumeric(value) {
  return /^\d+$/.test(String(value || '').trim());
}

function toIssueTypeObject(value) {
  if (isNumeric(value)) {
    return { id: String(value) };
  }
  return { name: String(value) };
}

function pickIssueType(issuetypes, target) {
  const normalized = String(target || '').trim().toLowerCase();
  return (issuetypes || []).find((item) =>
    String(item.id) === String(target) ||
    String(item.name || '').trim().toLowerCase() === normalized
  );
}

module.exports = {
  readTextFileFromCwd,
  readBinaryFileFromCwd,
  isNumeric,
  toIssueTypeObject,
  pickIssueType
};
