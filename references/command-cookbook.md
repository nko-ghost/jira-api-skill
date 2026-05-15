# Jira CLI Command Cookbook

## Search
```powershell
node scripts/jira-api.js search "project = YOURPROJ AND status = \"In Progress\""
node scripts/jira-api.js --output table search "assignee = currentUser()" --max-results 20
```

## Issue
```powershell
node scripts/jira-api.js issue get YOURPROJ-141
node scripts/jira-api.js issue create --project YOURPROJ --type Story --summary "New Story"
node scripts/jira-api.js issue update YOURPROJ-141 --set tags=frontend,qa --set epic=YOURPROJ-100
node scripts/jira-api.js issue transitions YOURPROJ-141
node scripts/jira-api.js issue transition YOURPROJ-141 "In Progress"
node scripts/jira-api.js issue changelog YOURPROJ-141
node scripts/jira-api.js issue editmeta YOURPROJ-141
```

## Comments
```powershell
node scripts/jira-api.js comment list YOURPROJ-141
node scripts/jira-api.js comment add YOURPROJ-141 --body "Deploy completed"
```

## Attachments
```powershell
node scripts/jira-api.js attachment list YOURPROJ-141
node scripts/jira-api.js attachment add YOURPROJ-141 --file "draft/report.txt"
```

## Metadata
```powershell
node scripts/jira-api.js meta fields
node scripts/jira-api.js meta fields --project YOURPROJ --issue-type Story
node scripts/jira-api.js meta issue-types --project YOURPROJ
node scripts/jira-api.js meta editmeta YOURPROJ-141
```

## Dry Run
```powershell
node scripts/jira-api.js --dry-run issue update YOURPROJ-141 --set summary="New title"
node scripts/jira-api.js --dry-run attachment add YOURPROJ-141 --file "draft/report.txt"
```
