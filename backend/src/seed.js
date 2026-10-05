import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import { categories, articles, articleContent } from './data.js';
import { normalizeArticleContent } from './contentSchema.js';

dotenv.config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'techkatta';

if (!uri) {
  console.error('❌ MONGODB_URI environment variable is required to seed the database.');
  process.exit(1);
}

async function seed() {
  console.log(`🌱 Connecting to MongoDB database: "${dbName}"...`);
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db(dbName);

    const categoriesCollection = db.collection('categories');
    const articlesCollection = db.collection('articles');

    // Create unique indexes
    await categoriesCollection.createIndex({ id: 1 }, { unique: true });
    await articlesCollection.createIndex({ slug: 1 }, { unique: true });

    // Seed categories
    console.log(`Seeding ${categories.length} categories...`);
    for (const cat of categories) {
      await categoriesCollection.updateOne(
        { id: cat.id },
        { $set: cat },
        { upsert: true }
      );
    }

    // Prepare articles with their full content
    console.log(`Seeding ${articles.length} articles with full content...`);
    for (const art of articles) {
      const doc = {
        ...art,
        content: normalizeArticleContent(articleContent[art.slug] || null),
        contentSchemaVersion: 2,
        updatedAt: new Date(),
      };
      await articlesCollection.updateOne(
        { slug: art.slug },
        { $set: doc },
        { upsert: true }
      );
    }

    const catCount = await categoriesCollection.countDocuments();
    const artCount = await articlesCollection.countDocuments();

    console.log(`✅ Seed successful!`);
    console.log(`   - Categories in DB: ${catCount}`);
    console.log(`   - Articles in DB: ${artCount}`);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seed();
