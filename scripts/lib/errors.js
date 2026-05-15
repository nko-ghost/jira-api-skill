const { ERROR_CODES, EXIT_CODES } = require('./constants');

class AppError extends Error {
  constructor(code, message, options = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code || ERROR_CODES.UNKNOWN;
    this.details = options.details;
    this.status = options.status;
    this.exitCode = options.exitCode || getExitCodeFromErrorCode(this.code);
  }
}

function getExitCodeFromErrorCode(code) {
  switch (code) {
    case ERROR_CODES.AUTH:
      return EXIT_CODES.AUTH;
    case ERROR_CODES.VALIDATION:
      return EXIT_CODES.VALIDATION;
    case ERROR_CODES.JIRA_HTTP:
      return EXIT_CODES.JIRA_HTTP;
    default:
      return EXIT_CODES.UNKNOWN;
  }
}

function classifyHttpError(status) {
  if (status === 401 || status === 403) {
    return ERROR_CODES.AUTH;
  }
  return ERROR_CODES.JIRA_HTTP;
}

function toAppError(error) {
  if (error instanceof AppError) {
    return error;
  }

  return new AppError(
    ERROR_CODES.UNKNOWN,
    error && error.message ? error.message : 'Unexpected error',
    { details: error && error.stack ? { stack: error.stack } : undefined }
  );
}

module.exports = {
  AppError,
  classifyHttpError,
  toAppError
};
