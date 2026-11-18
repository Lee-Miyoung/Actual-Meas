/* 회귀 방지: 청인마루 고정 4컷의 중요 계약이 바뀌지 않았는지 검사 */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const js = fs.readFileSync(path.join(root, 'maruni-locked-template.js'),'utf8');
const html = fs.readFileSync(path.join(root,'index.html'),'utf8');
const css = fs.readFileSync(path.join(root,'maruni-locked-template.css'),'utf8');

test('고정 4컷 모듈은 유효한 JS이며 기존 편집기와 별도 연결된다',()=>{
  assert.doesNotThrow(()=>new Function(js));
  assert.match(html,/id="maruni-locked-template"/);
  assert.match(html,/id="maruni-story"/);
  assert.match(html,/maruni-locked-template\.css\?v=/);
  assert.match(html,/maruni-locked-template\.js\?v=/);
  assert.match(css,/#maruni-locked-template/);
});
test('표지 1 + 본편 4, 4:5, 공식 로고 반복 금지',()=>{
  assert.match(js,/W = 1080, H = 1350, COUNT = 5/);
  assert.match(js,/brand\/logo-black\.svg/);
  assert.equal(js.split('brand/logo-black.svg').length,2);
  assert.match(js,/if\(index===0\)/);
  assert.match(js,/const x=110,y=365,w=750,h=158/);
});
test('기존 견적·마케팅 DB와 데이터 분리, 공식 캐릭터 원본만',()=>{
  assert.match(js,/cheonginmaru-maruni-locked-v1/);
  assert.doesNotMatch(js,/cheonginmaru-marketing-v1/);
  assert.doesNotMatch(js,/cheonginmaru-maruni-story-v1/);
  assert.match(js,/assets\/characters\/manifest\.json/);
  assert.match(js,/a\.status==='ready'/);
  assert.match(js,/fflate\.zip/);
  assert.match(js,/ml-copy-photo-all/);
});
