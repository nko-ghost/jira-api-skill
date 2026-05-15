from ..args import parse_args, require_positional, to_int
from ..errors import AppError
from ..constants import ERROR_CODES
from ..utils import read_text_file_from_cwd

NAME = 'comment'

def run_add(args, context):
    parsed = parse_args(args)
    issue_key = require_positional(parsed['positionals'], 0, 'ISSUE-KEY')
    
    body = None
    if parsed['options'].get('body-file'):
        body = read_text_file_from_cwd(parsed['options']['body-file'])
    else:
        body = parsed['options'].get('body')

    if not body:
        raise AppError(ERROR_CODES.VALIDATION, 'comment add requires --body or --body-file.')

    if context['global_options'].get('dry_run'):
        return {
            'data': {
                'ok': True,
                'dryRun': True,
                'action': 'comment.add',
                'issueKey': issue_key,
                'request': {'body': body}
            }
        }

    data = context['client'].add_comment(issue_key, body)
    return {
        'data': data,
        'tableRows': [
            {
                'issueKey': issue_key,
                'id': data.get('id'),
                'author': data.get('author', {}).get('displayName') if data.get('author') else '',
                'created': data.get('created')
            }
        ]
    }

def run_list(args, context):
    parsed = parse_args(args)
    issue_key = require_positional(parsed['positionals'], 0, 'ISSUE-KEY')
    start_at = to_int(parsed['options'].get('start-at'), 0, '--start-at')
    max_results = to_int(parsed['options'].get('max-results'), 50, '--max-results')
    
    data = context['client'].list_comments(issue_key, start_at=start_at, max_results=max_results)
    comments = data.get('comments') or []
    
    return {
        'data': data,
        'tableRows': [
            {
                'id': item.get('id'),
                'author': item.get('author', {}).get('displayName') if item.get('author') else '',
                'created': item.get('created'),
                'body': str(item.get('body') or '').replace('\n', ' ').replace('\r', ' ')[:80]
            } for item in comments
        ]
    }

SUBCOMMANDS = {
    'add': run_add,
    'list': run_list
}

def run(args, context):
    if not args:
        raise AppError(ERROR_CODES.VALIDATION, 'comment requires subcommand add|list.')
    
    subcommand = args[0]
    rest = args[1:]
    
    if subcommand not in SUBCOMMANDS:
        raise AppError(ERROR_CODES.VALIDATION, 'comment requires subcommand add|list.')
    
    return SUBCOMMANDS[subcommand](rest, context)
