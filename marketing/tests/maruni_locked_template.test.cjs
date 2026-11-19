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

const story = fs.readFileSync(path.join(root, 'maruni-story.js'),'utf8');
test('아이패드 속도: 미리보기만 절반 크기, 출력은 원래 1080×1350',()=>{
  assert.match(js, /<canvas id="ml-canvas" width="540" height="675"/);
  assert.match(js, /canvas\.width=W;canvas\.height=H;await draw\(i\)/);
  assert.match(js, /2048\/Math\.max\(im\.width,im\.height\)/);
  assert.match(js, /while\(blobCache\.size>2\)/);
  assert.match(js, /requestAnimationFrame/);
});
test('기존 작업을 보존하면서 큰 사진 파일은 별도 저장',()=>{
  assert.match(js, /indexedDB\.open\(DB_NAME,2\)/);
  assert.match(js, /objectStoreNames\.contains\('media'\)/);
  assert.match(js, /delete slim\.photo/);
  assert.match(js, /m\.put\(\{id,blob\}\)/);
  assert.match(js, /files\.get\(scene\.photoId\)/);
  assert.match(js, /persistedPhotos=new Set\(files\.keys\(\)\)/);
});
test('아이패드 공식 포즈 목록은 6개씩 로드, 2개 편집기 모두 지연 시작',()=>{
  assert.match(js, /list\.slice\(pickerPage\*6,pickerPage\*6\+6\)/);
  assert.match(js, /image\.loading\s*=\s*'lazy'/);
  assert.match(js, /canvas\.addEventListener\('pointerdown'/);
  assert.match(js, /root\.addEventListener\('toggle'/);
  assert.match(story, /matching\.slice\(assetPage\*6,assetPage\*6\+6\)/);
  assert.match(story, /root\.addEventListener\('toggle'/);
  assert.doesNotThrow(()=>new Function(story));
});
