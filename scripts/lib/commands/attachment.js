const path = require('path');
const { parseArgs, requirePositional } = require('../args');
const { AppError } = require('../errors');
const { ERROR_CODES } = require('../constants');
const { readBinaryFileFromCwd } = require('../utils');

async function runAdd(args, context) {
  const parsed = parseArgs(args, {});
  const issueKey = requirePositional(parsed.positionals, 0, 'ISSUE-KEY');
  const filePath = parsed.options.file;
  if (!filePath) {
    throw new AppError(ERROR_CODES.VALIDATION, 'attachment add requires --file.');
  }

  const fileData = readBinaryFileFromCwd(filePath);
  const fileName = parsed.options.name || path.basename(fileData.absolutePath);

  if (context.globalOptions.dryRun) {
    return {
      data: {
        ok: true,
        dryRun: true,
        action: 'attachment.add',
        issueKey,
        request: {
          filePath: fileData.absolutePath,
          fileName,
          size: fileData.buffer.length
        }
      }
    };
  }

  const formData = new FormData();
  const blob = new Blob([fileData.buffer]);
  formData.append('file', blob, fileName);

  const data = await context.client.addAttachment(issueKey, formData);
  const tableRows = (Array.isArray(data) ? data : []).map((item) => ({
    id: item.id,
    filename: item.filename,
    size: item.size,
    author: item.author ? item.author.displayName : ''
  }));
  return {
    data,
    tableRows
  };
}

async function runList(args, context) {
  const parsed = parseArgs(args, {});
  const issueKey = requirePositional(parsed.positionals, 0, 'ISSUE-KEY');
  const issue = await context.client.listAttachments(issueKey);
  const attachments = issue && issue.fields ? issue.fields.attachment || [] : [];
  return {
    data: {
      issueKey,
      attachments
    },
    tableRows: attachments.map((item) => ({
      id: item.id,
      filename: item.filename,
      size: item.size,
      author: item.author ? item.author.displayName : '',
      created: item.created
    }))
  };
}

const subcommands = new Map([
  ['add', runAdd],
  ['list', runList]
]);

async function run(args, context) {
  const [subcommand, ...rest] = args;
  if (!subcommand || !subcommands.has(subcommand)) {
    throw new AppError(ERROR_CODES.VALIDATION, 'attachment requires subcommand add|list.');
  }
  return subcommands.get(subcommand)(rest, context);
}

module.exports = {
  name: 'attachment',
  description: 'Attachment operations (add/list)',
  run
};
