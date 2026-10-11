import assert from 'node:assert/strict';
import test from 'node:test';
import { readPrimaryOrFallback } from '../src/contentSource.js';

test('uses local fallback only when the database is disconnected', async () => {
  let databaseRead = false;
  const fallback = [{ id: 'fallback' }];

  const result = await readPrimaryOrFallback({
    databaseConnected: false,
    readDatabase: async () => {
      databaseRead = true;
      return [{ id: 'database' }];
    },
    readFallback: () => fallback,
  });

  assert.equal(databaseRead, false);
  assert.deepEqual(result, fallback);
});

test('preserves an empty result from a connected database', async () => {
  let fallbackRead = false;

  const result = await readPrimaryOrFallback({
    databaseConnected: true,
    readDatabase: async () => [],
    readFallback: () => {
      fallbackRead = true;
      return [{ id: 'stale-fallback' }];
    },
  });

  assert.deepEqual(result, []);
  assert.equal(fallbackRead, false);
});

test('propagates database query errors rather than masking them with fallback content', async () => {
  let fallbackRead = false;
  const databaseError = new Error('database query failed');

  await assert.rejects(
    readPrimaryOrFallback({
      databaseConnected: true,
      readDatabase: async () => { throw databaseError; },
      readFallback: () => {
        fallbackRead = true;
        return [{ id: 'stale-fallback' }];
      },
    }),
    databaseError,
  );

  assert.equal(fallbackRead, false);
});

test('preserves a missing-record result from a connected database', async () => {
  let fallbackRead = false;

  const result = await readPrimaryOrFallback({
    databaseConnected: true,
    readDatabase: async () => null,
    readFallback: () => {
      fallbackRead = true;
      return { id: 'stale-fallback' };
    },
  });

  assert.equal(result, null);
  assert.equal(fallbackRead, false);
});
