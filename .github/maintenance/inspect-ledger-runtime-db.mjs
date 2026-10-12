import 'dotenv/config';
import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('MONGODB_URI is unavailable; no database operation was attempted.');

const databaseName = 'techkatta_history';
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
const targets = [
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

try {
  await client.connect();
  const db = client.db(databaseName);
  const backup = db.collection('commit_ledger_duplicate_backup_20261011');
  const backupCount = await backup.countDocuments({});
  const output = {
    database: databaseName,
    backupCollectionCount: backupCount,
    targetRows: [],
    collections: {},
  };

  for (const spec of targets) {
    const backupRow = await backup.findOne({ _id: spec.backupId });
    const canonicalRow = await db.collection(spec.collection).findOne({ _id: new ObjectId(spec.id) });
    output.targetRows.push({
      collection: spec.collection,
      id: spec.id,
      backupId: spec.backupId,
      backupExists: Boolean(backupRow),
      backupSourceMatches: backupRow?.sourceCollection === spec.collection,
      backupOriginalIdMatches: backupRow?.originalId === spec.id,
      backupKeyMatches: backupRow?.key === spec.key,
      backupValueMatches: backupRow?.value === spec.value,
      canonicalRowExists: Boolean(canonicalRow),
      canonicalKeyMatches: canonicalRow?.key === spec.key,
      canonicalValueMatches: canonicalRow?.value === spec.value,
      backupValueLength: typeof backupRow?.value === 'string' ? backupRow.value.length : null,
      expectedValueLength: spec.value.length,
    });
  }

  for (const name of ['frontend_git_commits', 'backend_git_commits']) {
    const collection = db.collection(name);
    const indexes = await collection.listIndexes().toArray();
    const duplicates = await collection.aggregate([
      { $group: { _id: '$key', ids: { $push: '$_id' }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ]).toArray();
    output.collections[name] = {
      count: await collection.countDocuments({}),
      keyUniqueIndex: indexes.find((item) => item.name === 'key_unique') ?? null,
      duplicateGroups: duplicates.map((group) => ({
        key: group._id,
        ids: group.ids.map((id) => id instanceof ObjectId ? id.toHexString() : String(id)).sort(),
      })),
    };
  }

  console.log('Read-only ledger database inspection:', JSON.stringify(output));
} finally {
  await client.close();
}
