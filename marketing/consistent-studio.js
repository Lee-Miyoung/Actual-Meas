/* One everyday workspace; existing records and advanced tools keep their handlers. */
(function(){
'use strict';
const nav=document.querySelector('aside nav');
const labels={studio:'사진 · 콘텐츠 만들기',products:'제품 · 모델 도감',storage:'보관함 · 기기 이동'};
for(const [key,label]of Object.entries(labels)){const b=nav.querySelector(`[data-tab="${key}"]`);b.textContent=label;nav.append(b);}
const more=node('details',undefined,'studio-more');more.append(node('summary','운영 · 기존 기능'));
for(const b of [...nav.querySelectorAll('button')])if(!labels[b.dataset.tab])more.append(b);
nav.append(more);
const desk=document.querySelector('.production-desk');
desk.querySelector('.desk-heading h2').textContent='사진이 먼저 말하는 시공 기록';
desk.querySelector('.desk-heading p').textContent='사진은 크게, 정보는 짧고 정확하게. 모든 현장을 같은 기준으로 기록합니다.';
desk.querySelector('.desk-badge').textContent='청인마루 현장 스튜디오';
const templates={cover:['A. 공간 화보','완성 공간과 짧은 제목'],comparison:['B. 전후 비교','위아래로 보는 실제 변화'],detail:['C. 소재 감상','마루의 결 · 제품 정보']};
for(const b of document.querySelectorAll('[data-archive-template]')){const [title,note]=templates[b.dataset.archiveTemplate];b.replaceChildren(node('strong',title),node('small',note));}
const extraFormats=[['youtubeCover','유튜브 표지 · 16:9'],['kakao','카카오 · 1:1']];
const formats=document.querySelector('.archive-formats');
for(const [value,label]of extraFormats){const b=node('button',label);b.type='button';b.dataset.archiveFormat=value;b.onclick=()=>{$('format').value=value;$('format').onchange?.({target:$('format')});state.format=value;persist();renderProductionWorkspace();};formats.append(b);}
const designStep=document.querySelector('.archive-templates').parentElement;
const edition=node('button','사진 전체형 고정 템플릿 적용');edition.type='button';edition.id='consistent-adopt';
const titleLabel=node('label','이 장의 제목 · 최대 두 줄'),titleInput=node('textarea');titleInput.rows=2;titleInput.maxLength=70;titleInput.placeholder='예: 큰 창 아래, 차분한 본오크';titleInput.id='consistent-title';titleLabel.append(titleInput);
titleInput.onchange=()=>{const i=state.productionView?.slide||0;window.signatureSlideEdited(i,{title:titleInput.value});const slot=state.signatureSequence?.[i];if(slot)slot.archiveNote=titleInput.value;persist();renderProductionWorkspace();};
const structureLabel=node('label','제품 구조'),structureSelect=node('select');structureSelect.id='consistent-structure';
for(const [value,label]of [['','표기 안 함'],['합판형 강마루','합판형 강마루'],['보드형 강마루(HDF)','보드형 강마루(HDF)'],['원목마루','원목마루'],['SPC','SPC'],['벽장재','벽장재'],['기타','기타']])structureSelect.add(new Option(label,value));
structureLabel.append(structureSelect);
structureSelect.onchange=()=>{state.productStructure=structureSelect.value;state.signatureCaptionKey='';if(typeof indexCurrent==='function')indexCurrent();persist();if(typeof scheduleChannels==='function')scheduleChannels();renderProductionWorkspace();};
const hint=node('p','사진을 화면 전체에 사용하고, 지역·공간·제품명·규격·제품 구조만 사진 위에 은은하게 표시합니다. 마루 색상과 질감은 원본 기준으로 유지하세요.','hint');
edition.onclick=()=>{if(!state.photos.length)return toast('사진을 먼저 불러오세요.');if(!state.signatureDesign?.photoEdition){state.consistentPreviousDesign=SignatureCore.copy({design:state.signatureDesign,sequence:state.signatureSequence});const cfg=state.signatureDesign||SignatureCore.create();cfg.archiveVersion=1;cfg.photoEdition=1;cfg.type.title=cfg.type.body='Pretendard';state.signatureDesign=cfg;}persist();renderProductionWorkspace();};
const undo=node('button','적용 전 디자인으로');undo.type='button';undo.onclick=()=>{const old=state.consistentPreviousDesign;if(!old)return;state.signatureDesign=SignatureCore.copy(old.design);state.signatureSequence=SignatureCore.copy(old.sequence);delete state.consistentPreviousDesign;persist();renderProductionWorkspace();};
designStep.append(edition,titleLabel,structureLabel,hint,undo);
const transfer=node('details',undefined,'device-transfer');transfer.append(node('summary','다른 기기에서 이어서 작업하기'));
transfer.append(node('p','작업은 현재 브라우저에 저장됩니다. 자동 동기화는 연결되어 있지 않습니다. 백업 파일을 다른 기기로 보내 같은 주소에서 불러오세요.'));
const save=node('button','작업 전체 백업'),restore=node('label','다른 기기의 백업 불러오기','transfer-picker'),input=node('input');input.type='file';input.accept='.json,application/json';save.type='button';save.onclick=async()=>{await flushPendingSave();await backup();};input.onchange=()=>{if(!input.files.length)return;const target=$('restore');const dt=new DataTransfer();dt.items.add(input.files[0]);target.files=dt.files;target.dispatchEvent(new Event('change',{bubbles:true}));input.value='';};restore.append(input);transfer.append(save,restore);desk.append(transfer);
const base=window.renderProductionWorkspace;window.renderProductionWorkspace=function(...args){const slot=state.signatureSequence?.[state.productionView?.slide||0];if(document.activeElement!==titleInput)titleInput.value=slot?.archiveNote||slot?.title||'';if(document.activeElement!==structureSelect)structureSelect.value=state.productStructure||'';edition.hidden=!!state.signatureDesign?.photoEdition;undo.hidden=!state.consistentPreviousDesign;if(state.signatureDesign?.photoEdition)$('production-crop-note').textContent='사진 전체 화면 · 한글 고정 정보 오버레이 · 마루 색·질감 유지';return base(...args);};
// Touch devices get a fresh-tap share sheet, including Android and tablets.
const beforeDownload=download;download=function(blob,name){if(!(blob instanceof Blob)||!blob.size)return beforeDownload(blob,name);if(!appleTouchDevice&&navigator.maxTouchPoints>0){const files=pendingPhotoFiles||(blob.type.startsWith('image/')?[{name,blob}]:[]);pendingPhotoFiles=null;showDeviceExport(blob,name,files);easyStatus('저장 창에서 공유 또는 파일 저장을 선택하세요.');}else beforeDownload(blob,name);};
// Preserve old project designs; install the new format only for future projects.
const init=setInterval(()=>{if(!window.signatureReady||!writingReady)return;clearInterval(init);const profile=state.settings.brandDesign;if(!profile.photoEditionInstalled){profile.history.push(SignatureCore.copy(profile.current));profile.current={...SignatureCore.copy(profile.current),archiveVersion:1,photoEdition:1};profile.current.type.title=profile.current.type.body='Pretendard';profile.photoEditionInstalled=true;if(!state.photos.length)state.signatureDesign=SignatureCore.copy(profile.current);persist();}renderProductionWorkspace();},300);
})();
