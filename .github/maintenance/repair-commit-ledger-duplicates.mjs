import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI is unavailable; no database operation was attempted.');

const databaseName = 'techkatta_history';
const backupName = 'commit_ledger_duplicate_backup_20261011';
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
const collectionNames = ['frontend_git_commits', 'backend_git_commits'];

// Exact rows identified during the audit. The canonical rows below are retained;
// these three backed-up rows are the only records this migration may delete.
const duplicateSpecs = [
  {
    collection: 'frontend_git_commits',
    id: '6acb79744d4d384f7be306f8',
    key: '56b229a2c0fa1d586f200a41c79826ed92a0446b',
    value: 'Merge PR #20: include advanced Kafka sections in the frontend local fallback so it matches backend content; also includes backend hardening.',
  },
  {
    collection: 'backend_git_commits',
    id: '6acb7969c1d086df8c89e02a',
    key: '56b229a2c0fa1d586f200a41c79826ed92a0446b',
    value: 'Merge PR #20: harden health endpoint availability, Docker bind configuration, production TLS smoke tests, article category indexing, and Vercel team scope; includes regression tests and frontend Kafka fallback consistency.',
  },
  {
    collection: 'backend_git_commits',
    id: '6acb7378c0d34c06a4bdbc98',
    key: 'e4d4f92eee0b033ccbfb5d53928684c0d797bf93',
    value: 'merge production browser/load verification and CodeQL checks (#14)',
  },
];
const retainedSpecs = [
  {
    collection: 'frontend_git_commits',
    id: '6acb780fc0d34c06a4bdbc9c',
    key: '56b229a2c0fa1d586f200a41c79826ed92a0446b',
    value: 'Merge PR #20 frontend changes: include advanced Kafka sections in the local fallback article.',
  },
  {
    collection: 'backend_git_commits',
    id: '6acb7805c1d086df8c89e029',
    key: '56b229a2c0fa1d586f200a41c79826ed92a0446b',
    value: 'Merge PR #20: harden health endpoints, Docker bind configuration, TLS verification, category indexing, Vercel scope, and Kafka fallback content.',
  },
  {
    collection: 'backend_git_commits',
    id: '6acb734cc0d34c06a4bdbc97',
    key: 'e4d4f92eee0b033ccbfb5d53928684c0d797bf93',
    value: 'Merge pull request #14: add production browser verification, bounded GET load probe, and free CodeQL analysis',
  },
];
const allSpecs = [...duplicateSpecs, ...retainedSpecs];
const deletedRows = [];
let mutationStarted = false;

function idString(id) {
  return id instanceof ObjectId ? id.toHexString() : String(id);
}

