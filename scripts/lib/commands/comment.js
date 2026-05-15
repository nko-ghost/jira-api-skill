const { parseArgs, requirePositional, toInt } = require('../args');
const { AppError } = require('../errors');
const { ERROR_CODES } = require('../constants');
const { readTextFileFromCwd } = require('../utils');

async function runAdd(args, context) {
  const parsed = parseArgs(args, {});
  const issueKey = requirePositional(parsed.positionals, 0, 'ISSUE-KEY');
  const body = parsed.options['body-file']
    ? readTextFileFromCwd(parsed.options['body-file'])
    : parsed.options.body;

  if (!body) {
    throw new AppError(ERROR_CODES.VALIDATION, 'comment add requires --body or --body-file.');
  }

  if (context.globalOptions.dryRun) {
    return {
      data: {
        ok: true,
        dryRun: true,
        action: 'comment.add',
        issueKey,
        request: { body }
      }
    };
  }

  const data = await context.client.addComment(issueKey, body);
  return {
    data,
    tableRows: [
      {
        issueKey,
        id: data.id,
        author: data.author ? data.author.displayName : '',
        created: data.created
      }
    ]
  };
}

async function runList(args, context) {
  const parsed = parseArgs(args, {});
  const issueKey = requirePositional(parsed.positionals, 0, 'ISSUE-KEY');
  const startAt = toInt(parsed.options['start-at'], 0, '--start-at');
  const maxResults = toInt(parsed.options['max-results'], 50, '--max-results');
  const data = await context.client.listComments(issueKey, startAt, maxResults);
  const comments = data.comments || [];
  return {
    data,
    tableRows: comments.map((item) => ({
      id: item.id,
      author: item.author ? item.author.displayName : '',
      created: item.created,
      body: String(item.body || '').replace(/\s+/g, ' ').slice(0, 80)
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
    throw new AppError(ERROR_CODES.VALIDATION, 'comment requires subcommand add|list.');
  }
  return subcommands.get(subcommand)(rest, context);
}

module.exports = {
  name: 'comment',
  description: 'Comment operations (add/list)',
  run
};
