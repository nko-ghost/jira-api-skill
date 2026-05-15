from .errors import AppError
from .constants import ERROR_CODES

def parse_option_token(token):
    option_token = str(token or '')
    if not option_token.startswith('--'):
        return None

    without_prefix = option_token[2:]
    equal_index = without_prefix.find('=')
    if equal_index == -1:
        return {'key': without_prefix, 'inline_value': None}

    return {
        'key': without_prefix[:equal_index],
        'inline_value': without_prefix[equal_index + 1:]
    }

def parse_args(tokens, boolean_flags=None, multi_value_flags=None):
    boolean_flags = set(boolean_flags or [])
    multi_value_flags = set(multi_value_flags or [])
    result = {
        'options': {},
        'positionals': []
    }

    i = 0
    while i < len(tokens):
        token = tokens[i]
        parsed = parse_option_token(token)
        if not parsed:
            result['positionals'].append(token)
            i += 1
            continue

        key = parsed['key']
        if not key:
            raise AppError(ERROR_CODES.VALIDATION, f'Invalid option: "{token}".')

        if key in boolean_flags:
            if key in multi_value_flags:
                if key not in result['options']:
                    result['options'][key] = []
                result['options'][key].append(True)
            else:
                result['options'][key] = True
            i += 1
            continue

        value = parsed['inline_value'] if parsed['inline_value'] is not None else (tokens[i + 1] if i + 1 < len(tokens) else None)
        
        if value is None or str(value).startswith('--'):
            raise AppError(ERROR_CODES.VALIDATION, f'Missing value for option "--{key}".')

        if parsed['inline_value'] is None:
            i += 2
        else:
            i += 1

        if key in multi_value_flags:
            if key not in result['options']:
                result['options'][key] = []
            result['options'][key].append(value)
        else:
            result['options'][key] = value

    return result

def parse_global_options(argv, default_output):
    global_options = {
        'output': default_output,
        'dry_run': False
    }
    command_tokens = []

    i = 0
    while i < len(argv):
        token = argv[i]
        if token == '--dry-run':
            global_options['dry_run'] = True
            i += 1
            continue
        if token == '--output':
            if i + 1 >= len(argv) or str(argv[i + 1]).startswith('--'):
                raise AppError(ERROR_CODES.VALIDATION, 'Missing value for --output.')
            global_options['output'] = argv[i + 1]
            i += 2
            continue
        if str(token).startswith('--output='):
            global_options['output'] = str(token)[len('--output='):]
            i += 1
            continue
        command_tokens.append(token)
        i += 1

    return global_options, command_tokens

def require_positional(positionals, index, label):
    if index >= len(positionals):
        raise AppError(ERROR_CODES.VALIDATION, f'Missing {label}.')
    return positionals[index]

def to_int(value, fallback, option_name):
    if value is None or value == '':
        return fallback
    try:
        parsed = int(str(value))
        if parsed < 0:
            raise ValueError()
        return parsed
    except ValueError:
        raise AppError(ERROR_CODES.VALIDATION, f'Invalid integer for {option_name}: "{value}".')
