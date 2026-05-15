import gzip
import json
import base64
import urllib.request
import urllib.parse
from .errors import AppError, classify_http_error
from .constants import ERROR_CODES


def _decode_response_body(raw_bytes):
    if not raw_bytes:
        return ''
    if len(raw_bytes) >= 2 and raw_bytes[0] == 0x1F and raw_bytes[1] == 0x8B:
        try:
            return gzip.decompress(raw_bytes).decode('utf-8')
        except OSError:
            pass
    return raw_bytes.decode('utf-8', errors='replace')


def normalize_body_snippet(body_text):
    if not body_text:
        return ''
    return body_text[:1500]

class JiraClient:
    def __init__(self, config):
        self.config = config

    def get_auth_header(self):
        is_cloud = '.atlassian.net' in self.config.base_url or '.jira.com' in self.config.base_url
        if is_cloud:
            auth_str = f"{self.config.user_email}:{self.config.token}"
            encoded = base64.b64encode(auth_str.encode('utf-8')).decode('utf-8')
            return f"Basic {encoded}"
        return f"Bearer {self.config.token}"

    def build_url(self, endpoint, query=None):
        base = endpoint if endpoint.startswith('http') else f"{self.config.api_base}{endpoint}"
        
        if query:
            filtered_query = {k: str(v) for k, v in query.items() if v not in (None, '', [])}
            if filtered_query:
                params = urllib.parse.urlencode(filtered_query)
                base = f"{base}?{params}"
        
        return base

    def request(self, endpoint, method='GET', body=None, query=None, headers=None):
        url = self.build_url(endpoint, query)
        
        request_headers = {
            'Accept': 'application/json',
            # Evita gzip en errores/cuerpos que urllib no descomprime automáticamente
            'Accept-Encoding': 'identity',
            'Authorization': self.get_auth_header(),
            'User-Agent': 'Mozilla/5.0'
        }
        if headers:
            request_headers.update(headers)

        data = None
        if body is not None:
            if isinstance(body, (dict, list)):
                data = json.dumps(body).encode('utf-8')
                if 'Content-Type' not in request_headers:
                    request_headers['Content-Type'] = 'application/json'
            elif isinstance(body, str):
                data = body.encode('utf-8')
                if 'Content-Type' not in request_headers:
                    request_headers['Content-Type'] = 'application/json'
            elif isinstance(body, bytes):
                data = body
                # For multipart/form-data, Content-Type must be set outside if needed, 
                # or handled via boundary.
            
        req = urllib.request.Request(url, data=data, headers=request_headers, method=method)
        
        try:
            with urllib.request.urlopen(req) as response:
                status = response.getcode()
                body_bytes = response.read()
                body_text = _decode_response_body(body_bytes)
                
                body_data = {}
                if body_text.strip():
                    try:
                        body_data = json.loads(body_text)
                    except json.JSONDecodeError:
                        body_data = {'raw': body_text}
                
                return body_data
        except urllib.error.HTTPError as e:
            status = e.code
            body_text = _decode_response_body(e.read())
            code = classify_http_error(status)
            raise AppError(
                code,
                f"Jira API request failed ({status})",
                status=status,
                details={
                    'method': method,
                    'url': url,
                    'body': normalize_body_snippet(body_text)
                }
            )
        except Exception as e:
            raise AppError(ERROR_CODES.UNKNOWN, str(e), details={'endpoint': endpoint, 'method': method})

    def get_search_endpoint(self):
        is_cloud = '.atlassian.net' in self.config.base_url or '.jira.com' in self.config.base_url
        if is_cloud:
            return f"{self.config.base_url}/rest/api/3/search/jql"
        return '/search'

    def search_issues(self, jql, start_at=None, max_results=None, fields=None):
        endpoint = self.get_search_endpoint()
        return self.request(endpoint, query={
            'jql': jql,
            'startAt': start_at,
            'maxResults': max_results,
            'fields': fields
        })

    def get_issue(self, key, fields=None, expand=None):
        return self.request(f"/issue/{urllib.parse.quote(key)}", query={
            'fields': fields,
            'expand': expand
        })

    def create_issue(self, fields):
        return self.request('/issue', method='POST', body={'fields': fields})

    def update_issue(self, key, fields):
        return self.request(f"/issue/{urllib.parse.quote(key)}", method='PUT', body={'fields': fields})

    def get_transitions(self, key):
        return self.request(f"/issue/{urllib.parse.quote(key)}/transitions")

    def transition_issue(self, key, transition_id):
        return self.request(f"/issue/{urllib.parse.quote(key)}/transitions", method='POST', body={
            'transition': {'id': str(transition_id)}
        })

    def list_comments(self, key, start_at=None, max_results=None):
        return self.request(f"/issue/{urllib.parse.quote(key)}/comment", query={
            'startAt': start_at,
            'maxResults': max_results
        })

    def add_comment(self, key, body):
        return self.request(f"/issue/{urllib.parse.quote(key)}/comment", method='POST', body={'body': body})

    def list_attachments(self, key):
        return self.get_issue(key, fields='attachment')

    def add_attachment(self, key, body, content_type):
        return self.request(f"/issue/{urllib.parse.quote(key)}/attachments", method='POST', body=body, headers={
            'X-Atlassian-Token': 'no-check',
            'Content-Type': content_type
        })

    def get_fields(self):
        return self.request('/field')

    def get_create_meta(self, project_key):
        return self.request('/issue/createmeta', query={
            'projectKeys': project_key,
            'expand': 'projects.issuetypes.fields'
        })

    def get_edit_meta(self, key):
        return self.request(f"/issue/{urllib.parse.quote(key)}/editmeta")
