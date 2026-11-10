/* Client accepts only the public five-field feed. It never calls the source sheet. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./content-engine.js'));else root.ProductFeedCore=factory(root.CheonginContent);})(globalThis,function(Writer){
'use strict';const FIELDS=['brand','name','model','spec','category'],norm=s=>String(s||'').normalize('NFKC').replace(/[\s_·/×*(),-]/g,'').toLowerCase();
function key(text){let h=2166136261;for(const c of text){h^=c.codePointAt(0);h=Math.imul(h,16777619);}return(h>>>0).toString(16);}
function validate(raw){
 if(raw&&Object.keys(raw).some(k=>!['schema','generatedAt','source','digest','rows'].includes(k)))throw Error('허용되지 않은 피드 메타정보입니다.');
 if(!raw||raw.schema!=='cheonginmaru.product-feed.v1'||!Array.isArray(raw.rows)||raw.rows.length>10000||typeof raw.digest!=='string')throw Error('제품 전용 피드 형식이 아닙니다.');
 if(raw.generatedAt!==null&&(!raw.generatedAt||!Number.isFinite(Date.parse(raw.generatedAt))))throw Error('제품 갱신 날짜를 확인하세요.');
 for(const row of raw.rows)if(!row||Object.keys(row).sort().join('|')!==FIELDS.slice().sort().join('|')||FIELDS.some(k=>typeof row[k]!=='string'||row[k].length>2000)||!row.brand||!row.name)throw Error('허용되지 않은 제품 필드가 포함되어 있습니다.');
 return {schema:raw.schema,generatedAt:raw.generatedAt,source:'Lee-Miyoung/maru_calc',digest:raw.digest,rows:raw.rows.map(r=>Object.fromEntries(FIELDS.map(k=>[k,r[k]])))};
}
function identity(p){return [p.type,norm(p.brand),norm(p.model)].join('|');}
function catalogue(feed){
 const groups=new Map(),conflicts=[];for(const r of validate(feed).rows){const type=r.category.includes('벽')?'wall':'floor',id=[type,norm(r.brand),norm(r.name)].join('|');let group=groups.get(id);if(!group){group={type,brand:r.brand,model:r.name,category:r.category,rows:[]};groups.set(id,group);}group.rows.push(r);}
 const products=[];
 for(const [groupKey,g]of groups){const variants=[],names=new Map();let bad=false;
  for(const r of g.rows)if(r.model){const k=norm(r.model),prior=names.get(k);if(prior&&prior.spec!==r.spec){conflicts.push({kind:'source',label:g.brand+' '+g.model+' '+r.model,reason:'같은 모델에 서로 다른 규격이 등록되어 있습니다.'});bad=true;break;}if(!prior){names.set(k,r);variants.push({id:key(k),name:r.model,size:r.spec});}}
  if(bad)continue;const sizes=[...new Set(g.rows.map(r=>r.spec).filter(Boolean))];
  const p=Writer.normalProduct({id:'maru-feed:'+key(groupKey),type:g.type,brand:g.brand,category:g.category,model:g.model,size:sizes.length===1?sizes[0]:'',variants,source:'마루견적 제품 전용 피드',verified:false,features:''});p.feedIdentity=groupKey;products.push(p);
 }return {products,conflicts};
}
function samePublic(a,b){const fields=['type','brand','category','model','size'];return fields.every(k=>(a[k]||'')===(b[k]||''))&&JSON.stringify((a.variants||[]).map(v=>[v.name,v.size||'']).sort())===JSON.stringify((b.variants||[]).map(v=>[v.name,v.size||'']).sort());}
function merge(old,incoming){const variants=(old.variants||[]).map(v=>({...v}));for(const v of incoming.variants||[]){const current=variants.find(x=>norm(x.name)===norm(v.name));if(current)Object.assign(current,{name:v.name,size:v.size});else variants.push({...v});}return {...old,type:incoming.type,brand:incoming.brand,model:incoming.model,category:incoming.category,size:incoming.size,variants,source:old.source||incoming.source,feedIdentity:incoming.feedIdentity};}
function stage(catalog,feed){const parsed=catalogue(feed),next=catalog.slice(),conflicts=parsed.conflicts.slice();let added=0,matched=0;
 for(const p of parsed.products){const matches=next.filter(x=>x.feedIdentity===p.feedIdentity||identity(x)===identity(p));if(matches.length>1){conflicts.push({kind:'multiple',label:p.brand+' '+p.model,incoming:p,reason:'동일한 제품의 기존 항목이 여러 개입니다. 기존 자료를 유지했습니다.'});continue;}const old=matches[0];if(!old){if(next.some(x=>x.id===p.id)){conflicts.push({kind:'identifier',label:p.brand+' '+p.model,reason:'제품 식별자 충돌로 기존 정보를 유지했습니다.'});continue;}next.push(p);added++;}else if(samePublic(old,p)){matched++;if(!old.feedIdentity)next[next.indexOf(old)]={...old,feedIdentity:p.feedIdentity};}else conflicts.push({kind:'update',label:p.brand+' '+p.model,targetId:old.id,incoming:p,reason:'제품 모델 또는 규격이 변경되었습니다. 확인 후 병합하세요.'});}
 if(next.length>1000)throw Error('제품 도감 1000개 한도를 확인하세요. 기존 목록을 유지합니다.');return {catalog:next,conflicts,added,matched};
}
return {validate,catalogue,stage,merge,identity};
});
