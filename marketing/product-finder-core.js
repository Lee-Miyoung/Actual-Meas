/* View-only classification and search. Product identity, source facts and snapshots never change. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.ProductFinderCore=factory();})(globalThis,function(){
'use strict';
const ORDER=['강마루','합판마루','합판·보드 복합','원목마루','천연마루','광폭·대형마루','강화마루','SPC','미네랄마루','장판','데코타일','카펫','기타 바닥재','시그니월','디자인월','기타 벽장재'];
const norm=s=>String(s||'').normalize('NFKC').toLowerCase().replace(/[\s_·,\-()/×*＊]/g,'').replace(/(\d)x(?=\d)/g,'$1');
const CHO='ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
function initials(s){return String(s||'').split('').map(c=>{const n=c.charCodeAt(0)-44032;return n>=0&&n<11172?CHO[Math.floor(n/588)]:c;}).join('').normalize('NFKC');}
function category(p){const text=[p.category,p.model,p.material].join(' '),all=p.brand+' '+text;if(p.type==='wall'){if(/시그니월/.test(text))return'시그니월';if(/디자인월/.test(text))return'디자인월';return'기타 벽장재';}for(const [pattern,label]of [[/장판/,'장판'],[/데코타일|\bLVT\b/i,'데코타일'],[/카펫|카페트/,'카펫'],[/SPC|돌마루/i,'SPC'],[/미네랄/,'미네랄마루'],[/강화마루/,'강화마루'],[/원목/,'원목마루'],[/천연마루/,'천연마루'],[/합판\s*\+\s*보드/,'합판·보드 복합'],[/합판/,'합판마루'],[/강마루/,'강마루'],[/광폭|대형마루/,'광폭·대형마루']])if(pattern.test(all))return label;return'기타 바닥재';}
function historic(p,v){return /단종|출시\s*전|재고\s*없음/.test([p.status,p.model,v?.status].join(' '));}
function within(p,f={}){return(!f.type||p.type===f.type)&&(!f.category||category(p)===f.category)&&(!f.brand||norm(p.brand).includes(norm(f.brand)));}
function matches(text,token){const n=norm(token);if(/^[ㄱ-ㅎᄀ-ᄒ]+$/.test(token))return norm(initials(text)).includes(n);return norm(text).includes(n);}
function search(catalog,query='',filters={}){const tokens=String(query).replace(/(\d)\s*[xX×*＊]\s*(?=\d)/g,'$1').trim().split(/\s+/).filter(Boolean),q=norm(query),out=[];for(const p of catalog){if(!within(p,filters))continue;for(const v of [null,...(p.variants||[])]){if(!filters.historic&&historic(p,v)&&filters.selected!==p.id+(v?'::'+v.id:''))continue;const label=[p.brand,p.model,p.color,v?.name,v?.size||p.size,p.category,category(p)].filter(Boolean).join(' ');if(!tokens.every(t=>matches(label,t)))continue;const model=norm(v?.name),family=norm(p.model);let score=0;if(q){if(model===q)score=220;else if(!v&&family===q)score=200;else if(model.startsWith(q))score=160;else if(!v&&family.startsWith(q))score=140;else if(model.includes(q))score=120;else if(family.includes(q))score=100;else score=60;}out.push({key:p.id+(v?'::'+v.id:''),product:p,variant:v,category:category(p),score});}}return out.sort((a,b)=>b.score-a.score||a.product.brand.localeCompare(b.product.brand,'ko')||a.product.model.localeCompare(b.product.model,'ko')||Number(!!a.variant)-Number(!!b.variant)||String(a.variant?.name||'').localeCompare(String(b.variant?.name||''),'ko'));}
function families(catalog,query,filters){const seen=new Set();return search(catalog,query,filters).filter(r=>{if(seen.has(r.product.id))return false;seen.add(r.product.id);return true;}).map(r=>r.product);}
function categories(catalog,type=''){return [...new Set(catalog.filter(p=>!type||p.type===type).map(category))].sort((a,b)=>ORDER.indexOf(a)-ORDER.indexOf(b));}
function uniqueEnter(results){if(results.length===1)return results[0];if(results[0]?.score>=200&&results[0].score>(results[1]?.score||0))return results[0];return null;}
return{norm,category,historic,within,search,families,categories,uniqueEnter};
});
