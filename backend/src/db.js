import { MongoClient } from 'mongodb';

let client = null;
let db = null;
let isConnected = false;

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || 'techkatta';

  if (!uri) {
    console.warn('⚠️ MONGODB_URI not provided. Falling back to local data store.');
    return null;
  }

  if (db && isConnected) {
    return db;
  }

  try {
    client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });

    await client.connect();
    db = client.db(dbName);
    isConnected = true;
    console.log(`✅ Connected to MongoDB database: "${dbName}"`);
    return db;
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    isConnected = false;
    return null;
  }
}

export function getDB() {
  return db;
}

export function isDBConnected() {
  return Boolean(db && isConnected);
}

export async function closeDB() {
  if (client) {
    await client.close();
    client = null;
    db = null;
    isConnected = false;
  }
}
