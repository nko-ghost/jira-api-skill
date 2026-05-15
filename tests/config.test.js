const test = require('node:test');
const assert = require('node:assert');
const { validateConfig } = require('../scripts/lib/config');

test('validateConfig - Missing Token', () => {
  const config = { baseUrl: 'https://jira.com' };
  assert.throws(() => validateConfig(config), {
    name: 'AppError',
    code: 'auth'
  });
});

test('validateConfig - Missing Base URL', () => {
  const config = { token: 'abc' };
  assert.throws(() => validateConfig(config), {
    name: 'AppError',
    code: 'validation'
  });
});

test('validateConfig - Cloud missing Email', () => {
  const config = {
    token: 'abc',
    baseUrl: 'https://myorg.atlassian.net'
  };
  assert.throws(() => validateConfig(config), {
    name: 'AppError',
    message: /ERROR_CONFIG: Jira Cloud requiere JIRA_USER_EMAIL/
  });
});

test('validateConfig - Valid DC', () => {
  const config = {
    token: 'abc',
    baseUrl: 'https://jira.mycorp.com'
  };
  const result = validateConfig(config);
  assert.strictEqual(result.token, 'abc');
  assert.strictEqual(result.baseUrl, 'https://jira.mycorp.com');
});

test('validateConfig - Valid Cloud', () => {
  const config = {
    token: 'abc',
    baseUrl: 'https://myorg.atlassian.net',
    userEmail: 'user@example.com'
  };
  const result = validateConfig(config);
  assert.strictEqual(result.userEmail, 'user@example.com');
});
