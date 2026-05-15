import json
import re
from .errors import AppError
from .constants import ERROR_CODES

def normalize_alias(value):
    return re.sub(r'[\s_-]+', '', str(value or '').strip().lower())

def parse_assignment(value):
    raw = str(value or '')
    separator_index = raw.find('=')
    if separator_index <= 0:
        raise AppError(
            ERROR_CODES.VALIDATION,
            f'Invalid --set "{raw}". Expected format field=value.'
        )
    field = raw[:separator_index].strip()
    input_str = raw[separator_index + 1:].strip()
    if not field:
        raise AppError(ERROR_CODES.VALIDATION, f'Invalid --set "{raw}". Missing field name.')
    return {'field': field, 'input': input_str}

def parse_input_value(input_str):
    text = str(input_str or '').strip()
    if text == 'null':
        return None
    if text == 'true':
        return True
    if text == 'false':
        return False
    
    if re.match(r'^-?\d+(\.\d+)?$', text):
        try:
            return float(text) if '.' in text else int(text)
        except ValueError:
            pass

    if (text.startswith('{') and text.endswith('}')) or \
       (text.startswith('[') and text.endswith(']')):
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            return text
            
    return text

def parse_csv_as_list(input_str):
    return [item.strip() for item in str(input_str or '').split(',') if item.strip()]

def normalize_transition_name(value):
    return re.sub(r'\s+', ' ', str(value or '').strip().lower())

def resolve_field_key(raw_field, resolver):
    alias = normalize_alias(raw_field)
    if alias in ('tags', 'tag', 'labels', 'label'):
        return 'labels'
    if alias in ('storypoints', 'storypoint'):
        return resolver.story_points_field
    if alias in ('epic', 'epiclink'):
        return resolver.resolve_epic_link_field()
    return raw_field

def normalize_field_value(field_key, input_value, raw_input):
    if field_key == 'labels':
        if isinstance(input_value, list):
            return [str(item).strip() for item in input_value if str(item).strip()]
        if isinstance(input_value, str):
            return parse_csv_as_list(input_value)
        return []

    if field_key in ('fixVersions', 'components'):
        items_list = input_value if isinstance(input_value, list) else parse_csv_as_list(raw_input)
        return [{'name': str(name).strip()} for name in items_list if str(name).strip()]

    return input_value

def build_fields_from_sets(assignments, resolver):
    fields = {}
    for item in (assignments or []):
        assignment = parse_assignment(item)
        field_key = resolve_field_key(assignment['field'], resolver)
        parsed_value = parse_input_value(assignment['input'])
        fields[field_key] = normalize_field_value(field_key, parsed_value, assignment['input'])
    return fields
