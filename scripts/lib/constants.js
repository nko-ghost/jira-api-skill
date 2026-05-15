const DEFAULT_API_PATH = '/rest/api/2';
const DEFAULT_OUTPUT = 'json';
const OUTPUT_FORMATS = ['json', 'table'];

const ERROR_CODES = {
  AUTH: 'auth',
  VALIDATION: 'validation',
  JIRA_HTTP: 'jira_http',
  UNKNOWN: 'unknown'
};

const EXIT_CODES = {
  SUCCESS: 0,
  UNKNOWN: 1,
  VALIDATION: 2,
  AUTH: 3,
  JIRA_HTTP: 4
};

module.exports = {
  DEFAULT_API_PATH,
  DEFAULT_OUTPUT,
  OUTPUT_FORMATS,
  ERROR_CODES,
  EXIT_CODES
};
