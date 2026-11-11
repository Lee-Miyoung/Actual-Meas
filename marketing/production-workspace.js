(function(){
/* Photo-led production desk. Keeps the existing project, backup and channel tools. */
'use strict';
let productionSlide = 0, productionRevision = 0, productionImportBusy = false;
let productionProject="",renderRequested=false,renderLoop=null;
const studioHost = $('studio');
studioHost.classList.add('production-studio');
const desk = document.createElement('div');
desk.className = 'production-desk';
desk.innerHTML = `
  <div class="desk-heading"><div><p class="eyebrow">PHOTO TO PUBLISH</p><h2>사진 한 장에서, 모든 채널로.</h2><p>자료를 넣고 → 사진과 문구 확인 → 원하는 채널로 저장</p></div><span class="desk-badge">청인마루 공통 스타일</span></div>
  <section class="package-drop" id="package-drop">
    <div><strong>01　제작 자료 불러오기</strong><p>ChatGPT가 준 ZIP 하나면 사진·문구·규격이 함께 들어옵니다.</p></div>
    <label class="package-picker">ZIP 또는 사진·JSON 선택<input id="production-files" type="file" accept=".zip,.json,image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" multiple></label>
    <p id="production-import-status" role="status">파일을 여기에 끌어 놓아도 됩니다. 기존 작업은 새 자료를 확인한 뒤 교체합니다.</p>
  </section>
  <div class="desk-layout"><section class="desk-preview portfolio-preview">
    <div class="preview-heading"><strong>02　시공 포트폴리오</strong><span id="production-dimensions"></span></div>
    <div id="production-platforms" class="platform-pills" aria-label="게시 플랫폼"></div>
    <div id="production-preview"></div>
    <div class="preview-navigation"><button id="production-prev" aria-label="이전 사진">←</button><span id="production-page">사진을 불러오세요</span><button id="production-next" aria-label="다음 사진">→</button></div>
    <div id="production-filmstrip" class="production-filmstrip" aria-label="사진 순서"></div>
    <div class="slide-editor"><label>현재 사진 문구<input id="production-title" maxlength="100" placeholder="사진 아래에 들어갈 짧은 문구"></label><label>사진 연결<select id="production-photo"></select></label>
    <div class="slide-tools"><label>사진 종류<select id="production-kind"><option value="auto">자동 구분</option><option value="photo">일반 사진</option><option value="pair">전후 비교 · 좌우 합성본</option></select></label><label>구도 · 위아래 이동<input id="production-focus" type="range" min="0" max="100" value="45"></label></div>
    <p id="production-crop-note" class="hint"></p></div>
  </section><section class="desk-settings"><div id="production-settings"></div></section></div>`;
document.querySelector('#studio > .section-head').after(desk);
$('production-preview').append($('designs'));
const strategy = document.createElement('section');
strategy.className = 'story-planner';
strategy.innerHTML = `<div class="planner-heading"><div><span class="eyebrow">콘텐츠 설계</span><h3>예쁜 사진에서, 상담하고 싶은 시공 사례로.</h3></div><span>관심 → 비교 → 확인 → 상담</span></div>
<div class="planner-fields"><label>현장 지역·공간<input id="story-site" placeholder="예: 춘천 석사동 · 신축 주택 1층"></label><label>첫 장에서 전달할 내용<select id="story-angle"><option value="change">시공 전후 · 공간의 변화</option><option value="product">제품 선택 · 실제 시공 모습</option><option value="detail">디테일 · 결과 색감</option></select></label></div>
<div class="story-sequence"><span>01 관심을 끄는 표지</span><span>02 전후 비교</span><span>03 제품 확인</span><span>04 다른 구도 비교</span><span>05 선택에 도움 되는 정보</span><span>06 상담 안내</span></div>
<p id="story-suggestion">현장과 제품 정보를 바탕으로 문구 초안을 만듭니다. 사진 순서는 그대로 유지합니다.</p>
<div class="planner-actions"><button id="story-draft">문구 초안 보기</button><button id="story-apply" class="primary" disabled>검토한 문구·캡션 적용</button></div><div id="story-review" hidden></div>
<p class="hint">사진과 맞는 문구인지 확인 후 적용하세요. 전후 비교 사진은 ‘사진 연결’에서 지정할 수 있습니다.</p>`;
$('package-drop').after(strategy);
let storyDraft = null;
$('story-site').value = state.marketingSite || '';
$('story-angle').value='product';
$('story-site').onchange = e => {state.marketingSite = e.target.value.trim(); persist();};
$('story-draft').onclick = () => {
  const product = $('brand-product').value.trim() || '마루', size = $('brand-size').value.trim();
  const site = $('story-site').value.trim();
  const hasComparison=state.brandSlides?.some(s=>s.layout==='pair');
  if($('story-angle').value==='change'&&!hasComparison)return toast('전후 비교 사진을 연결한 뒤 선택하세요. 일반 사진은 제품·디테일 모드를 사용할 수 있습니다.');
  const first = {change:'마루 시공 전후, 공간의 변화',product:product + ', 실제 시공 모습',detail:'가까이서 보는 마루의 결'}[$('story-angle').value];
  const titles = [first,hasComparison?'시공 전과 후를 비교해 보세요':'가까이서 바라본 공간',product + '의 결과 색감',hasComparison?'다른 구도에서 보는 시공 전후':'다른 구도에서 바라본 공간','우리 집에 어울리는 마루일까요?','지역·평수·현장 사진을 보내주세요'];
  const facts = [site, product, size].filter(Boolean).join(' · ');
  const base = `${facts}\n\n${hasComparison?'시공 전후와 여러 구도의 사진을 함께 담았습니다.':'현장 사진으로 공간과 소재의 모습을 담았습니다.'} 마루의 색감은 채광과 보는 화면에 따라 달라 보일 수 있어요. 제품을 고르실 때는 실제 샘플도 함께 확인해 주세요.\n\n시공 상담은 지역·평수·현장 사진을 메시지로 보내주세요. 현장 조건을 확인해 안내드리겠습니다.\n\n마루 시공 · 청인마루`;
  storyDraft = {titles, captions:Object.fromEntries(Object.keys(OUTPUT_PRESETS).map(key => [key, ['reels','shorts','story'].includes(key) ? `${first}\n${facts}\n\n지역·평수·현장 사진을 메시지로 보내주세요.\n청인마루` : key === 'youtubeCover' ? first : base]))};
  const review = $('story-review');review.replaceChildren();
  titles.forEach((title,i) => {const p=document.createElement('p');p.textContent=`${i+1}. ${title}`;review.append(p);});
  const caption=document.createElement('p');caption.textContent=storyDraft.captions[state.format] || base;caption.className='draft-caption';review.append(caption);review.hidden=false;
  $('story-apply').disabled=false;$('story-suggestion').textContent='아래는 규칙 기반 초안입니다. 현재 문구는 적용 버튼을 누르기 전까지 유지됩니다.';
};
$('story-apply').onclick = () => {
  if (!storyDraft) return;
  const slides=productionSlides();
  state.brandSlides=slides.map((slide,i)=>({...slide,title:storyDraft.titles[i % 6].slice(0,100)}));
  state.brandOutput={...brandSettings(),titles:state.brandSlides.map(s=>s.title).join('\n')};
  state.brandCaptions={...state.brandCaptions,...storyDraft.captions};
  state.marketingSite=$('story-site').value.trim();persist();syncBrandControls();renderProductionWorkspace();
  $('story-suggestion').textContent='적용했습니다. 각 사진의 문구와 전후 비교 연결을 미리보기에서 확인하세요.';
};

$('production-settings').append(brandPanel);
brandPanel.querySelector('h3').textContent = '03　스타일과 게시 준비';
brandPanel.querySelector('p').textContent = '사진은 끝까지 넓게. 문구는 사진 아래, 로고는 같은 크기로.';
const handoff = brandPanel.querySelector('.brand-handoff');
handoff.querySelector('summary').textContent = '문구·규격만 붙여넣기 / ChatGPT 요청문';
const advanced = document.createElement('details');
advanced.className = 'production-advanced';
advanced.innerHTML = '<summary>로고·전체 문구 세부 설정</summary>';
const controlsHost = brandPanel.querySelector('.brand-controls');
// Keep essential product facts exposed, with the rest available in one details area.
const facts = document.createElement('div'); facts.className = 'production-facts';
facts.append($('brand-product').closest('label'), $('brand-size').closest('label'));
controlsHost.before(facts);
advanced.append(controlsHost, $('brand-titles').closest('label'), $('brand-example'));

$('brand-caption').closest('label').before(advanced);
$('brand-position').closest('label').hidden = true;
$('brand-tone').closest('label').hidden = true;
$('brand-fit').replaceChildren(new Option('테두리 없이 채우기 · 가장자리 일부 크롭', 'cover'), new Option('사진 전체 보기 · 자르지 않기', 'contain'));
const fitLabel = $('brand-fit').closest('label');
advanced.before(fitLabel);
const layoutControl = document.createElement('label');
layoutControl.append(document.createTextNode('사진 스타일'));
const layoutSelect = document.createElement('select'); layoutSelect.id = 'production-style';
layoutSelect.append(new Option('사진 + 아래 문구 · 권장', 'editorial'), new Option('사진 + 중앙 로고만', 'journal'));
layoutControl.append(layoutSelect); fitLabel.before(layoutControl);
layoutSelect.onchange = () => { state.theme = layoutSelect.value; persist(); renderProductionWorkspace(); };
// Display the same real platform select next to the visible export actions.
const platformLabel = $('format').closest('label');
facts.before(platformLabel);
$('brand-caption').closest('label').firstChild.textContent = '선택한 플랫폼의 캡션 · 직접 수정 가능';
const exportToolbar = $('brand-copy-caption').parentElement;
const currentExport = document.createElement('button'); currentExport.id = 'production-export';
currentExport.className = 'primary'; currentExport.textContent = '선택한 플랫폼 사진 + 캡션 저장';
exportToolbar.prepend(currentExport);
const singleExport = document.createElement('button'); singleExport.textContent = '현재 사진만 PNG 저장';
singleExport.onclick = async () => { try { if (!state.photos.length) return toast('사진을 먼저 불러오세요.'); await exportCanvas(await card(state.theme, productionSlide), `청인마루_${state.format}_${productionSlide + 1}.png`); } catch(e) { toast(e.message); } };
currentExport.after(singleExport);
$('brand-export-all').textContent = '모든 플랫폼 묶음 저장';
exportToolbar.after($('video-progress'), $('video-status'));
const targets = document.createElement('details'); targets.innerHTML = '<summary>모든 플랫폼에 포함되는 출력 규격</summary>';
const targetList = document.createElement('p'); targetList.className = 'hint';
targetList.textContent = Object.values(OUTPUT_PRESETS).map(p => p.label + ': ' + (p.natural ? '원본 비율 · 긴 변 최대 1600px' : `${p.width} × ${p.height}`)).join('\n'); targets.append(targetList); brandPanel.append(targets);
brandPanel.append(handoff);
// Move the old editor and project fields into an optional, clearly named drawer.
const editorDrawer = document.createElement('details'); editorDrawer.className = 'production-advanced original-editor';
editorDrawer.innerHTML = '<summary>사진 수평·색상 직접 조정 / 현장 정보</summary>';
const oldGrid = studioHost.querySelector('.work-grid'); oldGrid.before(editorDrawer); editorDrawer.append(oldGrid);
$('easy-status').classList.add('production-status');
for (const el of [studioHost.querySelector('.section-head'), $('quick-prepare'), $('generate'), $('themes'), $('save-design-zip'), $('save-photos-zip')]) if (el) el.hidden = true;
// Hide only the now-empty legacy preview heading/help, keeping their elements for compatibility.
const oldHeading = [...studioHost.querySelectorAll('.section-head')].find(el => el.querySelector('h2')?.textContent.includes('디자인 미리보기'));
if (oldHeading) oldHeading.hidden = true;
const oldHelp = [...studioHost.querySelectorAll(':scope > p.hint')].find(el => el.textContent.includes('각 시안')); if (oldHelp) oldHelp.hidden = true;
$('download-box').classList.add('production-downloads'); desk.append($('download-box'));
const platformButtons = new Map();
for (const key of ['carousel', 'naver', 'kakao', 'youtube', 'reels', 'shorts']) {
  const button = document.createElement('button'); button.type = 'button'; button.textContent = OUTPUT_PRESETS[key].label;
  button.onclick = () => { $('format').value = key; $('format').onchange(); };
  platformButtons.set(key, button); $('production-platforms').append(button);
}
function migrateProductionDesign() {
  if (state.productionDesignVersion === 2) return;
  state.brandOutput = { ...brandSettings(), position: 'top', fit: 'cover', tone: 'dark' };
  state.theme = state.theme === 'journal' ? 'journal' : 'editorial';
  state.productionDesignVersion = 2;
}
function productionSlides() {
  const titles = brandSettings().titles.split(/\r?\n/).filter(Boolean);
  return Array.from({ length: state.slideCount || 5 }, (_, i) => ({ ...state.brandSlides?.[i], title: titles[i] || state.title || '시공 기록' }));
}
function updateProductionSlide(patch) {
  if(Object.hasOwn(patch,"title"))state.brandStoryMode="manual";
  const slides = productionSlides(); slides[productionSlide] = { ...slides[productionSlide], ...patch };
  state.brandSlides = slides;
  state.brandOutput = { ...brandSettings(), titles: slides.map(s => s.title).join('\n') };
  window.signatureSlideEdited?.(productionSlide,patch);
  persist(); syncBrandControls(); renderProductionWorkspace();
}
$('production-title').onchange = e => updateProductionSlide({ title: e.target.value.trim() || '시공 기록' });
$('production-photo').onchange = e => updateProductionSlide({ photo: e.target.value });
$('production-kind').onchange = e => updateProductionSlide({ layout: e.target.value });
$('production-focus').oninput = e => updateProductionSlide({ focus: Number(e.target.value) / 100 });
function selectProductionSlide(index){
  const count=state.slideCount||5;productionSlide=(index+count)%count;
  state.productionView={...state.productionView,slide:productionSlide};
  persist();renderProductionWorkspace();
}
$('production-prev').onclick=()=>selectProductionSlide(productionSlide-1);
$('production-next').onclick=()=>selectProductionSlide(productionSlide+1);
// Only the running frame and the latest requested frame. No parallel render backlog.
function renderProductionWorkspace(){
  productionRevision++;renderRequested=true;
  if(!renderLoop)renderLoop=(async()=>{try{while(renderRequested){await new Promise(resolve=>setTimeout(resolve,24));renderRequested=false;await renderProductionFrame(productionRevision);}}finally{renderLoop=null;}})();
  return renderLoop;
}
async function renderProductionFrame(revision) {
  if (!easyReady || !writingReady) return;
  if (productionImportBusy) return;
  window.ensureSignatureProject?.();
  if(productionProject!==state.projectId){productionProject=state.projectId;productionSlide=Number.isInteger(state.productionView?.slide)?state.productionView.slide:0;}
  document.body.classList.toggle("has-site-photos",state.photos.length>0);
  $('package-drop').querySelector('strong').textContent=state.photos.length?'현장 사진 '+state.photos.length+'장':'01　현장 사진 불러오기';
  $('package-drop').querySelector('.package-picker').firstChild.textContent=state.photos.length?'사진·자료 바꾸기':'사진 또는 제작 ZIP 선택';
  document.body.classList.toggle("full-photo-mode",brandSettings().fit==="contain");
  window.updateCampaignSummary?.();
  migrateProductionDesign(); syncBrandControls();
  layoutSelect.value = ['editorial','gallery','journal'].includes(state.theme) ? state.theme : 'editorial';
  for (const [key, button] of platformButtons) { button.classList.toggle('active', key === state.format); button.setAttribute('aria-pressed', String(key === state.format)); }
  if (!state.photos.length || (state.photoLibrary && !state.signatureSequence?.length)) {
    for(const c of $('designs').querySelectorAll('canvas'))releaseCanvas(c);
    $('designs').textContent = '현장 사진을 불러오면 이곳에 시공 기록을 펼쳐드립니다.';
    window.resetPortfolioThumbs?.();$('production-filmstrip').replaceChildren();$('production-page').textContent='사진을 불러오세요';$('production-dimensions').textContent='';$('production-prev').disabled=$('production-next').disabled=true;
    $('designs').classList.add('production-empty'); return;
  }
  const count = state.slideCount || 5; productionSlide = Math.min(productionSlide, count - 1);
  const slides = productionSlides(), slide = slides[productionSlide];
  const photo = ProductionCore.matchPhoto(slide.photo, state.photos) || state.photos[productionSlide % state.photos.length];
  $('production-title').value = slide.title;
  $('production-photo').replaceChildren(...state.photos.map(p => new Option(p.name, p.name)));
  $('production-photo').value = photo.name;
  $('production-kind').value = slide.layout || 'auto';
  $('production-focus').value = (slide.focus ?? .45) * 100;
  $('production-page').textContent = `${String(productionSlide + 1).padStart(2, '0')} / ${String(count).padStart(2, '0')}`;
  $('production-page').setAttribute('aria-live','polite');$('production-prev').disabled=$('production-next').disabled=count<2;
  window.resetPortfolioThumbs?.();$('production-filmstrip').replaceChildren();
  let missing = 0;
  slides.forEach((item, i) => {
    const match = ProductionCore.matchPhoto(item.photo, state.photos);
    if (item.photo && !match) missing++;
    const p = match || state.photos[i % state.photos.length];
    const button = document.createElement('button'); button.className = i === productionSlide ? 'active' : '';
    button.setAttribute('aria-label', `${i + 1}번 사진 ${item.title}`); button.setAttribute('aria-pressed', String(i === productionSlide));
    const information=state.signatureDesign?.schema==='cheonginmaru-signature-v1'&&state.signatureSequence?.[i]?.role==='information';
    const img = document.createElement(information?'span':'img');
    if(information){img.className='signature-info-thumb';img.textContent='정보';}else{if(p.thumbnail)img.src=p.thumbnail;img.alt='';img.loading='lazy';img.decoding='async';img.width=96;img.height=72;}
    const number = document.createElement('span'); number.textContent = String(i + 1).padStart(2, '0');
    if(!information&&!p.thumbnail)window.ensurePortfolioThumb?.(img,p);
    button.append(img, number); button.onclick = () => selectProductionSlide(i); $('production-filmstrip').append(button);
  });
  const natural = state.format === 'naver' || (state.signatureDesign?.schema==='cheonginmaru-signature-v1'?state.signatureDesign.layout.fit==='contain':brandSettings().fit==='contain');
  $('production-crop-note').textContent = natural ? '사진 전체를 보존합니다. 원본 비율과 기존 보정 설정을 유지합니다.' : '플랫폼 비율에 맞춰 가장자리를 일부 자릅니다. 바닥·창이 잘리면 위 슬라이더로 구도를 옮기거나 전체 사진 보존을 선택하세요.';
  try {
    const canvas = await card(state.theme, productionSlide,state.format,false,{maxEdge:960});
    if (revision !== productionRevision) {canvas.width=canvas.height=1; return;}
    if(canvas.dataset.textTruncated)$('production-crop-note').textContent+=' 긴 문구는 이미지에서 줄여 표시합니다. 원고는 전체 문장을 유지합니다.';
    canvas.dataset.slide=productionSlide;canvas.tabIndex=0;canvas.setAttribute('role','button');canvas.setAttribute('title','사진 크게 보기');
    canvas.setAttribute('aria-label', `${OUTPUT_PRESETS[state.format].label} ${productionSlide + 1}번 출력 미리보기`);
    $('designs').classList.remove('production-empty'); for(const old of $('designs').querySelectorAll('canvas'))old.width=old.height=1; $('designs').replaceChildren(canvas);
    const comparison=canvas.dataset.renderer==='cheongin-signature-v1'?null:window.createPortfolioComparison?.(canvas);$('designs').classList.toggle('has-comparison',!!comparison);if(comparison){canvas.classList.add('output-proof');$('designs').append(comparison);}
    $('production-dimensions').textContent = `${canvas.dataset.exportWidth||canvas.width} × ${canvas.dataset.exportHeight||canvas.height} px`;
    easyStatus(missing ? `연결할 사진 ${missing}장이 없습니다. ‘사진 연결’에서 올바른 파일을 골라 주세요.` : `사진 ${state.photos.length}장 · ${OUTPUT_PRESETS[state.format].label} 준비 완료` , !!missing);
    const strip=$('production-filmstrip'),active=strip.querySelector('.active');if(active){const a=active.getBoundingClientRect(),r=strip.getBoundingClientRect();if(a.left<r.left)strip.scrollLeft+=a.left-r.left;else if(a.right>r.right)strip.scrollLeft+=a.right-r.right;}
    renderKey = generationKey();
    window.dispatchEvent(new CustomEvent('marketing:ready', { detail: { projectId: state.projectId } }));
  } catch (error) {
    if(revision!==productionRevision)return;for(const c of $('designs').querySelectorAll('canvas'))releaseCanvas(c);
    const retry=node('button','사진 다시 불러오기');retry.type='button';retry.onclick=renderProductionWorkspace;
    $('designs').replaceChildren(node('p','이 사진을 표시하지 못했습니다. 원본과 편집 내용은 유지됩니다.'),retry);$('designs').classList.add('production-empty');
    easyStatus('미리보기 실패 · ' + error.message, true);
  }
}
window.renderProductionWorkspace = renderProductionWorkspace;
generate = renderProductionWorkspace;
async function exportProductionPlatform() {
  const button = currentExport; button.disabled = true;
  const signatureBatch=window.signatureExportRenderer?.(),format=state.format,caption=platformCaption();
  try {
    if (!state.photos.length) throw Error('사진을 먼저 불러오세요.');
    const missing = productionSlides().filter(s => s.photo && !ProductionCore.matchPhoto(s.photo, state.photos));
    if (missing.length) throw Error('연결되지 않은 사진이 있습니다. 사진 연결을 확인해 주세요.');
    const files = [];
    for (let i = 0; i < (signatureBatch?.count || state.slideCount || 5); i++) {
      button.textContent = `${i + 1}/${state.slideCount || 5}장 저장 준비 중…`;
      const canvas = signatureBatch?await signatureBatch.render(i,format):await card(state.theme, i,format);
      try { files.push({ name: `${String(i + 1).padStart(2, '0')}-${canvas.width}x${canvas.height}.png`, blob: await canvasBlob(canvas) }); } finally { releaseCanvas(canvas); } await new Promise(resolve=>setTimeout(resolve,0));
    }
    files.push({ name: '캡션.txt', blob: new Blob([caption], { type: 'text/plain;charset=utf-8' }) });
    offerPhotoFiles(files);
    download(await storedZip(files), `청인마루_${format}.zip`);
    $('download-box').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (error) { toast(error.message); }
  finally { signatureBatch?.dispose();button.disabled = false; button.textContent = '선택한 플랫폼 사진 + 캡션 저장'; }
}
currentExport.onclick = exportProductionPlatform;
$('save-design-zip').onclick = exportProductionPlatform;
function fileAsDataURL(file) { return new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(Error('사진 읽기 실패')); reader.readAsDataURL(file); }); }
async function importProductionFiles(files) {
  if (productionImportBusy || !files.length) return;
  productionImportBusy = true; const status = $('production-import-status');
  $('production-files').disabled = true; status.dataset.error='false'; status.textContent = '자료를 확인하고 있습니다…';
  try {
    if (!easyReady || !writingReady) throw Error('저장된 작업을 불러오는 중입니다. 잠시 후 다시 선택하세요.');
    let source = [...files], kit;
    const zipFiles = source.filter(f => /\.zip$/i.test(f.name));
    if (zipFiles.length) {
      if (source.length !== 1) throw Error('ZIP은 하나씩 선택해 주세요.');
      if (zipFiles[0].size > 100 * 1024 * 1024) throw Error('ZIP은 100MB 이하로 넣어 주세요.');
      const entries = await ProductionCore.readZip(await zipFiles[0].arrayBuffer());
      const jsons = entries.filter(e => /(?:^|\/)(?:production|cheonginmaru-production)\.json$/i.test(e.name));
      if (jsons.length !== 1 || jsons[0].size > 150000) throw Error('ZIP 안에 production.json이 하나 필요합니다.');
      kit = CheonginBrandKit.parse(new TextDecoder().decode(await jsons[0].read()));
      const chosen = [];
      for (const slide of kit.slides) {
        const candidates = entries.filter(e => /\.(png|jpe?g|webp)$/i.test(e.name) && !/(?:^|\/)(?:before_originals|__MACOSX)\//i.test(e.name));
        const entry = ProductionCore.matchPhoto(slide.photo, candidates);
        if (!entry) throw Error(`사진을 찾지 못했습니다: ${slide.photo}`);
        if (!chosen.includes(entry)) chosen.push(entry);
      }
      source = [];
      for (const entry of chosen) {
        const bytes = await entry.read(), name = ProductionCore.basename(entry.name);
        source.push(new File([bytes], name, { type: /\.png$/i.test(name) ? 'image/png' : /\.webp$/i.test(name) ? 'image/webp' : 'image/jpeg' }));
      }
    } else {
      const jsons = source.filter(f => /\.json$/i.test(f.name));
      if (jsons.length > 1) throw Error('제작 설정 JSON은 하나만 선택하세요.');
      if (jsons[0]) { if (jsons[0].size > 150000) throw Error('제작 설정 파일이 너무 큽니다.'); kit = CheonginBrandKit.parse(await jsons[0].text()); }
      source = source.filter(f => !/\.json$/i.test(f.name));
    }
    if(source.reduce((n,f)=>n+f.size,0)>80*1024*1024)throw Error('현장 사진 합계 80MB 한도입니다.');
    if (source.length > 30) throw Error('사진은 30장 이하로 선택하세요.');
    if (!source.length && !kit) throw Error('사진, 제작 JSON 또는 제작 ZIP을 선택하세요.');
    const photos = [];
    for (const file of source) {
      if (!/\.(png|jpe?g|webp|heic|heif)$/i.test(file.name) || file.size > 20 * 1024 * 1024) throw Error('사진은 JPG·PNG·WebP·HEIC, 장당 20MB 이하입니다.');
      const src = await fileAsDataURL(file);
      const photo={id:crypto.randomUUID(),name:file.name,src,adjust:defaults(),approved:true,autoPrepared:true};
      try {await photoImage(photo);}catch(e){throw Error(/\.hei[cf]$/i.test(file.name)?'이 기기에서 HEIC를 읽을 수 없습니다. JPG로 내보내 선택해 주세요.':e.message+' '+file.name);}
      await analysePhoto(photo);
      photos.push(photo);
    }
    const available = photos.length ? photos : state.photos;
    if (kit && kit.slides.some(s => s.photo && !ProductionCore.matchPhoto(s.photo, available))) throw Error('문구와 연결할 사진이 없습니다. 사진과 JSON을 함께 선택하세요.');
    // Decode and validate everything first. A failed import never changes current work.
    if (photos.length && state.photos.length && !confirm('현재 사진을 새 제작 자료로 교체할까요? 필요한 기존 작업은 보관함에서 백업해 주세요.')) { status.textContent = '불러오기를 취소했습니다. 기존 작업을 유지합니다.'; return; }
    if (photos.length) { state.siteStage='unknown';const stage=$('campaign-stage');if(stage)stage.value='unknown';state.photos = photos; images.clear(); selected = 0; original = false; thumbnails(); }
    if (kit) {state.brandStoryMode="manual";delete state.brandStories;applyBrandKit(kit);}
    else if (photos.length) {
      state.slideCount = Math.max(3, Math.min(6, photos.length)); $('slide-count').value = String(state.slideCount);
      state.brandSlides = Array.from({ length: state.slideCount }, (_, i) => ({ photo: photos[i % photos.length].name, title: '시공 기록' }));
      state.brandOutput = { ...brandSettings(), titles: state.brandSlides.map(s => s.title).join('\n') };
      await window.prepareBrandStories?.({apply:true,resetPhotos:true});
    }
    window.signaturePhotoImport?.({kit:!!kit});if(kit?.signaturePackage)window.signatureImportPackage?.(kit.signaturePackage);
    state.usePreparedPhotos = true; persist(); syncBrandControls();
    productionSlide = 0;state.productionView={slide:0};
    status.textContent = `${photos.length || state.photos.length}장 사진${kit ? ' · 제품 규격 · 플랫폼별 캡션' : ''}을 불러왔습니다. 아래 미리보기에서 확인하세요.`;
  } catch (error) { status.dataset.error='true'; status.textContent = '불러오기 실패 · ' + error.message; }
  finally { productionImportBusy = false; $('production-files').disabled = false; $('production-files').value = ''; renderProductionWorkspace(); }
}
$('production-files').onchange = e => importProductionFiles([...e.target.files]);
const drop = $('package-drop');
for (const type of ['dragenter', 'dragover']) drop.addEventListener(type, e => { e.preventDefault(); drop.classList.add('dragging'); });
drop.addEventListener('dragleave', () => drop.classList.remove('dragging'));
drop.addEventListener('drop', e => { e.preventDefault(); drop.classList.remove('dragging'); importProductionFiles([...e.dataTransfer.files]); });
// Restore native slide controls when reopening a saved project.
const syncBeforeDesk = sync;
sync = function() { syncBeforeDesk(); queueMicrotask(renderProductionWorkspace); };
const applyBeforeDesk = $('brand-apply').onclick;
$('brand-apply').onclick = () => { applyBeforeDesk(); renderProductionWorkspace(); };
// The studio tab remains part of the existing app; start here only on a fresh install.
try { if (!localStorage.getItem('cheonginmaru-production-intro-v2')) {
  document.querySelector('[data-tab="studio"]').click();
  localStorage.setItem('cheonginmaru-production-intro-v2', 'seen');
} } catch {}
const deskBoot = setInterval(() => { if (easyReady && writingReady) { clearInterval(deskBoot); renderProductionWorkspace(); } }, 100);

window.importProductionFiles = importProductionFiles;
})();
