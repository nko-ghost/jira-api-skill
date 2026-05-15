const test = require('node:test');
const assert = require('node:assert');
const { JiraClient } = require('../scripts/lib/jira-client');

test('JiraClient Auth Header - Cloud', () => {
  const config = {
    baseUrl: 'https://myorg.atlassian.net',
    token: 'my-token',
    userEmail: 'user@example.com'
  };
  const client = new JiraClient(config);
  const header = client.getAuthHeader();
  
  const expected = `Basic ${Buffer.from('user@example.com:my-token').toString('base64')}`;
  assert.strictEqual(header, expected);
});

test('JiraClient Auth Header - Data Center', () => {
  const config = {
    baseUrl: 'https://jira.mycorp.com',
    token: 'my-pat'
  };
  const client = new JiraClient(config);
  const header = client.getAuthHeader();
  
  assert.strictEqual(header, 'Bearer my-pat');
});

test('JiraClient Search Endpoint - Cloud', () => {
  const config = {
    baseUrl: 'https://myorg.atlassian.net'
  };
  const client = new JiraClient(config);
  const endpoint = client.getSearchEndpoint();
  
  assert.strictEqual(endpoint, 'https://myorg.atlassian.net/rest/api/3/search/jql');
});

test('JiraClient Search Endpoint - Data Center', () => {
  const config = {
    baseUrl: 'https://jira.mycorp.com'
  };
  const client = new JiraClient(config);
  const endpoint = client.getSearchEndpoint();
  
  assert.strictEqual(endpoint, '/search');
});
