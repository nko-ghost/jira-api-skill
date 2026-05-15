import re
from ..args import parse_args, require_positional, to_int
from ..field_mapper import build_fields_from_sets, normalize_transition_name
from ..utils import read_text_file_from_cwd, to_issue_type_object, pick_issue_type
from ..errors import AppError
from ..constants import ERROR_CODES

NAME = 'issue'

def normalize_required_field(field_value):
    if field_value is None:
        return False
    if isinstance(field_value, str):
        return len(field_value.strip()) > 0
    if isinstance(field_value, list):
        return len(field_value) > 0
    return True

def extract_createmeta_project(create_meta):
    projects = create_meta.get('projects') or []
    return projects[0] if projects else None

def get_issue_type_from_createmeta(create_meta, issue_type_input):
    project = extract_createmeta_project(create_meta)
    if not project:
        return None
    return pick_issue_type(project.get('issuetypes'), issue_type_input)

def run_get(args, context):
    parsed = parse_args(args)
    issue_key = require_positional(parsed['positionals'], 0, 'ISSUE-KEY')
    spf = context['config'].story_points_field
    
    default_fields = f"key,summary,status,assignee,{spf},issuetype,created,updated,description" if spf else \
                     "key,summary,status,assignee,issuetype,created,updated,description"
    
    fields = parsed['options'].get('fields') or default_fields
    expand = parsed['options'].get('expand')
    
    data = context['client'].get_issue(issue_key, fields=fields, expand=expand)
    issue_fields = data.get('fields') or {}
    
    return {
        'data': data,
        'tableRows': [
            {
                'key': data.get('key'),
                'summary': issue_fields.get('summary'),
                'status': issue_fields.get('status', {}).get('name') if issue_fields.get('status') else '',
                'assignee': issue_fields.get('assignee', {}).get('displayName') if issue_fields.get('assignee') else '',
                'storyPoints': issue_fields.get(spf) if spf else ''
            }
        ]
    }

def run_create(args, context):
    parsed = parse_args(args, multi_value_flags=['set'])
    project_key = parsed['options'].get('project')
    issue_type = parsed['options'].get('type')
    summary = parsed['options'].get('summary')

    if not project_key or not issue_type or not summary:
        raise AppError(
            ERROR_CODES.VALIDATION,
            'issue create requires --project, --type and --summary.'
        )

    description = None
    if parsed['options'].get('description-file'):
        description = read_text_file_from_cwd(parsed['options']['description-file'])
    else:
        description = parsed['options'].get('description')

    dynamic_fields = build_fields_from_sets(parsed['options'].get('set') or [], context['field_resolver'])
    
    fields = {
        **dynamic_fields,
        'project': {'key': project_key},
        'issuetype': to_issue_type_object(issue_type),
        'summary': summary
    }
    if description:
        fields['description'] = description

    create_meta = context['client'].get_create_meta(project_key)
    issue_type_meta = get_issue_type_from_createmeta(create_meta, issue_type)
    if not issue_type_meta:
        raise AppError(
            ERROR_CODES.VALIDATION,
            f"Issue type \"{issue_type}\" not found in project \"{project_key}\".",
            details={'projectKey': project_key, 'issueType': issue_type}
        )

    meta_fields = issue_type_meta.get('fields') or {}
    required_field_ids = [
        fid for fid, spec in meta_fields.items() 
        if spec and spec.get('required') and fid not in ('project', 'issuetype', 'summary')
    ]

    missing_required = [fid for fid in required_field_ids if not normalize_required_field(fields.get(fid))]
    if missing_required:
        raise AppError(
            ERROR_CODES.VALIDATION,
            'Missing required fields for issue creation.',
            details={'missingRequired': missing_required}
        )

    if context['global_options'].get('dry_run'):
        return {
            'data': {
                'ok': True,
                'dryRun': True,
                'action': 'issue.create',
                'request': {'fields': fields}
            }
        }

    data = context['client'].create_issue(fields)
    return {
        'data': data,
        'tableRows': [data]
    }

def run_update(args, context):
    parsed = parse_args(args, multi_value_flags=['set'])
    issue_key = require_positional(parsed['positionals'], 0, 'ISSUE-KEY')
    set_values = parsed['options'].get('set') or []
    fields = build_fields_from_sets(set_values, context['field_resolver'])

    if parsed['options'].get('description-file'):
        fields['description'] = read_text_file_from_cwd(parsed['options']['description-file'])
    elif parsed['options'].get('description') is not None:
        fields['description'] = parsed['options']['description']

    if not fields:
        raise AppError(ERROR_CODES.VALIDATION, 'issue update requires at least one field via --set.')

    if context['global_options'].get('dry_run'):
        return {
            'data': {
                'ok': True,
                'dryRun': True,
                'action': 'issue.update',
                'issueKey': issue_key,
                'request': {'fields': fields}
            }
        }

    context['client'].update_issue(issue_key, fields)
    return {
        'data': {'ok': True, 'issueKey': issue_key, 'message': 'Issue updated.'},
        'tableRows': [{'issueKey': issue_key, 'updatedFields': ', '.join(fields.keys())}]
    }

