import json
import sys
from .constants import OUTPUT_FORMATS, ERROR_CODES
from .errors import AppError

def to_display_value(value):
    if value is None:
        return ''
    if isinstance(value, (dict, list)):
        return json.dumps(value)
    return str(value)

def to_table(rows):
    if not isinstance(rows, list) or len(rows) == 0:
        return 'No rows.'

    normalized_rows = []
    for row in rows:
        if isinstance(row, dict):
            normalized_rows.append(row)
        else:
            normalized_rows.append({'value': row})

    columns = []
    seen_columns = set()
    for row in normalized_rows:
        for key in row.keys():
            if key not in seen_columns:
                columns.append(key)
                seen_columns.add(key)

    widths = []
    for column in columns:
        max_w = len(column)
        for row in normalized_rows:
            val_w = len(to_display_value(row.get(column)))
            if val_w > max_w:
                max_w = val_w
        widths.append(max_w)

    header_parts = []
    for i, column in enumerate(columns):
        header_parts.append(column.ljust(widths[i]))
    header = ' | '.join(header_parts)

    separator_parts = []
    for width in widths:
        separator_parts.append('-' * width)
    separator = '-|-'.join(separator_parts)

    body_lines = []
    for row in normalized_rows:
        row_parts = []
        for i, column in enumerate(columns):
            row_parts.append(to_display_value(row.get(column)).ljust(widths[i]))
        body_lines.append(' | '.join(row_parts))
    body = '\n'.join(body_lines)

    return f"{header}\n{separator}\n{body}"

def print_result(result, output_format):
    if output_format not in OUTPUT_FORMATS:
        raise AppError(
            ERROR_CODES.VALIDATION,
            f"Invalid output format \"{output_format}\". Allowed values: {', '.join(OUTPUT_FORMATS)}."
        )

    if output_format == 'table':
        if isinstance(result, dict) and isinstance(result.get('tableRows'), list):
            print(to_table(result['tableRows']))
            return
        if isinstance(result, list):
            print(to_table(result))
            return

    payload = result.get('data') if isinstance(result, dict) and 'data' in result else result
    print(json.dumps(payload, indent=2))

def print_error(error):
    payload = {
        'ok': False,
        'error': {
            'code': getattr(error, 'code', ERROR_CODES.UNKNOWN),
            'message': str(error)
        }
    }
    if hasattr(error, 'status') and error.status is not None:
        payload['error']['status'] = error.status
    if hasattr(error, 'details') and error.details is not None:
        payload['error']['details'] = error.details
    
    print(json.dumps(payload, indent=2), file=sys.stderr)
