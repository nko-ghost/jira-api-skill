import sys
from .config import resolve_config
from .args import parse_global_options
from .output import print_result, print_error
from .errors import to_app_error
from .constants import OUTPUT_FORMATS, EXIT_CODES
from .jira_client import JiraClient
from .field_resolver import FieldResolver
from .help import build_help_text
from .commands import run_command

def run_cli(argv):
    try:
        # Initial parse for help or basic errors
        global_opts_init, command_tokens_init = parse_global_options(argv, 'json')
        
        requested_help = (
            len(command_tokens_init) == 0 or
            command_tokens_init[0] in ('help', '--help', '-h')
        )
        if requested_help:
            print(build_help_text())
            return EXIT_CODES.SUCCESS

        config = resolve_config()
        global_options, command_tokens = parse_global_options(argv, config.default_output)
        
        if global_options['output'] not in OUTPUT_FORMATS:
            # This is also checked in print_result, but keeping parity
            raise Exception(f"Invalid --output \"{global_options['output']}\". Allowed values: {', '.join(OUTPUT_FORMATS)}.")

        client = JiraClient(config)
        field_resolver = FieldResolver(client, config)
        context = {
            'config': config,
            'client': client,
            'field_resolver': field_resolver,
            'global_options': global_options
        }

        result = run_command(command_tokens, context)
        
        if isinstance(result, dict) and result.get('help'):
            print(build_help_text())
            return EXIT_CODES.SUCCESS

        print_result(result, global_options['output'])
        return EXIT_CODES.SUCCESS
        
    except Exception as e:
        app_error = to_app_error(e)
        print_error(app_error)
        return getattr(app_error, 'exit_code', EXIT_CODES.UNKNOWN)
