'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const six=fs.readFileSync(path.join(root,'maruni-story.js'),'utf8');
const sixCss=fs.readFileSync(path.join(root,'maruni-story.css'),'utf8');
const five=fs.readFileSync(path.join(root,'maruni-locked-template.js'),'utf8');
const fiveCss=fs.readFileSync(path.join(root,'maruni-locked-template.css'),'utf8');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');

test('두 편집기의 스크롤은 기본 허용, 캐릭터 이동 중에만 touch-action none',()=>{
  assert.match(sixCss,/touch-action:pan-y pinch-zoom/);
  assert.match(sixCss,/#mr-canvas\[data-touch-edit="true"\]\{touch-action:none\}/);
  assert.match(fiveCss,/#ml-canvas\{touch-action:pan-y pinch-zoom/);
  assert.match(fiveCss,/#ml-canvas\[data-touch-edit="true"\]\{touch-action:none\}/);
  assert.match(six,/touchEdit = false/);
  assert.match(five,/touchEdit=false/);
});
test('이동 모드를 켜지 않으면 손가락 포인터를 캔버스에서 가로채지 않는다',()=>{
  assert.match(six,/e\.pointerType === 'touch' && !touchEdit\) return/);
  assert.match(five,/e\.pointerType==='touch'&&!touchEdit\)return/);
  assert.match(six,/id="mr-touch-edit"/);
  assert.match(five,/id="ml-touch-edit"/);
  assert.match(six,/\$\('#mr-touch-edit'\)\.addEventListener\('click'/);
  assert.match(five,/q\('#ml-touch-edit'\)\.addEventListener\('click'/);
  assert.match(six,/touchEdit=false;updateTouchEdit\(\)/);
  assert.match(five,/touchEdit=false;drag=null/);
});
test('6컷에서 포즈 재선택은 새 캐릭터를 쌓지 않고 교체',()=>{
  assert.match(six,/const existing=addAnotherActor\?null/);
  assert.match(six,/existing\.assetId=a\.id/);
  assert.match(six,/id="mr-add-another"/);
  assert.match(six,/id="mr-clean-duplicates"/);
  assert.match(six,/removed\.has\(l\.speakerId\)/);
  assert.match(six,/if \(!scene\(\)\.photoId\) throw Error/);
});
test('기존 4컷 포맷과 공식 에셋 사용 규칙 유지',()=>{
  assert.match(five,/W = 1080, H = 1350, COUNT = 5/);
  assert.equal(five.split('brand/logo-black.svg').length,2);
  assert.match(six,/SHA-256/);
  assert.match(five,/a\.status==='ready'/);
  assert.match(html,/maruni-story\.css\?v=ipad-touch-20261119/);
});
test('변경 후 두 편집기 JS는 문법상 유효',()=>{
  assert.doesNotThrow(()=>new Function(six));
  assert.doesNotThrow(()=>new Function(five));
});
