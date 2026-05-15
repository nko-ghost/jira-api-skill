DEFAULT_API_PATH = '/rest/api/2'
DEFAULT_OUTPUT = 'json'
OUTPUT_FORMATS = ['json', 'table']

class ERROR_CODES:
    AUTH = 'auth'
    VALIDATION = 'validation'
    JIRA_HTTP = 'jira_http'
    UNKNOWN = 'unknown'

class EXIT_CODES:
    SUCCESS = 0
    UNKNOWN = 1
    VALIDATION = 2
    AUTH = 3
    JIRA_HTTP = 4
