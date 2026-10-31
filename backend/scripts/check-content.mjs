// Validates a content directory: node scripts/check-content.mjs <dir>. Exits 1 with the problems if
// it is invalid. The deploy runs this on each new release before the API is switched to it.
import { loadContent } from '../src/content/store.js';
const dir = process.argv[2];
if (!dir) { console.error('usage: node scripts/check-content.mjs <content-dir>'); process.exit(2); }
try {
  const { articles, release } = await loadContent(dir);
  console.log(`content OK: ${release} (${articles.length} article${articles.length === 1 ? '' : 's'})`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
