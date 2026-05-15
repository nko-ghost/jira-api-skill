def build_help_text():
    return """
Jira Integration CLI

Global options:
  --output json|table   Output format (default: json)
  --dry-run             Show write payloads without executing writes

Commands:
  search [JQL]
      --max-results N
      --start-at N
      --fields CSV

  issue get ISSUE-KEY
  issue create --project KEY --type TYPE --summary "Text" [--description "Text"] [--description-file path] [--set field=value]
  issue update ISSUE-KEY --set field=value [--set field=value] [--description "Text"] [--description-file path]
  issue transitions ISSUE-KEY
  issue transition ISSUE-KEY TARGET
  issue changelog ISSUE-KEY [--max-results N]
  issue editmeta ISSUE-KEY

  comment add ISSUE-KEY --body "Text" [--body-file path]
  comment list ISSUE-KEY [--max-results N] [--start-at N]

  attachment add ISSUE-KEY --file path [--name override-name]
  attachment list ISSUE-KEY

  meta fields [--project KEY] [--issue-type NAME_OR_ID]
  meta issue-types --project KEY
  meta editmeta ISSUE-KEY

Shortcuts:
  issue ISSUE-123            Alias for "issue get ISSUE-123"
""".strip()