function expectedDuplicateGroups(collectionName) {
  const specs = allSpecs.filter((item) => item.collection === collectionName);
  const groups = new Map();
  for (const item of specs) {
    if (!groups.has(item.key)) groups.set(item.key, []);
    groups.get(item.key).push(item.id);
  }
  return [...groups.entries()]
    .filter(([, ids]) => ids.length > 1)
    .map(([key, ids]) => ({ key, ids: ids.sort() }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

async function getDuplicateGroups(collection) {
  const groups = await collection.aggregate([
    { $group: { _id: '$key', ids: { $push: '$_id' }, count: { $sum: 1 } } },
    { $match: { count: { $gt: 1 } } },
  ]).toArray();
  return groups.map((group) => ({
    key: group._id,
    ids: group.ids.map(idString).sort(),
  })).sort((a, b) => a.key.localeCompare(b.key));
}

function sameJson(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function assertKeyIndex(indexes, { unique }) {
  const index = indexes.find((item) => item.name === 'key_unique');
  if (!index || !sameJson(index.key, { key: 1 }) || Boolean(index.unique) !== unique) {
    throw new Error('Unexpected key_unique index metadata; aborting without mutation.');
  }
}

try {
  await client.connect();
  const db = client.db(databaseName);
  const backup = db.collection(backupName);
  const backupRows = await backup.find({}).toArray();
  if (backupRows.length !== 6) {
    throw new Error('Expected exactly six backed-up duplicate rows; found ' + backupRows.length + '.');
  }

  for (const spec of allSpecs) {
    const backupId = spec.collection + ':' + spec.id;
    const row = await backup.findOne({ _id: backupId });
    if (!row || row.sourceCollection !== spec.collection || row.originalId !== spec.id ||
        row.key !== spec.key || row.value !== spec.value) {
      throw new Error('Backup validation failed for ' + backupId + '; aborting without mutation.');
    }
  }

  const collections = Object.fromEntries(collectionNames.map((name) => [name, db.collection(name)]));
  const beforeCounts = {};
  const beforeKeys = {};
  const beforeIndexes = {};
  const duplicateState = {};

  for (const name of collectionNames) {
    const collection = collections[name];
    beforeCounts[name] = await collection.countDocuments({});
    beforeKeys[name] = (await collection.find({}, { projection: { _id: 0, key: 1 } }).toArray())
      .map((item) => item.key);
    beforeIndexes[name] = await collection.listIndexes().toArray();
    duplicateState[name] = await getDuplicateGroups(collection);
  }

  const alreadyClean = collectionNames.every((name) =>
    duplicateState[name].length === 0 &&
    beforeIndexes[name].some((item) => item.name === 'key_unique' && item.unique === true &&
      sameJson(item.key, { key: 1 }))
  );
  if (alreadyClean) {
    console.log('Ledger repair already completed: both unique indexes are enforced and no duplicate keys remain.');
  } else {
    for (const name of collectionNames) {
      const expected = expectedDuplicateGroups(name);
      if (!sameJson(duplicateState[name], expected)) {
        throw new Error('Duplicate SHA groups differ from the reviewed exact-ID set in ' + name + '; aborting without mutation.');
      }
      assertKeyIndex(beforeIndexes[name], { unique: false });
    }

    for (const spec of retainedSpecs) {
      const row = await collections[spec.collection].findOne({ _id: new ObjectId(spec.id) });
      if (!row || row.key !== spec.key || row.value !== spec.value) {
        throw new Error('Expected canonical row is missing or changed: ' + spec.collection + '/' + spec.id);
      }
    }
    for (const spec of duplicateSpecs) {
      const row = await collections[spec.collection].findOne({ _id: new ObjectId(spec.id) });
      if (!row || row.key !== spec.key || row.value !== spec.value) {
        throw new Error('Expected duplicate row is missing or changed: ' + spec.collection + '/' + spec.id);
      }
    }

    mutationStarted = true;
    for (const spec of duplicateSpecs) {
      const collection = collections[spec.collection];
      const row = await collection.findOne({ _id: new ObjectId(spec.id) });
      if (!row || row.key !== spec.key || row.value !== spec.value) {
        throw new Error('Exact-ID row changed immediately before delete; aborting.');
      }
      const result = await collection.deleteOne({
        _id: new ObjectId(spec.id),
        key: spec.key,
        value: spec.value,
      });
      if (result.deletedCount !== 1) {
        throw new Error('Expected one deletion for ' + spec.collection + '/' + spec.id + ', got ' + result.deletedCount);
      }
      deletedRows.push({ collection: spec.collection, document: row });
      console.log('Removed backed-up duplicate row:', spec.collection, spec.id);
    }

    for (const name of collectionNames) {
      if ((await getDuplicateGroups(collections[name])).length !== 0) {
        throw new Error('Unexpected duplicate keys remain in ' + name + ' after targeted deletions.');
      }
    }

    // Replace the old non-unique index only after the duplicate rows are gone.
    for (const name of collectionNames) await collections[name].dropIndex('key_unique');
    for (const name of collectionNames) {
      await collections[name].createIndex({ key: 1 }, { name: 'key_unique', unique: true });
    }

    for (const name of collectionNames) {
      const indexes = await collections[name].listIndexes().toArray();
      assertKeyIndex(indexes, { unique: true });
      if ((await getDuplicateGroups(collections[name])).length !== 0) {
        throw new Error('Duplicate keys detected after unique-index creation in ' + name);
      }
      const expectedCount = beforeCounts[name] -
        duplicateSpecs.filter((spec) => spec.collection === name).length;
      const actualCount = await collections[name].countDocuments({});
      if (actualCount !== expectedCount) {
        throw new Error('Unexpected document count in ' + name + ': expected ' + expectedCount + ', got ' + actualCount);
      }
    }

    const unionBefore = new Set([...beforeKeys.frontend_git_commits, ...beforeKeys.backend_git_commits]);
    const unionAfter = new Set();
    for (const name of collectionNames) {
      const keys = await collections[name].find({}, { projection: { _id: 0, key: 1 } }).toArray();
      for (const item of keys) unionAfter.add(item.key);
    }
    const missingKeys = [...unionBefore].filter((key) => !unionAfter.has(key));
    if (missingKeys.length) {
      throw new Error('SHA reconciliation failed; keys no longer present in either ledger: ' + missingKeys.join(', '));
    }
    console.log('Migration verified: duplicate rows removed, SHA union preserved, unique indexes enforced.');
  }
} catch (error) {
  if (mutationStarted) {
    console.error('Migration failed after mutation began; attempting rollback from the verified backup.');
    let rollbackFailed = false;
    const db = client.db(databaseName);
    for (const name of collectionNames) {
      try {
        const collection = db.collection(name);
        const indexes = await collection.listIndexes().toArray();
        const index = indexes.find((item) => item.name === 'key_unique');
        if (index?.unique === true) await collection.dropIndex('key_unique');
        const afterDrop = await collection.listIndexes().toArray();
        if (!afterDrop.some((item) => item.name === 'key_unique')) {
          await collection.createIndex({ key: 1 }, { name: 'key_unique' });
        }
      } catch (rollbackError) {
        rollbackFailed = true;
        console.error('Rollback index restoration failed for ' + name + '; MongoDB code:', rollbackError?.code ?? 'unknown');
      }
    }
    for (const entry of deletedRows) {
      try {
        await db.collection(entry.collection).insertOne(entry.document);
      } catch (rollbackError) {
        rollbackFailed = true;
        console.error('Rollback row restoration failed for ' + entry.collection + '/' + idString(entry.document._id) + '; MongoDB code:', rollbackError?.code ?? 'unknown');
      }
    }
    if (rollbackFailed) {
      console.error('CRITICAL: automatic rollback was incomplete; use the verified duplicate backup and inspect both collections before further writes.');
    } else {
      console.log('Rollback completed: deleted rows restored and non-unique key indexes retained.');
    }
  }
  console.error('Ledger repair failed:', error?.message ?? 'unknown error');
  process.exitCode = 1;
} finally {
  await client.close();
}
