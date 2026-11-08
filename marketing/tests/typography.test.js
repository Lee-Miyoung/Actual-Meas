const test=require('node:test'),assert=require('node:assert/strict'),T=require('../typography');
const measure=(s,size)=>Array.from(s).reduce((n,c)=>n+(/\s/.test(c)?.28:/[A-Za-z0-9×.]/.test(c)?.55:1),0)*size;
const typeset=(text,extra={})=>T.layout(text,{measure,width:760,fontSize:68,minFontSize:48,maxLines:2,...extra});
test('Korean headline respects words and avoids a single-character last line',()=>{
 const t=typeset('가구를 들이기 전, 집의 분위기를 고르는 일');assert(!t.truncated);assert(t.lines.length===2);assert(t.lines.at(-1).length>=3);assert(t.widths.every(w=>w<=760));
});
test('product model and thickness units are not arbitrarily split',()=>{
 const p=typeset('한솔홈데코 스킨마루165',{width:230,fontSize:32,minFontSize:32,maxLines:3});assert(p.lines.includes('스킨마루165'));assert(!p.lines.includes('165'));
 const s=typeset('165 × 1205 × 7.2T',{width:240,fontSize:32,minFontSize:26,maxLines:2});assert(s.lines.some(l=>l.includes('7.2T')));assert(!s.truncated);
});
test('parentheses and closing punctuation do not hang at line boundaries',()=>{
 const t=typeset('우리 집의 (새로운 마루)를 고릅니다.',{width:340,fontSize:32,minFontSize:28,maxLines:3});assert(!t.truncated);assert(t.lines.every(l=>! /^[,.)\]]/.test(l)&&! /[(\[]$/.test(l)));
});
test('intentional line breaks survive and overlong copy is bounded without changing source',()=>{
 const manual='가구를 고르기 전\n바닥을 먼저 봅니다';assert.deepEqual(typeset(manual).lines,manual.split('\n'));
 const long='가'.repeat(130);const t=typeset(long,{width:300,fontSize:50,minFontSize:40,maxLines:2});assert(t.truncated);assert(t.lines.at(-1).endsWith('…'));assert(t.widths.every(w=>w<=300));assert.equal(t.source,long);
});

test('a headline comma keeps the complete invitation phrase together',()=>{
 const source='이 분위기, 우리 집의 바닥에도 어울릴까요?';const t=typeset(source,{width:950,fontSize:65,minFontSize:47,preferPause:true});
 assert.equal(t.lines[0],'이 분위기,');assert(t.lines[1].startsWith('우리 집의 바닥'));assert.equal(t.source,source);assert(!t.truncated);
});
