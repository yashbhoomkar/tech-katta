import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire('/opt/tech-katta/backend/package.json');
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;
const rotationId = process.env.ROTATION_ID;
const envPath = '/opt/tech-katta/backend/.env';
const backupPath = `${envPath}.rotation-backup-${rotationId}`;
const tempPath = `${envPath}.rotation-new-${rotationId}`;

let client;
let envUpdated = false;

try {
  if (!uri || !/^mongodb(?:\+srv)?:\/\//.test(uri) || /[\r\n]/.test(uri)) {
    throw new Error('Missing or invalid rotated URI format.');
  }
  if (!rotationId || !/^\d+$/.test(rotationId)) {
    throw new Error('Missing or invalid rotation identifier.');
  }
  const original = fs.readFileSync(envPath, 'utf8');
    const uriLines = original.match(/^MONGODB_URI=.*$/gm) ?? [];
  if (uriLines.length !== 1) {
    throw new Error('Expected exactly one MONGODB_URI line in the runtime env file.');
  }

  // Validate the new credential before changing the live environment file.
  client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  const auth = await client.db('admin').command({
    connectionStatus: 1,
    showPrivileges: true,
  });
  const roles = auth.authInfo?.authenticatedUserRoles ?? [];
  const leastPrivilege =
    roles.length === 1 &&
    roles[0].roleName === 'readWrite' &&
    roles[0].databaseName === 'techkatta';
  if (!leastPrivilege) {
    throw new Error('New database user does not have exactly the required readWrite role on techkatta.');
  }
  await client.db('techkatta').command({ ping: 1 });
  await client.db('techkatta').collection('articles').findOne({}, { projection: { _id: 1 } });
  await client.close();
  client = null;

  const updated = original.replace(/^MONGODB_URI=.*$/m, `MONGODB_URI=${JSON.stringify(uri)}`);
  fs.writeFileSync(backupPath, original, { mode: 0o600, flag: 'wx' });
  fs.writeFileSync(tempPath, updated, { mode: 0o600, flag: 'wx' });
  fs.renameSync(tempPath, envPath);
  envUpdated = true;

  console.log('Rotated URI passed MongoDB preflight with exactly readWrite on techkatta; env file atomically updated.');
  console.log('Temporary rollback backup retained until post-restart health checks pass.');
} catch (error) {
  if (client) {
    try { await client.close(); } catch {}
  }
  try { fs.unlinkSync(tempPath); } catch {}
  if (!envUpdated) {
    try { fs.unlinkSync(backupPath); } catch {}
  }
  console.error('Credential rotation preflight/config update failed. Secret values suppressed. Error type:', error?.name ?? 'Error', 'code:', error?.code ?? 'none');
  process.exitCode = 1;
}
