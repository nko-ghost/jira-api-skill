---
name: jira-integration
description: Modular Jira CLI for reading and updating issues (search, create, update, comments, attachments, transitions, changelog, metadata). Use this skill when working with tickets, sprints, story points, labels/tags, Epic Link, or planning workflows in Jira.
---

# Jira Integration

## Purpose
- Provide a local, script-first Jira integration for agents.
- Keep `SKILL.md` short for onboarding and move deeper docs into `references/`.
- Support safe growth: when a requested capability does not exist, propose a scoped patch plan first, then implement only after explicit confirmation.

## Runtime
- **Configuration:** copy `.env.example` to `.env` in this skill folder and set required variables (no instance URL is hardcoded in code).
- **Required env:** `JIRA_TOKEN`, `JIRA_BASE_URL` (and `JIRA_USER_EMAIL` for Jira Cloud).
- **Default API path** (if unset): `/rest/api/2` (typical Jira Cloud).
- **Dual Runtime Support:**
  - **Node.js:** Entrypoint `scripts/jira-api.js` (Node 24+).
  - **Python:** Entrypoint `scripts/jira-api.py` (Python 3.x, zero dependencies).

## Authentication and optional envs
- Optional:
  - `JIRA_API_PATH`
  - `JIRA_STORY_POINTS_FIELD` (for story point column / aliases in this CLI)
  - `JIRA_EPIC_LINK_FIELD`
  - `JIRA_OUTPUT` (`json` or `table`)

## Quick Start
```powershell
node scripts/jira-api.js help
node scripts/jira-api.js search "project = YOURPROJ AND sprint in openSprints()"
node scripts/jira-api.js issue get YOURPROJ-141
```

## CLI Contract
- Global options:
  - `--output json|table`
  - `--dry-run` (write actions only)
- Main commands:
  - `search [JQL]`
  - `issue get|create|update|transitions|transition|changelog|editmeta ...`
  - `comment add|list ...`
  - `attachment add|list ...`
  - `meta fields|issue-types|editmeta ...`

## Cognitive Hooks (Agent Guidelines)
- **Terminology vs. Issue Type:** Differentiate between colloquial usage and formal filters.
    - If a user uses terms like "tickets", "stories", "historias", or "tareas" in a general way (e.g., "show my stories", "dame mis tickets"), **DO NOT** add an `issuetype` filter to the JQL. Assume they refer to all relevant issues in that context.
    - **ONLY** filter by `issuetype` if the user is explicit (e.g., "of type Story", "de tipo RC", "formal type: Technical Story").
- **Language Agnostic:** This logic must apply regardless of the user's language (Spanish, English, etc.).
- **Runtime Selection:**
    - Before execution, check if `node` or `python` is available in the environment.
    - If only one is available, use its corresponding entrypoint.
    - If both are available, **prefer Python** (`python scripts/jira-api.py`) as it is the lighter, non-compiled option for this task.
    - Maintain identical command arguments and expected outputs across both runtimes.

## Examples
```powershell
# Create issue
node scripts/jira-api.js issue create --project YOURPROJ --type Story --summary "Discovery follow-up" --description "Created by skill"

# Update fields (tags + Epic Link + custom field)
node scripts/jira-api.js issue update YOURPROJ-141 --set tags=backend,qa --set epic=YOURPROJ-100 --set customfield_12345=foo

# Add comment
node scripts/jira-api.js comment add YOURPROJ-141 --body "Ready for QA"

# Add attachment
node scripts/jira-api.js attachment add YOURPROJ-141 --file "draft/notes.txt"

# Changelog
node scripts/jira-api.js issue changelog YOURPROJ-141 --max-results 20
```

## Error Contract
- Stable codes:
  - `auth`
  - `validation`
  - `jira_http`
  - `unknown`
- Errors are returned as JSON to stderr:
```json
{
  "ok": false,
  "error": {
    "code": "validation",
    "message": "..."
  }
}
```

## Auto-Increment Workflow (Required)
When a user asks for a Jira capability that does not exist in commands:
1. Inspect current modules under `scripts/lib/commands`.
2. Check capability references in `references/`.
3. Produce a short patch plan with interfaces, behavior, tests, and docs impact.
4. Wait for explicit confirmation.
5. Implement with tests and update `references/` + `SKILL.md` only if command surface changed.

## References
- Command cookbook: `references/command-cookbook.md`
- API capabilities: `references/api-capabilities.md`
- Auto-increment process: `references/auto-increment-workflow.md`
- Technical architecture: `README.md`

## Extensibility & Sandbox
The core of this skill is strictly agnostic. Customizations, proprietary metrics, or specific ad-hoc commands MUST NOT be added to the core lib/commands/. 

Instead, AIs and users should create custom commands in /sandbox/features/. 
If a user runs 
ode scripts/jira-api.js my-custom-command, the CLI will automatically look for and execute sandbox/features/my-custom-command.js (or .py), injecting the authenticated context directly into its un(args, context) method.
