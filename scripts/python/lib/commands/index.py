import re
from ..errors import AppError
from ..constants import ERROR_CODES
from . import search, issue, comment, attachment, meta

# Dispatch map
ROOT_COMMANDS = {
    'search': search,
    'issue': issue,
    'comment': comment,
    'attachment': attachment,
    'meta': meta
}

def run_legacy_command(name, args, context):
    if name == 'transitions':
        return issue.run(['transitions'] + args, context)
    if name == 'transition':
        return issue.run(['transition'] + args, context)
    if name == 'update-description':
        if len(args) < 2:
            raise AppError(
                ERROR_CODES.VALIDATION,
                'update-description requires ISSUE-KEY and file path.'
            )
        issue_key, file_path = args[0], args[1]
        return issue.run(['update', issue_key, '--description-file', file_path], context)
    return None

def run_command(command_tokens, context):
    if not isinstance(command_tokens, list) or len(command_tokens) == 0:
        return {'help': True}

    root_name = command_tokens[0]
    rest = command_tokens[1:]

    if root_name in ('help', '--help', '-h'):
        return {'help': True}

    if root_name in ROOT_COMMANDS:
        return ROOT_COMMANDS[root_name].run(rest, context)

    legacy_result = run_legacy_command(root_name, rest, context)
    if legacy_result is not None:
        return legacy_result

    # Shortcut for ISSUE-123
    if re.match(r'^[A-Z][A-Z0-9]+-\d+$', root_name, re.IGNORECASE):
        return issue.run(['get', root_name] + rest, context)

    import os
    import importlib.util
    skill_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))
    plugin_path = os.path.join(skill_root, 'sandbox', 'features', f"{root_name}.py")
    if os.path.exists(plugin_path):
        spec = importlib.util.spec_from_file_location(root_name, plugin_path)
        plugin_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(plugin_module)
        return plugin_module.run(rest, context)

    raise AppError(ERROR_CODES.VALIDATION, f"Unknown command \"{root_name}\". Use \"help\".")
