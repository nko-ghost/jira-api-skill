const { parseArgs, requirePositional, toInt } = require('../args');
const { buildFieldsFromSets, normalizeTransitionName } = require('../field-mapper');
const { readTextFileFromCwd, toIssueTypeObject, pickIssueType } = require('../utils');
const { AppError } = require('../errors');
const { ERROR_CODES } = require('../constants');

function normalizeRequiredField(fieldValue) {
  if (fieldValue === null || fieldValue === undefined) {
    return false;
  }
  if (typeof fieldValue === 'string') {
    return fieldValue.trim().length > 0;
  }
  if (Array.isArray(fieldValue)) {
    return fieldValue.length > 0;
  }
  return true;
}

function extractCreateMetaProject(createMeta) {
  return createMeta && Array.isArray(createMeta.projects) ? createMeta.projects[0] : null;
}

function getIssueTypeFromCreateMeta(createMeta, issueTypeInput) {
  const project = extractCreateMetaProject(createMeta);
  if (!project) {
    return null;
  }
  return pickIssueType(project.issuetypes, issueTypeInput);
}

async function runGet(args, context) {
  const parsed = parseArgs(args, {});
  const issueKey = requirePositional(parsed.positionals, 0, 'ISSUE-KEY');
  const spf = context.config.storyPointsField;
  const defaultFields = spf
    ? `key,summary,status,assignee,${spf},issuetype,created,updated,description`
    : 'key,summary,status,assignee,issuetype,created,updated,description';
  const fields = parsed.options.fields || defaultFields;
  const expand = parsed.options.expand;
  const data = await context.client.getIssue(issueKey, { fields, expand });
  return {
    data,
    tableRows: [
      {
        key: data.key,
        summary: data.fields && data.fields.summary,
        status: data.fields && data.fields.status ? data.fields.status.name : '',
        assignee: data.fields && data.fields.assignee ? data.fields.assignee.displayName : '',
        storyPoints: data.fields ? data.fields[context.config.storyPointsField] : ''
      }
    ]
  };
}

async function runCreate(args, context) {
  const parsed = parseArgs(args, { multiValueFlags: ['set'] });
  const projectKey = parsed.options.project;
  const issueType = parsed.options.type;
  const summary = parsed.options.summary;

  if (!projectKey || !issueType || !summary) {
    throw new AppError(
      ERROR_CODES.VALIDATION,
      'issue create requires --project, --type and --summary.'
    );
  }

  const description = parsed.options['description-file']
    ? readTextFileFromCwd(parsed.options['description-file'])
    : parsed.options.description;

  const dynamicFields = await buildFieldsFromSets(parsed.options.set || [], context.fieldResolver);
  const fields = {
    ...dynamicFields,
    project: { key: projectKey },
    issuetype: toIssueTypeObject(issueType),
    summary
  };
  if (description) {
    fields.description = description;
  }

  const createMeta = await context.client.getCreateMeta(projectKey);
  const issueTypeMeta = getIssueTypeFromCreateMeta(createMeta, issueType);
  if (!issueTypeMeta) {
    throw new AppError(
      ERROR_CODES.VALIDATION,
      `Issue type "${issueType}" not found in project "${projectKey}".`,
      { details: { projectKey, issueType } }
    );
  }

  const requiredFieldIds = Object.entries(issueTypeMeta.fields || {})
    .filter(([, spec]) => spec && spec.required)
    .map(([fieldId]) => fieldId)
    .filter((fieldId) => fieldId !== 'project' && fieldId !== 'issuetype' && fieldId !== 'summary');

  const missingRequired = requiredFieldIds.filter((fieldId) => !normalizeRequiredField(fields[fieldId]));
  if (missingRequired.length > 0) {
    throw new AppError(
      ERROR_CODES.VALIDATION,
      'Missing required fields for issue creation.',
      { details: { missingRequired } }
    );
  }

  if (context.globalOptions.dryRun) {
    return {
      data: {
        ok: true,
        dryRun: true,
        action: 'issue.create',
        request: { fields }
      }
    };
  }

  const data = await context.client.createIssue(fields);
  return {
    data,
    tableRows: [data]
  };
}

async function runUpdate(args, context) {
  const parsed = parseArgs(args, { multiValueFlags: ['set'] });
  const issueKey = requirePositional(parsed.positionals, 0, 'ISSUE-KEY');
  const setValues = parsed.options.set || [];
  const fields = await buildFieldsFromSets(setValues, context.fieldResolver);

  if (parsed.options['description-file']) {
    fields.description = readTextFileFromCwd(parsed.options['description-file']);
  }
  if (parsed.options.description !== undefined) {
    fields.description = parsed.options.description;
  }

  if (Object.keys(fields).length === 0) {
    throw new AppError(ERROR_CODES.VALIDATION, 'issue update requires at least one field via --set.');
  }

  if (context.globalOptions.dryRun) {
    return {
      data: {
        ok: true,
        dryRun: true,
        action: 'issue.update',
        issueKey,
        request: { fields }
      }
    };
  }

  await context.client.updateIssue(issueKey, fields);
  return {
    data: { ok: true, issueKey, message: 'Issue updated.' },
    tableRows: [{ issueKey, updatedFields: Object.keys(fields).join(', ') }]
  };
}

