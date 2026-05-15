# Auto-Increment Workflow (Plan + Confirmation)

Use this workflow when a requested Jira capability is missing from existing commands.

## 1) Detect
- Confirm the capability is not implemented in `scripts/lib/commands`.
- Capture the exact user intent and expected CLI shape.

## 2) Explore
- Inspect related Jira endpoints and current client helpers.
- Reuse existing parsers, field mapping, error contract, and output contract.

## 3) Propose (Required Before Coding)
- Share a short plan containing:
  - command syntax
  - payload shape
  - validation and error behavior
  - tests to add
  - docs to update
- Wait for explicit confirmation.

## 4) Implement
- Add or extend command module.
- Register command in `commands/index.js`.
- Add/adjust tests under `tests/`.
- **WAF Compliance:** If making raw HTTP calls (outside `JiraClient.request`), you MUST set `'User-Agent': 'Mozilla/5.0'`.
- Keep output and error contracts consistent.

## 5) Document
- Update `references/command-cookbook.md`.
- Update `references/api-capabilities.md` if API coverage changed.
- Update `SKILL.md` only if command surface changed.

## 6) Verify
- Run `node --test tests/*.test.js`
- **Dual-Runtime Smoke Test:** Run the new command (or a related one) in both Node.js and Python to ensure network/WAF parity.
- Run one smoke command with `--dry-run` for write paths.
