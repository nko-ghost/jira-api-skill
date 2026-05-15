const { AppError } = require('./errors');
const { ERROR_CODES } = require('./constants');

function parseOptionToken(token) {
  const optionToken = String(token || '');
  if (!optionToken.startsWith('--')) {
    return null;
  }

  const withoutPrefix = optionToken.slice(2);
  const equalIndex = withoutPrefix.indexOf('=');
  if (equalIndex === -1) {
    return { key: withoutPrefix, inlineValue: undefined };
  }

  return {
    key: withoutPrefix.slice(0, equalIndex),
    inlineValue: withoutPrefix.slice(equalIndex + 1)
  };
}

function parseArgs(tokens, options = {}) {
  const booleanFlags = new Set(options.booleanFlags || []);
  const multiValueFlags = new Set(options.multiValueFlags || []);
  const result = {
    options: {},
    positionals: []
  };

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    const parsed = parseOptionToken(token);
    if (!parsed) {
      result.positionals.push(token);
      continue;
    }

    const key = parsed.key;
    if (!key) {
      throw new AppError(ERROR_CODES.VALIDATION, `Invalid option: "${token}".`);
    }

    if (booleanFlags.has(key)) {
      if (multiValueFlags.has(key)) {
        if (!Array.isArray(result.options[key])) {
          result.options[key] = [];
        }
        result.options[key].push(true);
      } else {
        result.options[key] = true;
      }
      continue;
    }

    const value = parsed.inlineValue !== undefined ? parsed.inlineValue : tokens[i + 1];
    if (value === undefined || String(value).startsWith('--')) {
      throw new AppError(ERROR_CODES.VALIDATION, `Missing value for option "--${key}".`);
    }

    if (parsed.inlineValue === undefined) {
      i += 1;
    }

    if (multiValueFlags.has(key)) {
      if (!Array.isArray(result.options[key])) {
        result.options[key] = [];
      }
      result.options[key].push(value);
    } else {
      result.options[key] = value;
    }
  }

  return result;
}

function parseGlobalOptions(argv, defaultOutput) {
  const globalOptions = {
    output: defaultOutput,
    dryRun: false
  };
  const commandTokens = [];

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--dry-run') {
      globalOptions.dryRun = true;
      continue;
    }
    if (token === '--output') {
      const next = argv[i + 1];
      if (!next || String(next).startsWith('--')) {
        throw new AppError(ERROR_CODES.VALIDATION, 'Missing value for --output.');
      }
      globalOptions.output = next;
      i += 1;
      continue;
    }
    if (String(token).startsWith('--output=')) {
      globalOptions.output = String(token).slice('--output='.length);
      continue;
    }
    commandTokens.push(token);
  }

  return { globalOptions, commandTokens };
}

function requirePositional(positionals, index, label) {
  const value = positionals[index];
  if (!value) {
    throw new AppError(ERROR_CODES.VALIDATION, `Missing ${label}.`);
  }
  return value;
}

function toInt(value, fallback, optionName) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }
  const parsed = Number.parseInt(String(value), 10);
  if (Number.isNaN(parsed) || parsed < 0) {
    throw new AppError(ERROR_CODES.VALIDATION, `Invalid integer for ${optionName}: "${value}".`);
  }
  return parsed;
}

module.exports = {
  parseArgs,
  parseGlobalOptions,
  requirePositional,
  toInt
};
