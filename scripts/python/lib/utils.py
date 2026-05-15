import os
import re
from .errors import AppError
from .constants import ERROR_CODES

def read_text_file_from_cwd(file_path):
    absolute_path = os.path.abspath(file_path) if os.path.isabs(file_path) else os.path.join(os.getcwd(), file_path)
    if not os.path.exists(absolute_path):
        raise AppError(ERROR_CODES.VALIDATION, f"File not found: {absolute_path}")
    
    with open(absolute_path, 'r', encoding='utf-8') as f:
        return f.read()

def read_binary_file_from_cwd(file_path):
    absolute_path = os.path.abspath(file_path) if os.path.isabs(file_path) else os.path.join(os.getcwd(), file_path)
    if not os.path.exists(absolute_path):
        raise AppError(ERROR_CODES.VALIDATION, f"File not found: {absolute_path}")
    
    with open(absolute_path, 'rb') as f:
        return {
            'absolute_path': absolute_path,
            'buffer': f.read()
        }

def is_numeric(value):
    if value is None:
        return False
    return bool(re.match(r'^\d+$', str(value).strip()))

def to_issue_type_object(value):
    if is_numeric(value):
        return {'id': str(value)}
    return {'name': str(value)}

def pick_issue_type(issuetypes, target):
    normalized = str(target or '').strip().lower()
    for item in (issuetypes or []):
        if str(item.get('id')) == str(target) or \
           str(item.get('name') or '').strip().lower() == normalized:
            return item
    return None
