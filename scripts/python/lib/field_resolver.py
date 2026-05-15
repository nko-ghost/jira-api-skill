from .errors import AppError
from .constants import ERROR_CODES

class FieldResolver:
    def __init__(self, client, config):
        self.client = client
        self.config = config
        self.cache = {
            'fields': None
        }

    @property
    def story_points_field(self):
        return self.config.story_points_field

    def get_fields(self):
        if self.cache['fields'] is None:
            self.cache['fields'] = self.client.get_fields()
        return self.cache['fields']

    def resolve_epic_link_field(self):
        if self.config.epic_link_field:
            return self.config.epic_link_field

        fields = self.get_fields()
        match = None
        for field in fields:
            name = str(field.get('name') or '').strip().lower()
            if name in ('epic link', 'epic'):
                match = field
                break

        if not match or not match.get('id'):
            raise AppError(
                ERROR_CODES.VALIDATION,
                'Epic Link field could not be resolved. Set JIRA_EPIC_LINK_FIELD in .env.'
            )

        return match['id']
