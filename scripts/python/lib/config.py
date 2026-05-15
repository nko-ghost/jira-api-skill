import os
from .constants import (
    DEFAULT_API_PATH,
    DEFAULT_OUTPUT,
    OUTPUT_FORMATS,
    ERROR_CODES
)
from .env import load_env_value
from .errors import AppError

def normalize_base_url(base_url):
    return str(base_url or '').rstrip('/')

def validate_config(config):
    if not config.get('token'):
        raise AppError(
            ERROR_CODES.AUTH,
            "JIRA_TOKEN is not configured. Set it in this skill's .env (copy from .env.example) or as an environment variable.",
            details={'envVar': 'JIRA_TOKEN'}
        )

    if not config.get('base_url'):
        raise AppError(
            ERROR_CODES.VALIDATION,
            "JIRA_BASE_URL is not configured. Set it in this skill's .env (copy from .env.example) or as an environment variable.",
            details={'envVar': 'JIRA_BASE_URL'}
        )

    base_url = normalize_base_url(config['base_url'])
    is_jira_cloud = '.atlassian.net' in base_url or '.jira.com' in base_url
    
    if is_jira_cloud and not config.get('user_email'):
        raise AppError(
            ERROR_CODES.VALIDATION,
            'ERROR_CONFIG: Jira Cloud requiere JIRA_USER_EMAIL y JIRA_TOKEN (API Token).',
            details={'envVar': 'JIRA_USER_EMAIL', 'host': base_url}
        )

    if config.get('default_output') and config['default_output'] not in OUTPUT_FORMATS:
        raise AppError(
            ERROR_CODES.VALIDATION,
            f"Invalid JIRA_OUTPUT \"{config['default_output']}\". Allowed values: {', '.join(OUTPUT_FORMATS)}."
        )

    config['base_url'] = base_url
    return config

class Config:
    def __init__(self, data):
        for key, value in data.items():
            setattr(self, key, value)

def resolve_config():
    # scripts/python/lib/config.py -> scripts/
    skill_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
    
    raw_config = {
        'token': load_env_value('JIRA_TOKEN', skill_root),
        'base_url': load_env_value('JIRA_BASE_URL', skill_root),
        'api_path': load_env_value('JIRA_API_PATH', skill_root) or DEFAULT_API_PATH,
        'story_points_field': str(load_env_value('JIRA_STORY_POINTS_FIELD', skill_root) or '').strip(),
        'epic_link_field': load_env_value('JIRA_EPIC_LINK_FIELD', skill_root),
        'default_output': load_env_value('JIRA_OUTPUT', skill_root) or DEFAULT_OUTPUT,
        'user_email': str(load_env_value('JIRA_USER_EMAIL', skill_root) or '').strip()
    }

    validated = validate_config(raw_config)
    
    api_path = validated['api_path']
    prefix = '' if api_path.startswith('/') else '/'
    api_base = f"{validated['base_url']}{prefix}{api_path}"
    validated['api_base'] = api_base

    return Config(validated)
