// Prints every article's read-aloud chunks as JSON for generate.py:
//   node tools/tts/export-chunks.mjs > /tmp/chunks.json
// Articles come from the repo's content/ folder (the same files the API serves).
import{loadContent}from"../../backend/src/content/store.js";import{chunks}from"../../frontend/src/speech.js";
const{site,examples,articles}=await loadContent(new URL("../../content",import.meta.url).pathname);const example=examples[site.example];
console.log(JSON.stringify(articles.map(a=>({slug:a.slug,chunks:chunks({...a,example}).map(c=>c.text)}))));
