const { parseArgs, toInt } = require('../args');

const DEFAULT_FIELDS = [
  'key',
  'summary',
  'status',
  'assignee',
  'issuetype',
  'created',
  'updated'
].join(',');

function buildRows(issues, storyPointsField) {
  return (issues || []).map((issue) => ({
    key: issue.key,
    summary: issue.fields && issue.fields.summary,
    status: issue.fields && issue.fields.status ? issue.fields.status.name : '',
    assignee:
      issue.fields && issue.fields.assignee ? issue.fields.assignee.displayName || issue.fields.assignee.name : '',
    storyPoints: issue.fields ? issue.fields[storyPointsField] : ''
  }));
}

async function run(args, context) {
  const parsed = parseArgs(args, {});
  const jql = parsed.positionals[0] || 'assignee = currentUser() AND sprint in openSprints()';
  const maxResults = toInt(parsed.options['max-results'], 50, '--max-results');
  const startAt = toInt(parsed.options['start-at'], 0, '--start-at');
  const fields = parsed.options.fields || DEFAULT_FIELDS;
  const data = await context.client.searchIssues({ jql, startAt, maxResults, fields });
  return {
    data,
    tableRows: buildRows(data.issues, context.config.storyPointsField)
  };
}

module.exports = {
  name: 'search',
  description: 'Search issues by JQL',
  run
};
