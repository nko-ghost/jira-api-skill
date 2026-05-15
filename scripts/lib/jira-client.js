const { AppError, classifyHttpError } = require('./errors');
const { ERROR_CODES } = require('./constants');

function isFormData(value) {
  return typeof FormData !== 'undefined' && value instanceof FormData;
}

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function normalizeBodySnippet(bodyText) {
  if (!bodyText) {
    return '';
  }
  return bodyText.slice(0, 1500);
}

class JiraClient {
  constructor(config, fetchImpl) {
    this.config = config;
    this.fetchImpl = fetchImpl || fetch;
  }

  getAuthHeader() {
    const isCloud = this.config.baseUrl.includes('.atlassian.net') || this.config.baseUrl.includes('.jira.com');
    if (isCloud) {
      const encoded = Buffer.from(`${this.config.userEmail}:${this.config.token}`, 'utf8').toString('base64');
      return `Basic ${encoded}`;
    }
    return `Bearer ${this.config.token}`;
  }

  buildUrl(endpoint, query) {
    const base = endpoint.startsWith('http') ? endpoint : `${this.config.apiBase}${endpoint}`;
    const url = new URL(base);
    if (query && typeof query === 'object') {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null || value === '') {
          continue;
        }
        url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }

  async request(endpoint, options = {}) {
    const method = options.method || 'GET';
    const headers = {
      Accept: 'application/json',
      // Avoid gzip bodies that fetch may not transparently decode on some Jira DC setups
      'Accept-Encoding': 'identity',
      Authorization: this.getAuthHeader(),
      'User-Agent': 'Mozilla/5.0',
      ...(options.headers || {})
    };

    let body = options.body;
    if (body !== undefined && body !== null) {
      if (isPlainObject(body)) {
        body = JSON.stringify(body);
        if (!headers['Content-Type']) {
          headers['Content-Type'] = 'application/json';
        }
      } else if (typeof body === 'string') {
        if (!headers['Content-Type']) {
          headers['Content-Type'] = 'application/json';
        }
      } else if (isFormData(body)) {
        delete headers['Content-Type'];
      }
    }

    const requestInit = {
      method,
      headers,
      body
    };
    if (method === 'GET' || method === 'HEAD') {
      delete requestInit.body;
    }

    const url = this.buildUrl(endpoint, options.query);

    let response;
    try {
      response = await this.fetchImpl(url, requestInit);
    } catch (error) {
      throw new AppError(ERROR_CODES.UNKNOWN, error.message || 'Network error', {
        details: { endpoint, method }
      });
    }

    const bodyText = await response.text();
    const hasBody = bodyText.trim().length > 0;
    let bodyData = {};
    if (hasBody) {
      try {
        bodyData = JSON.parse(bodyText);
      } catch (_) {
        bodyData = { raw: bodyText };
      }
    }

    if (response.ok) {
      return bodyData;
    }

    const code = classifyHttpError(response.status);
    throw new AppError(
      code,
      `Jira API request failed (${response.status})`,
      {
        status: response.status,
        details: {
          method,
          url,
          body: normalizeBodySnippet(bodyText)
        }
      }
    );
  }

  getSearchEndpoint() {
    // Jira Cloud (v3) removed /search in favor of /search/jql (Error 410 Gone).
    // Datacenter/Server (v2) still uses /search.
    const isCloud = this.config.baseUrl.includes('.atlassian.net') || this.config.baseUrl.includes('.jira.com');
    if (isCloud) {
      // For Cloud, we force v3 search endpoint regardless of config.apiBase
      return `${this.config.baseUrl}/rest/api/3/search/jql`;
    }
    return '/search';
  }

  searchIssues({ jql, startAt, maxResults, fields }) {
    const endpoint = this.getSearchEndpoint();
    return this.request(endpoint, {
      query: {
        jql,
        startAt,
        maxResults,
        fields
      }
    });
  }

  getIssue(key, options = {}) {
    return this.request(`/issue/${encodeURIComponent(key)}`, {
      query: {
        fields: options.fields,
        expand: options.expand
      }
    });
  }

  createIssue(fields) {
    return this.request('/issue', {
      method: 'POST',
      body: { fields }
    });
  }

  updateIssue(key, fields) {
    return this.request(`/issue/${encodeURIComponent(key)}`, {
      method: 'PUT',
      body: { fields }
    });
  }

  getTransitions(key) {
    return this.request(`/issue/${encodeURIComponent(key)}/transitions`);
  }

  transitionIssue(key, transitionId) {
    return this.request(`/issue/${encodeURIComponent(key)}/transitions`, {
      method: 'POST',
      body: {
        transition: { id: String(transitionId) }
      }
    });
  }

  listComments(key, startAt, maxResults) {
    return this.request(`/issue/${encodeURIComponent(key)}/comment`, {
      query: { startAt, maxResults }
    });
  }

  addComment(key, body) {
    return this.request(`/issue/${encodeURIComponent(key)}/comment`, {
      method: 'POST',
      body: { body }
    });
  }

  listAttachments(key) {
    return this.getIssue(key, { fields: 'attachment' });
  }

  addAttachment(key, formData) {
    return this.request(`/issue/${encodeURIComponent(key)}/attachments`, {
      method: 'POST',
      body: formData,
      headers: {
        'X-Atlassian-Token': 'no-check'
      }
    });
  }

  getFields() {
    return this.request('/field');
  }

  getCreateMeta(projectKey) {
    return this.request('/issue/createmeta', {
      query: {
        projectKeys: projectKey,
        expand: 'projects.issuetypes.fields'
      }
    });
  }

  getEditMeta(key) {
    return this.request(`/issue/${encodeURIComponent(key)}/editmeta`);
  }
}

module.exports = {
  JiraClient
};
