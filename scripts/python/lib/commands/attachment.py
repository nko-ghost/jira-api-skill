import os
import uuid
from ..args import parse_args, require_positional
from ..errors import AppError
from ..constants import ERROR_CODES
from ..utils import read_binary_file_from_cwd

NAME = 'attachment'

def build_multipart_formdata(fields, files):
    boundary = f'----WebKitFormBoundary{uuid.uuid4().hex}'
    lines = []
    
    for name, value in fields.items():
        lines.append(f'--{boundary}'.encode('utf-8'))
        lines.append(f'Content-Disposition: form-data; name="{name}"'.encode('utf-8'))
        lines.append(''.encode('utf-8'))
        lines.append(str(value).encode('utf-8'))
        
    for name, (filename, content) in files.items():
        lines.append(f'--{boundary}'.encode('utf-8'))
        lines.append(f'Content-Disposition: form-data; name="{name}"; filename="{filename}"'.encode('utf-8'))
        lines.append('Content-Type: application/octet-stream'.encode('utf-8'))
        lines.append(''.encode('utf-8'))
        lines.append(content)
        
    lines.append(f'--{boundary}--'.encode('utf-8'))
    lines.append(''.encode('utf-8'))
    
    body = b'\r\n'.join(lines)
    content_type = f'multipart/form-data; boundary={boundary}'
    
    return body, content_type

def run_add(args, context):
    parsed = parse_args(args)
    issue_key = require_positional(parsed['positionals'], 0, 'ISSUE-KEY')
    file_path = parsed['options'].get('file')
    if not file_path:
        raise AppError(ERROR_CODES.VALIDATION, 'attachment add requires --file.')

    file_data = read_binary_file_from_cwd(file_path)
    file_name = parsed['options'].get('name') or os.path.basename(file_data['absolute_path'])

    if context['global_options'].get('dry_run'):
        return {
            'data': {
                'ok': True,
                'dryRun': True,
                'action': 'attachment.add',
                'issueKey': issue_key,
                'request': {
                    'filePath': file_data['absolute_path'],
                    'fileName': file_name,
                    'size': len(file_data['buffer'])
                }
            }
        }

    body, content_type = build_multipart_formdata({}, {'file': (file_name, file_data['buffer'])})
    
    data = context['client'].add_attachment(issue_key, body, content_type)
    
    table_rows = [
        {
            'id': item.get('id'),
            'filename': item.get('filename'),
            'size': item.get('size'),
            'author': item.get('author', {}).get('displayName') if item.get('author') else ''
        } for item in (data if isinstance(data, list) else [])
    ]
    
    return {
        'data': data,
        'tableRows': table_rows
    }

def run_list(args, context):
    parsed = parse_args(args)
    issue_key = require_positional(parsed['positionals'], 0, 'ISSUE-KEY')
    issue_data = context['client'].list_attachments(issue_key)
    
    attachments = issue_data.get('fields', {}).get('attachment') or []
    
    return {
        'data': {
            'issueKey': issue_key,
            'attachments': attachments
        },
        'tableRows': [
            {
                'id': item.get('id'),
                'filename': item.get('filename'),
                'size': item.get('size'),
                'author': item.get('author', {}).get('displayName') if item.get('author') else '',
                'created': item.get('created')
            } for item in attachments
        ]
    }

SUBCOMMANDS = {
    'add': run_add,
    'list': run_list
}

def run(args, context):
    if not args:
        raise AppError(ERROR_CODES.VALIDATION, 'attachment requires subcommand add|list.')
    
    subcommand = args[0]
    rest = args[1:]
    
    if subcommand not in SUBCOMMANDS:
        raise AppError(ERROR_CODES.VALIDATION, 'attachment requires subcommand add|list.')
    
    return SUBCOMMANDS[subcommand](rest, context)
