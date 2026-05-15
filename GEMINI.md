# Jira Integration Skill - Context

This project is a modular, dependency-free Jira CLI tool designed as a skill for Gemini CLI. It provides an interface for interacting with Jira issues, comments, attachments, and transitions.

## Project Overview

- **Core Technologies:** Node.js (24+), Native `fetch` API.
- **Architecture:**
    - `scripts/jira-api.js`: Entry point for the CLI.
    - `scripts/lib/cli.js`: Bootstraps configuration and dispatches commands.
    - `scripts/lib/jira-client.js`: Shared HTTP client for Jira API with automatic auth handling (Bearer or Basic).
    - `scripts/lib/commands/`: Directory containing domain-specific command modules (issue, comment, search, etc.).
    - `scripts/lib/field-resolver.js` & `scripts/lib/field-mapper.js`: Logic for mapping human-readable aliases (e.g., `epic`, `tags`) to Jira custom field IDs.
- **Configuration:** Managed via `.env` file (copy from `.env.example`) or environment variables. Key variables: `JIRA_TOKEN`, `JIRA_BASE_URL`, `JIRA_USER_EMAIL` (for Basic auth).

## Building and Running

- **No Build Required:** The project uses pure JavaScript.
- **Execution:** Use `node scripts/jira-api.js <command> [args]`.
- **Quick Examples:**
  ```bash
  node scripts/jira-api.js help
  node scripts/jira-api.js search "project = PROJ"
  node scripts/jira-api.js issue get PROJ-123
  ```

## Testing

- **Framework:** Uses Node.js built-in test runner (`node --test`).
- **Running Tests:** Execute from the repository root:
  ```bash
  node --test tests/*.test.js
  ```
- **Coverage:** Includes unit tests for arguments, field mapping, and integration tests for the `JiraClient`.

## Development Conventions

- **Modular Commands:** New capabilities should be added as new files in `scripts/lib/commands/` and registered in `scripts/lib/commands/index.js`.
- **Field Aliasing:** Prefer using aliases defined in `field-mapper.js` rather than raw Jira field IDs when possible.
- **Error Handling:** Errors are classified into stable codes (`auth`, `validation`, `jira_http`, `unknown`) and returned as JSON to stderr.
- **Auto-Increment Workflow:** Before implementing a new capability:
    1.  Research existing modules and `references/`.
    2.  Draft a patch plan (interfaces, behavior, tests).
    3.  Obtain confirmation before implementation.
- **Documentation:** Keep `SKILL.md` updated with CLI contract changes and detailed guides in `references/`.
- **Security:** Never log or print the Jira token.

## Key Files

- `SKILL.md`: Main skill definition and quick reference.
- `README.md`: Technical architecture overview.
- `scripts/lib/commands/index.js`: Command registry.
- `references/command-cookbook.md`: Detailed usage examples.
- `references/auto-increment-workflow.md`: Protocol for extending the skill.
