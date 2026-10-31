// Prints every article's read-aloud chunks as JSON for generate.py:
//   node tools/tts/export-chunks.mjs > /tmp/chunks.json
import{articles}from"../../frontend/src/articles.js";import{chunks}from"../../frontend/src/speech.js";
console.log(JSON.stringify(articles.map(a=>({slug:a.slug,chunks:chunks(a).map(c=>c.text)}))));
