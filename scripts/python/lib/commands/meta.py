from ..args import parse_args, require_positional
from ..errors import AppError
from ..constants import ERROR_CODES
from ..utils import pick_issue_type

NAME = 'meta'

def run_fields(args, context):
    parsed = parse_args(args)
    project_key = parsed['options'].get('project')
    issue_type_input = parsed['options'].get('issue-type')

    if not project_key:
        data = context['client'].get_fields()
        return {
            'data': data,
            'tableRows': [
                {
                    'id': field.get('id'),
                    'name': field.get('name'),
                    'custom': bool(field.get('custom')),
                    'type': field.get('schema', {}).get('type') if field.get('schema') else ''
                } for field in data
            ]
        }

    create_meta = context['client'].get_create_meta(project_key)
    projects = create_meta.get('projects') or []
    project = projects[0] if projects else None
    
    if not project:
        raise AppError(ERROR_CODES.VALIDATION, f"Project \"{project_key}\" not found in createmeta.")

    issuetypes = project.get('issuetypes') or []
    issue_type = pick_issue_type(issuetypes, issue_type_input) if issue_type_input else (issuetypes[0] if issuetypes else None)
    
    if not issue_type:
        raise AppError(ERROR_CODES.VALIDATION, f"Issue type \"{issue_type_input}\" not found in \"{project_key}\".")

    fields = issue_type.get('fields') or {}
    rows = [
        {
            'id': field_id,
            'name': fields[field_id].get('name'),
            'required': bool(fields[field_id].get('required')),
            'hasDefault': fields[field_id].get('hasDefaultValue') is True
        } for field_id in fields
    ]

    return {
        'data': {
            'project': project.get('key'),
            'issueType': issue_type.get('name'),
            'fields': fields
        },
        'tableRows': rows
    }

def run_issue_types(args, context):
    parsed = parse_args(args)
    project_key = parsed['options'].get('project') or require_positional(parsed['positionals'], 0, 'PROJECT-KEY')
    
    create_meta = context['client'].get_create_meta(project_key)
    projects = create_meta.get('projects') or []
    project = projects[0] if projects else None
    
    if not project:
        raise AppError(ERROR_CODES.VALIDATION, f"Project \"{project_key}\" not found.")
        
    issuetypes = project.get('issuetypes') or []
    return {
        'data': {
            'project': project.get('key'),
            'issueTypes': issuetypes
        },
        'tableRows': [
            {
                'id': t.get('id'),
                'name': t.get('name'),
                'subtask': bool(t.get('subtask'))
            } for t in issuetypes
        ]
    }

def run_edit_meta(args, context):
    parsed = parse_args(args)
    issue_key = require_positional(parsed['positionals'], 0, 'ISSUE-KEY')
    data = context['client'].get_edit_meta(issue_key)
    
    fields = data.get('fields') or {}
    return {
        'data': data,
        'tableRows': [
            {
                'id': field_id,
                'name': fields[field_id].get('name'),
                'required': bool(fields[field_id].get('required'))
            } for field_id in fields
        ]
    }

SUBCOMMANDS = {
    'fields': run_fields,
    'issue-types': run_issue_types,
    'editmeta': run_edit_meta
}

def run(args, context):
    if not args:
        raise AppError(ERROR_CODES.VALIDATION, 'meta requires subcommand fields|issue-types|editmeta.')
    
    subcommand = args[0]
    rest = args[1:]
    
    if subcommand not in SUBCOMMANDS:
        raise AppError(ERROR_CODES.VALIDATION, 'meta requires subcommand fields|issue-types|editmeta.')
    
    return SUBCOMMANDS[subcommand](rest, context)