def run_transitions(args, context):
    parsed = parse_args(args)
    issue_key = require_positional(parsed['positionals'], 0, 'ISSUE-KEY')
    data = context['client'].get_transitions(issue_key)
    
    transitions = []
    for t in (data.get('transitions') or []):
        transitions.append({
            'id': t.get('id'),
            'name': t.get('name'),
            'to': t.get('to', {}).get('name') if t.get('to') else ''
        })
        
    return {
        'data': {'issueKey': issue_key, 'transitions': transitions},
        'tableRows': transitions
    }

def run_transition(args, context):
    parsed = parse_args(args)
    issue_key = require_positional(parsed['positionals'], 0, 'ISSUE-KEY')
    target = require_positional(parsed['positionals'], 1, 'TRANSITION')

    transitions_data = context['client'].get_transitions(issue_key)
    transitions = transitions_data.get('transitions') or []
    target_normalized = normalize_transition_name(target)
    
    match = None
    for item in transitions:
        name = normalize_transition_name(item.get('name'))
        to_name = normalize_transition_name(item.get('to', {}).get('name') if item.get('to') else '')
        if str(item.get('id')) == str(target) or name == target_normalized or to_name == target_normalized:
            match = item
            break

    if not match:
        raise AppError(
            ERROR_CODES.VALIDATION,
            f"Transition \"{target}\" is not available for {issue_key}.",
            details={
                'availableTransitions': [
                    {'id': t.get('id'), 'name': t.get('name'), 'to': t.get('to', {}).get('name') if t.get('to') else ''}
                    for t in transitions
                ]
            }
        )

    if context['global_options'].get('dry_run'):
        return {
            'data': {
                'ok': True,
                'dryRun': True,
                'action': 'issue.transition',
                'issueKey': issue_key,
                'request': {'transition': {'id': match['id']}}
            }
        }

    context['client'].transition_issue(issue_key, match['id'])
    return {
        'data': {
            'ok': True,
            'issueKey': issue_key,
            'transition': {
                'id': match['id'], 
                'name': match.get('name'), 
                'to': match.get('to', {}).get('name') if match.get('to') else ''
            }
        },
        'tableRows': [
            {
                'issueKey': issue_key, 
                'transition': match.get('name'), 
                'to': match.get('to', {}).get('name') if match.get('to') else ''
            }
        ]
    }

def run_changelog(args, context):
    parsed = parse_args(args)
    issue_key = require_positional(parsed['positionals'], 0, 'ISSUE-KEY')
    max_results = to_int(parsed['options'].get('max-results'), 50, '--max-results')
    
    data = context['client'].get_issue(issue_key, fields='key,summary,status,assignee', expand='changelog')
    changelog = data.get('changelog') or {}
    histories = (changelog.get('histories') or [])[:max_results]
    
    table_rows = [
        {
            'id': item.get('id'),
            'author': item.get('author', {}).get('displayName') if item.get('author') else '',
            'created': item.get('created'),
            'items': len(item.get('items') or [])
        } for item in histories
    ]

    return {
        'data': {
            'key': data.get('key'),
            'summary': data.get('fields', {}).get('summary') or '',
            'changelog': histories
        },
        'tableRows': table_rows
    }

def run_edit_meta(args, context):
    parsed = parse_args(args)
    issue_key = require_positional(parsed['positionals'], 0, 'ISSUE-KEY')
    data = context['client'].get_edit_meta(issue_key)
    
    fields = data.get('fields') or {}
    table_rows = [
        {
            'id': fid,
            'name': fields[fid].get('name'),
            'required': bool(fields[fid].get('required')),
            'operations': ', '.join(fields[fid].get('operations') or [])
        } for fid in fields
    ]
    return {
        'data': data,
        'tableRows': table_rows
    }

SUBCOMMANDS = {
    'get': run_get,
    'create': run_create,
    'update': run_update,
    'transitions': run_transitions,
    'transition': run_transition,
    'changelog': run_changelog,
    'editmeta': run_edit_meta
}

def run(args, context):
    if not args:
        raise AppError(
            ERROR_CODES.VALIDATION,
            'issue requires a subcommand. Use: get|create|update|transitions|transition|changelog|editmeta.'
        )
    
    maybe_subcommand = args[0]
    rest = args[1:]
    
    if maybe_subcommand in SUBCOMMANDS:
        return SUBCOMMANDS[maybe_subcommand](rest, context)
    
    # Shortcut for ISSUE-123
    if re.match(r'^[A-Z][A-Z0-9]+-\d+$', maybe_subcommand, re.IGNORECASE):
        return run_get([maybe_subcommand] + rest, context)
        
    raise AppError(ERROR_CODES.VALIDATION, f"Unknown issue subcommand \"{maybe_subcommand}\".")
