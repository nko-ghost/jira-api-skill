# Jira API Capabilities Covered by the Skill

## Support Matrix
The skill supports both **Jira Cloud** and **Jira Data Center (DC) / Server**.

| Feature | Jira Cloud (v3) | Jira Data Center (v2) |
| :--- | :--- | :--- |
| **Auth Strategy** | Basic (Email + API Token) | Bearer (PAT) |
| **Search Endpoint** | `/rest/api/3/search/jql` | `/rest/api/2/search` |
| **Field Mapping** | ADF (Atlassian Doc Format) | Wiki Markup / HTML |
| **Transitions** | Supported (v3) | Supported (v2) |

## Implemented Operations
- **Issue Search:** 
  - Cloud: Uses forcing v3 `/search/jql`.
  - DC: Uses `/search`.
- **Issue Detail:** `GET /issue/{key}`
- **Issue Create:** `POST /issue`
- **Issue Update:** `PUT /issue/{key}`
- **Transitions:** `GET/POST /issue/{key}/transitions`
- **Comments:** `GET/POST /issue/{key}/comment`
- **Attachments:** `POST /issue/{key}/attachments` (Anti-CSRF header handled).
- **Metadata:** `createmeta` (Cloud uses specialized project filtering), `editmeta`.

## Field Mapping Rules
- `tags`, `tag`, `label`, `labels` -> `labels`
- `epic`, `epicLink`, `epic_link` -> resolved Epic Link field id
- `storyPoints`, `story_point` -> configured story points field (`JIRA_STORY_POINTS_FIELD`)

## Write Safety & Reliability
- **Fail-Fast Auth:** The skill validates platform-specific auth requirements before any request.
- **Dry-Run:** Every write command supports `--dry-run` to preview payloads.
- **Single Auth Strategy:** No silent fallbacks or retries; configuration must be correct.

## Known Limitations
- **Rich Text:** When creating/updating issues in Cloud, Atlassian recommends ADF. This skill currently handles plain string fields which Jira Cloud auto-converts to ADF in most cases, but complex layouts might require raw JSON.
- **Data Center PAT:** Requires a Personal Access Token with appropriate scopes.

## Network & WAF Bypass (Important for AI Agents)
Many Jira instances (Cloud via Cloudflare or Datacenter via F5/Akamai) are protected by Web Application Firewalls (WAF).
- **Mandatory User-Agent:** All HTTP requests must include `'User-Agent': 'Mozilla/5.0'`.
- **Reason:** Default library agents (like `Python-urllib` or generic Node fetch) are often blocked with `403 Forbidden` errors.
- **Scope:** This is handled automatically by the central `JiraClient.request` method. If extending the skill with direct calls, ensure this header is present.
