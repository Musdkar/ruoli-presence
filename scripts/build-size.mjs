import { readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { resolve } from "node:path";

const dist=resolve("dist");
const html=readFileSync(resolve(dist,"index.html"),"utf8");
const refs=[...html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css))["']/g)]
  .map((match)=>match[1])
  .filter((ref)=>!/^https?:\/\//.test(ref));

const rows=refs.map((ref)=>{
  const rel=ref.replace(/^\//,"");
  const file=resolve(dist,rel);
  const raw=statSync(file).size;
  const gzip=gzipSync(readFileSync(file)).length;
  return{ref,raw,gzip,type:ref.endsWith(".js")?"js":"css"};
});

const sum=(type,key)=>rows.filter((row)=>row.type===type).reduce((n,row)=>n+row[key],0);
const kb=(bytes)=>(bytes/1024).toFixed(1);

console.log("\nInitial-load asset report");
for(const row of rows)console.log(`  ${row.ref}: ${kb(row.raw)} kB raw / ${kb(row.gzip)} kB gzip`);
console.log(`  initial JS:  ${kb(sum("js","raw"))} kB raw / ${kb(sum("js","gzip"))} kB gzip`);
console.log(`  initial CSS: ${kb(sum("css","raw"))} kB raw / ${kb(sum("css","gzip"))} kB gzip`);

if(sum("js","gzip")>200*1024)console.warn("  warning: initial JS exceeds the 200 kB gzip target");
if(sum("css","gzip")>20*1024)console.warn("  warning: initial CSS exceeds the 20 kB gzip target");
