/* SERVER ONLY: raw quote JSON is never persisted, logged or delivered to marketing clients. */
'use strict';
const crypto=require('node:crypto');
const FIELDS=['brand','name','model','spec','category'];
const clean=v=>v==null?'':typeof v==='string'||typeof v==='number'?String(v).trim():'';
function projectProducts(input){
 if(!Array.isArray(input)||input.length>30000)throw Error('Invalid source product table');
 const rows=[],seen=new Set();let brand='',name='',category='',model='',spec='',group='';
 for(const raw of input){
  if(!raw||typeof raw!=='object'||Array.isArray(raw))continue;
  const selected={brand:clean(raw.brand),name:clean(raw.name),model:clean(raw.model),spec:clean(raw.spec),category:clean(raw.category??raw['구분'])};
  if(!Object.values(selected).some(Boolean))continue;
  if(/철거|인건|시공비|부자재/.test(selected.category))continue;
  if(selected.brand)brand=selected.brand;if(selected.name)name=selected.name;if(selected.category)category=selected.category;
  const next=[brand,name].join('\u241f');if(next!==group){group=next;model='';spec='';}
  if(selected.model)model=selected.model;if(selected.spec)spec=selected.spec;
  if(!brand||!name)continue;
  const row={brand,name,model,spec,category:category||'바닥재'};
  if(Object.values(row).some(v=>v.length>2000))throw Error('Product field length exceeds limit');
  // Monetary content accidentally placed in an allowed field is not published.
  if(Object.values(row).some(v=>/(?:\d[\d,]*\s*원(?:\s|$|[(/])|매입가|판매가|업체가|원가|부가세|VAT\s*포함)/i.test(v)))continue;
  const key=JSON.stringify(FIELDS.map(k=>row[k]));if(!seen.has(key)){seen.add(key);rows.push(row);}
 }
 if(!rows.length)throw Error('No public product rows available');
 rows.sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b),'ko'));
 return {schema:'cheonginmaru.product-feed.v1',generatedAt:new Date().toISOString(),source:'Lee-Miyoung/maru_calc',digest:crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex'),rows};
}
function assertPublic(feed){
 if(Object.keys(feed).some(k=>!['schema','generatedAt','source','digest','rows'].includes(k)))throw Error('Unexpected feed metadata');
 if(feed.schema!=='cheonginmaru.product-feed.v1'||!Array.isArray(feed.rows)||!feed.rows.length)throw Error('Invalid public feed');
 for(const r of feed.rows)if(Object.keys(r).sort().join('|')!==FIELDS.slice().sort().join('|')||FIELDS.some(k=>typeof r[k]!=='string'))throw Error('Unexpected public product field');
 return feed;
}
module.exports={FIELDS,projectProducts,assertPublic};
let syncPhase='initialization';
if(require.main===module)(async()=>{
 const fs=require('node:fs/promises'),path=require('node:path');
 // Follow the existing source application's configured endpoint without changing that app or sheet.
 syncPhase='source-app-fetch';
 const source=await fetch('https://raw.githubusercontent.com/Lee-Miyoung/maru_calc/main/index.html',{signal:AbortSignal.timeout(30000)});if(!source.ok)throw Error('Source application unavailable');syncPhase='source-app-parse';const html=await source.text(),match=html.match(/const\s+SHEET_URL\s*=\s*["'](https:\/\/script\.google\.com\/macros\/s\/[^"']+)["']/);if(!match)throw Error('Source endpoint configuration unavailable');
 syncPhase='sheet-fetch';
 const response=await fetch(match[1],{signal:AbortSignal.timeout(60000)});if(!response.ok)throw Error('Source sheet unavailable');syncPhase='sheet-json';const raw=await response.json();syncPhase='field-projection';const feed=assertPublic(projectProducts(raw));
 const target=path.resolve(process.argv[2]||'marketing/data/products.json');await fs.mkdir(path.dirname(target),{recursive:true});
 try{const prior=JSON.parse(await fs.readFile(target,'utf8'));if(prior.digest===feed.digest){console.log('Public product feed unchanged');return;}}catch{}
 await fs.writeFile(target+'.tmp',JSON.stringify(feed,null,2)+'\n');await fs.rename(target+'.tmp',target);console.log('Published allowlisted product rows: '+feed.rows.length);
})().catch(async()=>{const message='Product synchronization failed at '+syncPhase+'. Previous public feed is preserved. No source payload was logged.';console.error('::error title=Product feed synchronization::'+message);if(process.env.GITHUB_STEP_SUMMARY)await require('node:fs/promises').appendFile(process.env.GITHUB_STEP_SUMMARY,'### Product feed status\n'+message+'\n');process.exitCode=1;});
