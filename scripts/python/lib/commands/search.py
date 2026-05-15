from ..args import parse_args, to_int

NAME = 'search'

DEFAULT_FIELDS = ','.join([
    'key',
    'summary',
    'status',
    'assignee',
    'issuetype',
    'created',
    'updated'
])

def build_rows(issues, story_points_field):
    rows = []
    for issue in (issues or []):
        fields = issue.get('fields') or {}
        assignee = fields.get('assignee') or {}
        rows.append({
            'key': issue.get('key'),
            'summary': fields.get('summary'),
            'status': fields.get('status', {}).get('name') if fields.get('status') else '',
            'assignee': assignee.get('displayName') or assignee.get('name') or '',
            'storyPoints': fields.get(story_points_field) if story_points_field else ''
        })
    return rows

def run(args, context):
    parsed = parse_args(args)
    jql = parsed['positionals'][0] if len(parsed['positionals']) > 0 else 'assignee = currentUser() AND sprint in openSprints()'
    max_results = to_int(parsed['options'].get('max-results'), 50, '--max-results')
    start_at = to_int(parsed['options'].get('start-at'), 0, '--start-at')
    fields = parsed['options'].get('fields') or DEFAULT_FIELDS
    
    data = context['client'].search_issues(
        jql=jql,
        start_at=start_at,
        max_results=max_results,
        fields=fields
    )
    
    return {
        'data': data,
        'tableRows': build_rows(data.get('issues'), context['config'].story_points_field)
    }
