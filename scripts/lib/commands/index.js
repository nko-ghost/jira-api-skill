const { AppError } = require('../errors');
const { ERROR_CODES } = require('../constants');
const searchCommand = require('./search');
const issueCommand = require('./issue');
const commentCommand = require('./comment');
const attachmentCommand = require('./attachment');
const metaCommand = require('./meta');

const rootCommands = new Map([
  [searchCommand.name, searchCommand],
  [issueCommand.name, issueCommand],
  [commentCommand.name, commentCommand],
  [attachmentCommand.name, attachmentCommand],
  [metaCommand.name, metaCommand]
]);

async function runLegacyCommand(name, args, context) {
  if (name === 'transitions') {
    return issueCommand.run(['transitions', ...args], context);
  }
  if (name === 'transition') {
    return issueCommand.run(['transition', ...args], context);
  }
  if (name === 'update-description') {
    const [issueKey, filePath] = args;
    if (!issueKey || !filePath) {
      throw new AppError(
        ERROR_CODES.VALIDATION,
        'update-description requires ISSUE-KEY and file path.'
      );
    }
    return issueCommand.run(['update', issueKey, '--description-file', filePath], context);
  }
  return null;
}

async function runCommand(commandTokens, context) {
  if (!Array.isArray(commandTokens) || commandTokens.length === 0) {
    return { help: true };
  }

  const [rootName, ...rest] = commandTokens;
  if (rootName === 'help' || rootName === '--help' || rootName === '-h') {
    return { help: true };
  }

  if (rootCommands.has(rootName)) {
    return rootCommands.get(rootName).run(rest, context);
  }

  const legacyResult = await runLegacyCommand(rootName, rest, context);
  if (legacyResult) {
    return legacyResult;
  }

  if (/^[A-Z][A-Z0-9]+-\d+$/i.test(rootName)) {
    return issueCommand.run(['get', rootName, ...rest], context);
  }

  const path = require('path');
  const fs = require('fs');
  const skillRoot = path.resolve(__dirname, '../../../');
  const pluginPath = path.join(skillRoot, 'sandbox', 'features', `${rootName}.js`);
  
  if (fs.existsSync(pluginPath)) {
    const plugin = require(pluginPath);
    return plugin.run(rest, context);
  }

  throw new AppError(ERROR_CODES.VALIDATION, `Unknown command "${rootName}". Use "help".`);
}

module.exports = {
  runCommand,
  rootCommands
};
