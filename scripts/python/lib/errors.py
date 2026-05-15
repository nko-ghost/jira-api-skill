from .constants import ERROR_CODES, EXIT_CODES

class AppError(Exception):
    def __init__(self, code, message, details=None, status=None, exit_code=None):
        super().__init__(message)
        self.code = code or ERROR_CODES.UNKNOWN
        self.message = message
        self.details = details
        self.status = status
        self.exit_code = exit_code or self.get_exit_code_from_error_code(self.code)

    @staticmethod
    def get_exit_code_from_error_code(code):
        if code == ERROR_CODES.AUTH:
            return EXIT_CODES.AUTH
        elif code == ERROR_CODES.VALIDATION:
            return EXIT_CODES.VALIDATION
        elif code == ERROR_CODES.JIRA_HTTP:
            return EXIT_CODES.JIRA_HTTP
        else:
            return EXIT_CODES.UNKNOWN

def classify_http_error(status):
    if status in (401, 403):
        return ERROR_CODES.AUTH
    return ERROR_CODES.JIRA_HTTP

def to_app_error(error):
    if isinstance(error, AppError):
        return error

    message = str(error) if error else 'Unexpected error'
    return AppError(
        ERROR_CODES.UNKNOWN,
        message
    )
