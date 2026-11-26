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
  assert.match(js,/index===0\?window\.CheonginCoverStyle\.contentLogo\(\):Promise\.resolve\(null\)/);
  assert.match(js,/window\.CheonginCoverStyle\.drawLogo\(ctx,canvas,logo,W,55,50\)/);
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
  assert.match(js, /persistedPhotos=storedKeys/);
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

test('아이패드에서 사진 업로드 중 전체 페이지와 하단 컨트롤 스크롤이 가능하다',()=>{
  assert.match(css, /body\.simple-marketing-mode\.maruni-editor-scrolling\s*\{/);
  assert.match(css, /overflow-y:auto!important/);
  assert.match(css, /body\.simple-marketing-mode\.maruni-editor-scrolling main\s*\{/);
  assert.match(css, /overflow:visible!important/);
  assert.match(css, /#maruni-locked-template \.ml-stage,\s*#maruni-story \.mr-stage/);
  assert.match(css, /position:static!important/);
  assert.match(js, /id="ml-quick-photo"/);
  assert.match(js, /q\('#ml-quick-photo'\)\.addEventListener\('click'/);
  assert.match(js, /document\.body\.classList\.toggle\('maruni-editor-scrolling',expanded\)/);
  assert.match(story, /id="mr-quick-photo"/);
  assert.match(story, /\$\('#mr-quick-photo'\)\.onclick/);
  assert.match(html, /maruni-locked-template\.css\?v=photo-handles-20261121/);
});

test('콘텐츠 형식 6종과 사진 한꺼번에 선택·드롭·붙여넣기·컷 순서 기능 연결',()=>{
 assert.match(html,/maruni-locked-workflow-core\.js\?v=/);
 assert.match(js,/id="ml-type"/);
 assert.match(js,/id="ml-photo" type="file" multiple/);
 assert.match(js,/id="ml-drop-zone"/);
 assert.match(js,/id="ml-photo-grid"/);
 assert.match(js,/id="ml-clipboard"/);
 assert.match(js,/addEventListener\('paste'/);
 assert.match(js,/addEventListener\('drop'/);
 assert.match(js,/event\.dataTransfer\?\.files/);
 assert.match(js,/async function importPhotos\(/);
 assert.match(js,/Workflow\.batchTargets/);
 assert.match(js,/Workflow\.swapPhotos/);
 assert.match(js,/Workflow\.moveStoryScene/);
 assert.match(js,/document\.createElement\('img'\)/);
 assert.match(js,/id="ml-open-pose-maruni"/);
 assert.match(js,/id="ml-open-pose-ruru"/);
 assert.match(css,/\.ml-photo-grid/);
 assert.match(css,/\.ml-photo-library/);
});
test('사진 보관함은 별도 저장되며 오래된 프로젝트의 사진 열기 함수가 중복되지 않는다',()=>{
 assert.equal(js.split('async function openProject(id)').length,2);
 assert.match(js,/const files=new Map\(\),storedKeys=new Set\(\)/);
 assert.match(js,/persistedPhotos=storedKeys/);
 assert.match(js,/libraryBlobs\.get\(row\.id\)/);
 assert.match(js,/loaded\.library=Array\.isArray\(loaded\.library\)/);
 assert.match(js,/s\.photoId/);
});

test('대본 붙여넣기 뒤 형식 전환은 두 번째 말풍선 상태를 갱신',()=>{
 assert.match(js,/secondBubble:maruni&&ruru\?ruru:''/);
 assert.match(js,/Workflow\.chooseTemplate\(project,type\)/);
 assert.match(js,/q\('#ml-second'\)\.value=s\.secondBubble\|\|''/);
 assert.match(html,/maruni-locked-workflow-core\.js\?v=clear-second-bubble-20261126/);
});
