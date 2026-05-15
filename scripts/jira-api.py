import sys
import os

# Add the 'python' directory to sys.path to find 'lib'
sys.path.append(os.path.join(os.path.dirname(__file__), 'python'))

from lib.cli import run_cli

if __name__ == '__main__':
    # Usage: python scripts/jira-api.py <command> [args]
    exit_code = run_cli(sys.argv[1:])
    sys.exit(exit_code)
