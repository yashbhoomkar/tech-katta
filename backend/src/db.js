import { MongoClient } from 'mongodb';

let client = null;
let db = null;
let isConnected = false;
let reconnectTimer = null;
let shuttingDown = false;

export async function connectDB() {
  shuttingDown = false;
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
    if (client) {
      try {
        await client.close();
      } catch {}
      client = null;
    }

    client = new MongoClient(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    });

    await client.connect();
    db = client.db(dbName);
    isConnected = true;
    console.log(`✅ Connected to MongoDB database: "${dbName}"`);

    if (reconnectTimer) {
      clearInterval(reconnectTimer);
      reconnectTimer = null;
    }

    client.on('close', () => {
      isConnected = false;
      if (!shuttingDown) {
        console.warn('⚠️ MongoDB connection closed. Will retry connecting...');
        startAutoReconnect();
      }
    });

    return db;
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    isConnected = false;
    startAutoReconnect();
    return null;
  }
}

function startAutoReconnect() {
  if (reconnectTimer) return;
  reconnectTimer = setInterval(async () => {
    if (!isConnected) {
      console.log('🔄 Retrying MongoDB connection in background...');
      await connectDB();
    }
  }, 15000);
}

export function getDB() {
  return db;
}

export function isDBConnected() {
  return Boolean(db && isConnected);
}

export async function closeDB() {
  shuttingDown = true;
  if (reconnectTimer) {
    clearInterval(reconnectTimer);
    reconnectTimer = null;
  }
  if (client) {
    await client.close();
    client = null;
    db = null;
    isConnected = false;
  }
}
