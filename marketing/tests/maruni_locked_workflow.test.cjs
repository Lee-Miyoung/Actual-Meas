'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),F=require('../maruni-locked-workflow-core.js');
function mock(){
 const scenes=F.scenesFor('product').map((x,i)=>({...x,photo:new Blob(['image-'+i],{type:'image/png'}),photoId:'id'+i,actorTransform:{maruni:{dx:5}},focusY:50}));
 return {schema:'cheonginmaru-maruni-locked-v1',type:'product',library:scenes.map(s=>({id:s.photoId})),series:'old',product:'old',scenes};
}
test('6개 콘텐츠 템플릿은 모두 표지+본편 4컷',()=>{
 assert.equal(F.types().length,6);
 for(const {id,label} of F.types()){
  assert.ok(label);
  assert.equal(F.scenesFor(id).length,5);
  for(const s of F.scenesFor(id)){assert.ok(s.title);assert.ok(s.foot);assert.ok(s.maruni);assert.ok(s.ruru);}
 }
});
test('제품→그냥 사는 이야기 변경 시 사진과 캐릭터 포즈/좌표 유지',()=>{
 const project=mock(),photos=project.scenes.map(s=>s.photo);
 const pose=project.scenes.map(s=>s.maruni);
 F.chooseTemplate(project,'everyday');
 assert.equal(project.type,'everyday');
 assert.equal(project.series,'마루니·루루 | 일상 이야기');
 assert.equal(project.scenes[0].title.includes('오늘'),true);
 assert.deepEqual(project.scenes.map(s=>s.photo),photos);
 assert.deepEqual(project.scenes.map(s=>s.photoId),['id0','id1','id2','id3','id4']);
 assert.deepEqual(project.scenes.map(s=>s.maruni),pose);
 assert.deepEqual(project.scenes[0].actorTransform,{maruni:{dx:5}});
});
test('사진 순서만 교환하면 컷 제목·캐릭터·대사는 변경 없음',()=>{
 const project=mock(),a=project.scenes[0].title,b=project.scenes[3].title;
 F.swapPhotos(project.scenes,0,3);
 assert.equal(project.scenes[0].photoId,'id3');assert.equal(project.scenes[3].photoId,'id0');
 assert.equal(project.scenes[0].title,a);assert.equal(project.scenes[3].title,b);
 assert.equal(project.scenes[0].maruni,'maruni-02');
});
test('본편 순서 이동은 표지를 보호한다',()=>{
 const project=mock(),cover=project.scenes[0],moved=project.scenes[1];
 F.moveStoryScene(project.scenes,1,3);
 assert.equal(project.scenes[0],cover);assert.equal(project.scenes[3],moved);
 assert.throws(()=>F.moveStoryScene(project.scenes,0,1));
});
test('일괄 사진 배치 범위는 현재 컷부터 최대 5장',()=>{
 assert.deepEqual(F.batchTargets(0,12),[0,1,2,3,4]);
 assert.deepEqual(F.batchTargets(2,12),[2,3,4]);
 assert.deepEqual(F.batchTargets(4,3),[4]);
 assert.deepEqual(F.batchTargets(0,0),[]);
});
test('보관함·컷 사진 ID는 중복 없이 수집',()=>{
 const project=mock();
 project.library.push({id:'extra'});
 assert.deepEqual(F.photoIds(project),['id0','id1','id2','id3','id4','extra']);
});
test('원본 사진을 직접 지정하면 컷 정보만 바뀐다',()=>{
 const project=mock(),img=new Blob(['new'],{type:'image/png'});
 F.changePhoto(project.scenes[1],img,'new-id');
 assert.equal(project.scenes[1].photoId,'new-id');
 assert.equal(project.scenes[1].photo,img);
 assert.equal(project.scenes[1].title,'은은한 슬레이트 질감');
 assert.throws(()=>F.changePhoto(project.scenes[1],{},'bad'));
});
