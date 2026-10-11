import assert from 'node:assert/strict';
import test from 'node:test';
import { loadConfig } from '../src/config.js';

test('uses safe development defaults when optional values are absent', () => {
  const config = loadConfig({});

  assert.equal(config.port, 5000);
  assert.equal(config.nodeEnv, 'development');
  assert.equal(config.frontendOrigin, 'http://localhost:5173');
  assert.equal(Object.isFrozen(config), true);
});

test('parses an explicit valid port and production frontend origin', () => {
  const config = loadConfig({
    NODE_ENV: 'production',
    PORT: '8080',
    FRONTEND_ORIGIN: 'https://tech.katta.cc',
  });

  assert.equal(config.port, 8080);
  assert.equal(config.isProduction, true);
  assert.equal(config.frontendOrigin, 'https://tech.katta.cc');
});

test('fails fast when production frontend origin is missing', () => {
  assert.throws(
    () => loadConfig({ NODE_ENV: 'production' }),
    /FRONTEND_ORIGIN must be configured in production/,
  );
});

test('rejects invalid ports', () => {
  for (const PORT of ['0', '-1', '65536', 'abc', '1.5']) {
    assert.throws(() => loadConfig({ PORT }), /PORT must be an integer/);
  }
});

test('rejects frontend URLs that contain a path or non-HTTP protocol', () => {
  assert.throws(
    () => loadConfig({ FRONTEND_ORIGIN: 'https://tech.katta.cc/some/path' }),
    /must contain only an HTTP\(S\) origin/,
  );
  assert.throws(
    () => loadConfig({ FRONTEND_ORIGIN: 'file:///tmp/site' }),
    /must contain only an HTTP\(S\) origin/,
  );
});
