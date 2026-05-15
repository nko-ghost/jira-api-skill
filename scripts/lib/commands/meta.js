const { parseArgs, requirePositional } = require('../args');
const { AppError } = require('../errors');
const { ERROR_CODES } = require('../constants');
const { pickIssueType } = require('../utils');

async function runFields(args, context) {
  const parsed = parseArgs(args, {});
  const projectKey = parsed.options.project;
  const issueTypeInput = parsed.options['issue-type'];

  if (!projectKey) {
    const data = await context.client.getFields();
    return {
      data,
      tableRows: data.map((field) => ({
        id: field.id,
        name: field.name,
        custom: Boolean(field.custom),
        type: field.schema ? field.schema.type : ''
      }))
    };
  }

  const createMeta = await context.client.getCreateMeta(projectKey);
  const project = createMeta.projects && createMeta.projects[0];
  if (!project) {
    throw new AppError(ERROR_CODES.VALIDATION, `Project "${projectKey}" not found in createmeta.`);
  }

  const issueType = issueTypeInput
    ? pickIssueType(project.issuetypes, issueTypeInput)
    : project.issuetypes && project.issuetypes[0];
  if (!issueType) {
    throw new AppError(ERROR_CODES.VALIDATION, `Issue type "${issueTypeInput}" not found in "${projectKey}".`);
  }

  const fields = issueType.fields || {};
  const rows = Object.keys(fields).map((id) => ({
    id,
    name: fields[id].name,
    required: Boolean(fields[id].required),
    hasDefault: fields[id].hasDefaultValue === true
  }));

  return {
    data: {
      project: project.key,
      issueType: issueType.name,
      fields
    },
    tableRows: rows
  };
}

async function runIssueTypes(args, context) {
  const parsed = parseArgs(args, {});
  const projectKey = parsed.options.project || requirePositional(parsed.positionals, 0, 'PROJECT-KEY');
  const createMeta = await context.client.getCreateMeta(projectKey);
  const project = createMeta.projects && createMeta.projects[0];
  if (!project) {
    throw new AppError(ERROR_CODES.VALIDATION, `Project "${projectKey}" not found.`);
  }
  const issuetypes = project.issuetypes || [];
  return {
    data: {
      project: project.key,
      issueTypes: issuetypes
    },
    tableRows: issuetypes.map((type) => ({
      id: type.id,
      name: type.name,
      subtask: Boolean(type.subtask)
    }))
  };
}

async function runEditMeta(args, context) {
  const parsed = parseArgs(args, {});
  const issueKey = requirePositional(parsed.positionals, 0, 'ISSUE-KEY');
  const data = await context.client.getEditMeta(issueKey);
  const fields = data.fields || {};
  return {
    data,
    tableRows: Object.keys(fields).map((id) => ({
      id,
      name: fields[id].name,
      required: Boolean(fields[id].required)
    }))
  };
}

const subcommands = new Map([
  ['fields', runFields],
  ['issue-types', runIssueTypes],
  ['editmeta', runEditMeta]
]);

async function run(args, context) {
  const [subcommand, ...rest] = args;
  if (!subcommand || !subcommands.has(subcommand)) {
    throw new AppError(ERROR_CODES.VALIDATION, 'meta requires subcommand fields|issue-types|editmeta.');
  }
  return subcommands.get(subcommand)(rest, context);
}

module.exports = {
  name: 'meta',
  description: 'Metadata operations (fields/issue-types/editmeta)',
  run
};
