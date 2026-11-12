// The look stays in one place: colours only in theme/tokens.css (and their copy in palette.js), every var(--…) a
// stylesheet reads is defined, and the two token lists agree.
import test from"node:test";import assert from"node:assert/strict";import{readFileSync,readdirSync,statSync}from"node:fs";import{join,relative}from"node:path";
import{TOKENS}from"./palette.js";
const SRC=new URL("..",import.meta.url).pathname,THEME=join(SRC,"theme");
const walk=d=>readdirSync(d).flatMap(n=>{const p=join(d,n);return statSync(p).isDirectory()?walk(p):[p]});
const files=walk(SRC).filter(p=>!p.startsWith(THEME));
const tokensCss=readFileSync(join(THEME,"tokens.css"),"utf8").replace(/\/\*[\s\S]*?\*\//g,"");
const block=sel=>{const i=tokensCss.indexOf(sel+"{");return i<0?"":tokensCss.slice(i,tokensCss.indexOf("}",i))};
const defs=css=>Object.fromEntries([...css.matchAll(/--([a-z0-9-]+):([^;]+);/g)].map(m=>[m[1],m[2].trim()]));
// Colour codes, rgb()/hsl() with numbers, and colour keywords used as a value (color:white).
const COLOUR=/#[0-9a-fA-F]{3,8}\b|rgba?\(\s*\d|hsla?\(\s*\d|:\s*(white|black|red|blue|green|gr[ae]y|orange|yellow|silver|navy)\b/;
test("every colour token in tokens.css has the same light value in palette.js, and back",()=>{
  const css=defs(block(":root"));
  for(const[k,v]of Object.entries(TOKENS))assert.equal(css[k],v,`--${k}`);
  for(const k of Object.keys(css))if(/^#/.test(css[k]))assert.ok(k in TOKENS,`--${k} is missing from palette.js TOKENS`);
});
test("dark theme, if present, defines only names the light theme has",()=>{
  const light=defs(block(":root")),dark=defs(block(":root[data-theme=dark]"));
  for(const k of Object.keys(dark))assert.ok(k in light,`--${k} only in dark`);
  for(const k of Object.keys(TOKENS))if(Object.keys(dark).length)assert.ok(k in dark,`dark theme lacks --${k}`);
});
test("stylesheets outside theme/ use tokens, not colour codes",()=>{
  for(const f of files.filter(p=>p.endsWith(".css"))){
    const css=readFileSync(f,"utf8").replace(/\/\*[\s\S]*?\*\//g,"");
    const bad=css.split(/[{};]/).filter(d=>COLOUR.test(d));
    assert.deepEqual(bad,[],relative(SRC,f));
  }
});
test("code outside theme/ uses palette.js, not colour codes",()=>{
  for(const f of files.filter(p=>/\.jsx?$/.test(p)&&!p.endsWith(".test.js"))){
    const src=readFileSync(f,"utf8").replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g,"");
    const bad=src.match(/["'`]#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?["'`;]|rgba?\(\s*\d/g)||[];
    assert.deepEqual(bad,[],relative(SRC,f));
  }
});
test("every var(--name) a stylesheet reads is defined",()=>{
  const known=new Set(Object.keys(defs(tokensCss)));
  for(const f of walk(SRC).filter(p=>p.endsWith(".css")))for(const m of readFileSync(f,"utf8").matchAll(/--([a-z0-9-]+):/g))known.add(m[1]);
  // A var with a fallback (var(--qw,460px)) is set by the page's code at run time; those are fine.
  for(const f of walk(SRC).filter(p=>p.endsWith(".css")))for(const m of readFileSync(f,"utf8").matchAll(/var\(--([a-z0-9-]+)\)/g))
    assert.ok(known.has(m[1]),`${relative(SRC,f)} reads --${m[1]}, which nothing defines`);
});
