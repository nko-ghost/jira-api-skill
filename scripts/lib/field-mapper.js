const { AppError } = require('./errors');
const { ERROR_CODES } = require('./constants');

function normalizeAlias(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
}

function parseAssignment(value) {
  const raw = String(value || '');
  const separatorIndex = raw.indexOf('=');
  if (separatorIndex <= 0) {
    throw new AppError(
      ERROR_CODES.VALIDATION,
      `Invalid --set "${raw}". Expected format field=value.`
    );
  }
  const field = raw.slice(0, separatorIndex).trim();
  const input = raw.slice(separatorIndex + 1).trim();
  if (!field) {
    throw new AppError(ERROR_CODES.VALIDATION, `Invalid --set "${raw}". Missing field name.`);
  }
  return { field, input };
}

function parseInputValue(input) {
  const text = String(input || '').trim();
  if (text === 'null') {
    return null;
  }
  if (text === 'true') {
    return true;
  }
  if (text === 'false') {
    return false;
  }
  if (/^-?\d+(\.\d+)?$/.test(text)) {
    return Number(text);
  }
  if (
    (text.startsWith('{') && text.endsWith('}')) ||
    (text.startsWith('[') && text.endsWith(']'))
  ) {
    try {
      return JSON.parse(text);
    } catch (_) {
      return text;
    }
  }
  return text;
}

function parseCsvAsList(input) {
  return String(input || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeTransitionName(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

async function resolveFieldKey(rawField, resolver) {
  const alias = normalizeAlias(rawField);
  if (alias === 'tags' || alias === 'tag' || alias === 'labels' || alias === 'label') {
    return 'labels';
  }
  if (alias === 'storypoints' || alias === 'storypoint') {
    return resolver.storyPointsField;
  }
  if (alias === 'epic' || alias === 'epiclink') {
    return resolver.resolveEpicLinkField();
  }
  return rawField;
}

function normalizeFieldValue(fieldKey, inputValue, rawInput) {
  if (fieldKey === 'labels') {
    if (Array.isArray(inputValue)) {
      return inputValue.map((item) => String(item).trim()).filter(Boolean);
    }
    if (typeof inputValue === 'string') {
      return parseCsvAsList(inputValue);
    }
    return [];
  }

  if (fieldKey === 'fixVersions' || fieldKey === 'components') {
    const list = Array.isArray(inputValue) ? inputValue : parseCsvAsList(rawInput);
    return list.map((name) => ({ name: String(name).trim() })).filter((item) => item.name);
  }

  return inputValue;
}

async function buildFieldsFromSets(assignments, resolver) {
  const fields = {};
  for (const item of assignments || []) {
    const { field, input } = parseAssignment(item);
    const fieldKey = await resolveFieldKey(field, resolver);
    const parsedValue = parseInputValue(input);
    fields[fieldKey] = normalizeFieldValue(fieldKey, parsedValue, input);
  }
  return fields;
}

module.exports = {
  buildFieldsFromSets,
  normalizeTransitionName,
  parseAssignment,
  parseInputValue,
  normalizeAlias
};
