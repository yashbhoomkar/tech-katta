// Prints every article's read-aloud chunks as JSON for generate.py:
//   node tools/tts/export-chunks.mjs > /tmp/chunks.json
// Articles come from the backend content (the same data the API serves).
import{allArticles}from"../../backend/src/content/index.js";import{example}from"../../backend/src/content/example.js";import{chunks}from"../../frontend/src/speech.js";
console.log(JSON.stringify(allArticles.map(a=>({slug:a.slug,chunks:chunks({...a,example}).map(c=>c.text)}))));
