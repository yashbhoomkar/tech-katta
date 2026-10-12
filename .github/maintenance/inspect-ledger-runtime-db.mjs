import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI is unavailable; no database operation was attempted.');

const databaseName = 'techkatta_history';
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
const duplicateTargets = [
  {
    collection: 'frontend_git_commits',
    id: '6acb79744d4d384f7be306f8',
    key: '56b229a2c0fa1d586f200a41c79826ed92a0446b',
    backupId: 'frontend:6acb79744d4d384f7be306f8',
    value: 'Merge PR #20: include advanced Kafka sections in the frontend local fallback so it matches backend content; also includes backend hardening.',
  },
  {
    collection: 'backend_git_commits',
    id: '6acb7969c1d086df8c89e02a',
    key: '56b229a2c0fa1d586f200a41c79826ed92a0446b',
    backupId: 'backend:6acb7969c1d086df8c89e02a',
    value: 'Merge PR #20: harden health endpoint availability, Docker bind configuration, production TLS smoke tests, article category indexing, and Vercel team scope; includes regression tests and frontend Kafka fallback consistency.',
  },
  {
    collection: 'backend_git_commits',
    id: '6acb7378c0d34c06a4bdbc98',
    key: 'e4d4f92eee0b033ccbfb5d53928684c0d797bf93',
    backupId: 'backend:6acb7378c0d34c06a4bdbc98',
    value: 'merge production browser/load verification and CodeQL checks (#14)',
  },
];
const retainedTargets = [
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

try {
  await client.connect();
  const db = client.db(databaseName);
  const backup = db.collection('commit_ledger_duplicate_backup_20261011');
  const backupCount = await backup.countDocuments({});
  const output = {
    database: databaseName,
    backupCollectionCount: backupCount,
    removedRows: [],
    retainedRows: [],
    collections: {},
  };

  for (const spec of duplicateTargets) {
    const backupRow = await backup.findOne({ _id: spec.backupId });
    const canonicalRow = await db.collection(spec.collection).findOne({ _id: new ObjectId(spec.id) });
    output.removedRows.push({
      collection: spec.collection,
      id: spec.id,
      backupExists: Boolean(backupRow),
      backupFieldsMatch: Boolean(backupRow) &&
        backupRow.sourceCollection === spec.collection &&
        backupRow.originalId === spec.id &&
        backupRow.key === spec.key &&
        backupRow.value === spec.value,
      canonicalDuplicateAbsent: !canonicalRow,
    });
  }

  for (const spec of retainedTargets) {
    const row = await db.collection(spec.collection).findOne({ _id: new ObjectId(spec.id) });
    output.retainedRows.push({
      collection: spec.collection,
      id: spec.id,
      present: Boolean(row),
      keyMatches: row?.key === spec.key,
      valueMatches: row?.value === spec.value,
    });
  }

  for (const name of ['frontend_git_commits', 'backend_git_commits']) {
    const collection = db.collection(name);
    const indexes = await collection.listIndexes().toArray();
    const keyIndex = indexes.find((item) => item.name === 'key_unique') ?? null;
    const duplicates = await collection.aggregate([
      { $group: { _id: '$key', ids: { $push: '$_id' }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ]).toArray();
    output.collections[name] = {
      count: await collection.countDocuments({}),
      keyUniqueIndex: keyIndex,
      uniqueIndexEnforced: keyIndex?.unique === true &&
        JSON.stringify(keyIndex.key) === JSON.stringify({ key: 1 }),
      duplicateGroups: duplicates.map((group) => ({
        key: group._id,
        ids: group.ids.map((id) => id instanceof ObjectId ? id.toHexString() : String(id)).sort(),
      })),
    };
  }

  const backupValid = backupCount === 6 && output.removedRows.every((row) =>
    row.backupExists && row.backupFieldsMatch && row.canonicalDuplicateAbsent
  );
  const retainedRowsValid = output.retainedRows.every((row) =>
    row.present && row.keyMatches && row.valueMatches
  );
  const indexesValid = Object.values(output.collections).every((item) =>
    item.uniqueIndexEnforced && item.duplicateGroups.length === 0
  );
  output.acceptance = {
    backupValid,
    retainedRowsValid,
    indexesValid,
    passed: backupValid && retainedRowsValid && indexesValid,
  };

  console.log('Read-only post-migration ledger verification:', JSON.stringify(output));
  if (!output.acceptance.passed) {
    throw new Error('Ledger post-migration verification failed; canonical data was not changed by this read-only workflow.');
  }
} finally {
  await client.close();
}