async function runTransitions(args, context) {
  const parsed = parseArgs(args, {});
  const issueKey = requirePositional(parsed.positionals, 0, 'ISSUE-KEY');
  const data = await context.client.getTransitions(issueKey);
  const transitions = (data.transitions || []).map((transition) => ({
    id: transition.id,
    name: transition.name,
    to: transition.to ? transition.to.name : ''
  }));
  return {
    data: { issueKey, transitions },
    tableRows: transitions
  };
}

async function runTransition(args, context) {
  const parsed = parseArgs(args, {});
  const issueKey = requirePositional(parsed.positionals, 0, 'ISSUE-KEY');
  const target = requirePositional(parsed.positionals, 1, 'TRANSITION');

  const transitionsData = await context.client.getTransitions(issueKey);
  const transitions = transitionsData.transitions || [];
  const targetNormalized = normalizeTransitionName(target);
  const match = transitions.find((item) => {
    const name = normalizeTransitionName(item.name);
    const toName = normalizeTransitionName(item.to ? item.to.name : '');
    return String(item.id) === String(target) || name === targetNormalized || toName === targetNormalized;
  });

  if (!match) {
    throw new AppError(
      ERROR_CODES.VALIDATION,
      `Transition "${target}" is not available for ${issueKey}.`,
      {
        details: {
          availableTransitions: transitions.map((item) => ({
            id: item.id,
            name: item.name,
            to: item.to ? item.to.name : ''
          }))
        }
      }
    );
  }

  if (context.globalOptions.dryRun) {
    return {
      data: {
        ok: true,
        dryRun: true,
        action: 'issue.transition',
        issueKey,
        request: { transition: { id: match.id } }
      }
    };
  }

  await context.client.transitionIssue(issueKey, match.id);
  return {
    data: {
      ok: true,
      issueKey,
      transition: { id: match.id, name: match.name, to: match.to ? match.to.name : '' }
    },
    tableRows: [{ issueKey, transition: match.name, to: match.to ? match.to.name : '' }]
  };
}

async function runChangelog(args, context) {
  const parsed = parseArgs(args, {});
  const issueKey = requirePositional(parsed.positionals, 0, 'ISSUE-KEY');
  const maxResults = toInt(parsed.options['max-results'], 50, '--max-results');
  const data = await context.client.getIssue(issueKey, {
    fields: 'key,summary,status,assignee',
    expand: 'changelog'
  });
  const histories = ((data.changelog && data.changelog.histories) || []).slice(0, maxResults);
  const tableRows = histories.map((item) => ({
    id: item.id,
    author: item.author ? item.author.displayName : '',
    created: item.created,
    items: Array.isArray(item.items) ? item.items.length : 0
  }));

  return {
    data: {
      key: data.key,
      summary: data.fields ? data.fields.summary : '',
      changelog: histories
    },
    tableRows
  };
}

async function runEditMeta(args, context) {
  const parsed = parseArgs(args, {});
  const issueKey = requirePositional(parsed.positionals, 0, 'ISSUE-KEY');
  const data = await context.client.getEditMeta(issueKey);
  const fields = data.fields || {};
  const tableRows = Object.keys(fields).map((fieldId) => ({
    id: fieldId,
    name: fields[fieldId].name,
    required: Boolean(fields[fieldId].required),
    operations: Array.isArray(fields[fieldId].operations) ? fields[fieldId].operations.join(', ') : ''
  }));
  return {
    data,
    tableRows
  };
}

const subcommands = new Map([
  ['get', runGet],
  ['create', runCreate],
  ['update', runUpdate],
  ['transitions', runTransitions],
  ['transition', runTransition],
  ['changelog', runChangelog],
  ['editmeta', runEditMeta]
]);

async function run(args, context) {
  const [maybeSubcommand, ...rest] = args;

  if (!maybeSubcommand) {
    throw new AppError(
      ERROR_CODES.VALIDATION,
      'issue requires a subcommand. Use: get|create|update|transitions|transition|changelog|editmeta.'
    );
  }

  if (subcommands.has(maybeSubcommand)) {
    return subcommands.get(maybeSubcommand)(rest, context);
  }

  if (/^[A-Z][A-Z0-9]+-\d+$/i.test(maybeSubcommand)) {
    return runGet([maybeSubcommand, ...rest], context);
  }

  throw new AppError(
    ERROR_CODES.VALIDATION,
    `Unknown issue subcommand "${maybeSubcommand}".`
  );
}

module.exports = {
  name: 'issue',
  description: 'Issue operations (get/create/update/transition/changelog/editmeta)',
  run
};
