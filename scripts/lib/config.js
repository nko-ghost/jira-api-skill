const path = require('path');
const {
  DEFAULT_API_PATH,
  DEFAULT_OUTPUT,
  OUTPUT_FORMATS,
  ERROR_CODES
} = require('./constants');
const { loadEnvValue } = require('./env');
const { AppError } = require('./errors');

function normalizeBaseUrl(baseUrl) {
  return String(baseUrl || '').replace(/\/+$/, '');
}

function validateConfig(config) {
  if (!config.token) {
    throw new AppError(
      ERROR_CODES.AUTH,
      'JIRA_TOKEN is not configured. Set it in this skill\'s .env (copy from .env.example) or as an environment variable.',
      { details: { envVar: 'JIRA_TOKEN' } }
    );
  }

  if (!config.baseUrl) {
    throw new AppError(
      ERROR_CODES.VALIDATION,
      'JIRA_BASE_URL is not configured. Set it in this skill\'s .env (copy from .env.example) or as an environment variable.',
      { details: { envVar: 'JIRA_BASE_URL' } }
    );
  }

  const baseUrl = normalizeBaseUrl(config.baseUrl);
  const isJiraCloud = baseUrl.includes('.atlassian.net') || baseUrl.includes('.jira.com');
  
  if (isJiraCloud && !config.userEmail) {
    throw new AppError(
      ERROR_CODES.VALIDATION,
      'ERROR_CONFIG: Jira Cloud requiere JIRA_USER_EMAIL y JIRA_TOKEN (API Token).',
      { details: { envVar: 'JIRA_USER_EMAIL', host: baseUrl } }
    );
  }

  if (config.defaultOutput && !OUTPUT_FORMATS.includes(config.defaultOutput)) {
    throw new AppError(
      ERROR_CODES.VALIDATION,
      `Invalid JIRA_OUTPUT "${config.defaultOutput}". Allowed values: ${OUTPUT_FORMATS.join(', ')}.`
    );
  }

  return {
    ...config,
    baseUrl
  };
}

function resolveConfig() {
  const skillRoot = path.join(__dirname, '..', '..');
  
  const rawConfig = {
    token: loadEnvValue('JIRA_TOKEN', skillRoot),
    baseUrl: loadEnvValue('JIRA_BASE_URL', skillRoot),
    apiPath: loadEnvValue('JIRA_API_PATH', skillRoot) || DEFAULT_API_PATH,
    storyPointsField: String(loadEnvValue('JIRA_STORY_POINTS_FIELD', skillRoot) || '').trim(),
    epicLinkField: loadEnvValue('JIRA_EPIC_LINK_FIELD', skillRoot),
    defaultOutput: loadEnvValue('JIRA_OUTPUT', skillRoot) || DEFAULT_OUTPUT,
    userEmail: String(loadEnvValue('JIRA_USER_EMAIL', skillRoot) || '').trim()
  };

  const validated = validateConfig(rawConfig);
  
  const apiBase = `${validated.baseUrl}${validated.apiPath.startsWith('/') ? validated.apiPath : `/${validated.apiPath}`}`;

  return {
    ...validated,
    apiBase
  };
}

module.exports = {
  resolveConfig,
  validateConfig
};
