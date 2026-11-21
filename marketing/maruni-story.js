/* Maruni & Ruru: independent six-scene editor. Never mutates legacy state/functions. */
(() => {
  'use strict';
  const root = document.getElementById('maruni-story'); if (!root) return;
  const C = window.MaruniStoryCore, S = window.MaruniStoryStore, R = window.MaruniStoryRender, E = window.MaruniStoryExport;
  const $ = q => root.querySelector(q), el = (tag, text) => { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; return n; };
  $('.mr-body').innerHTML = `
    <div class="mr-projectbar">
      <input id="mr-name" maxlength="100" aria-label="프로젝트 이름" placeholder="현장 이야기 이름">
      <button id="mr-save" type="button">저장</button><button id="mr-new" type="button">새 프로젝트</button>
      <select id="mr-projects" aria-label="저장된 프로젝트"><option value="">저장된 프로젝트</option></select>
      <button id="mr-open" type="button">불러오기</button><button id="mr-project-copy" type="button">프로젝트 복제</button><button id="mr-project-delete" type="button">프로젝트 삭제</button>
    </div>
    <p id="mr-status" role="status" aria-live="polite">편집기를 준비하고 있습니다.</p>
    <div class="mr-grid">
      <div class="mr-stage">
        <div class="mr-quick-upload"><button id="mr-quick-photo" type="button">＋ 현장 사진 선택</button><button id="mr-touch-edit" type="button" aria-pressed="false">화면 스크롤 · 이동 끔</button><button id="mr-browse-maruni" type="button">마루니 포즈 보기</button><button id="mr-browse-ruru" type="button">루루 포즈 보기</button><button id="mr-open-locked" type="button">예전 4컷 프로젝트 열기</button><small id="mr-touch-help">사진 위에서 위아래로 밀면 화면이 움직입니다. 캐릭터 위치를 바꿀 때만 이동 모드를 켜 주세요. 4컷은 별도의 작업으로 저장됩니다.</small></div>
        <div class="mr-canvas-wrap"><canvas id="mr-canvas" width="648" height="810" aria-label="선택한 장면 미리보기. 캐릭터를 눌러 선택한 뒤 끌어 이동합니다."></canvas></div>
        <label>장면 구성 <select id="mr-layout"><option value="six">자유 6컷</option><option value="four">썸네일 + 본편 4컷</option></select></label><div id="mr-scenes" class="mr-scenes" aria-label="장면 선택"></div>
        <div class="mr-toolbar" style="margin-top:10px"><button id="mr-prev" type="button">앞 순서로</button><button id="mr-next" type="button">뒤 순서로</button><button id="mr-copy-scene" type="button">다른 컷에 복제</button><button id="mr-undo" type="button">뒤로 한 단계</button></div>
        <label>복제할 대상 컷<select id="mr-copy-target" aria-label="장면 복제 대상"></select></label>
        <p class="mr-note">캐릭터·말풍선을 눌러 선택하고 끌어 이동하세요. 선택한 항목은 두 손가락으로 크기를 바꿀 수 있습니다. 사진은 구도 보존을 위해 고정됩니다.</p>
      </div>
      <div class="mr-controls">
        <fieldset><legend>01 · 현장 사진</legend>
          <label>현재 컷부터 사진 넣기<input id="mr-photo" type="file" accept="image/png,image/jpeg,image/webp" multiple></label>
          <button id="mr-photo-all" type="button">현재 사진을 모든 컷에 사용</button>
          <button id="mr-photo-mode" type="button" aria-pressed="false">사진 조절 · 잠김</button>
          <label>사진 확대<input id="mr-photo-zoom" type="range" min="100" max="300" value="100" disabled></label>
          <button id="mr-photo-reset" type="button">사진 구도 초기화</button>
          <p class="mr-note">사진 전체를 원본 비율 그대로 유지합니다. 4:5 화면의 남는 부분은 여백으로 표시합니다.</p>
        </fieldset>
        <fieldset><legend>02 · 공식 캐릭터</legend>
          <div class="mr-toolbar"><button id="mr-tab-maruni" type="button" aria-pressed="true">마루니</button><button id="mr-tab-ruru" type="button" aria-pressed="false">루루</button></div>
          <label>포즈 찾기<input id="mr-search" type="search" placeholder="인사, 설명, 자재…"></label>
          <div class="mr-toolbar"><button id="mr-manage-poses" type="button" aria-pressed="false">목록 관리</button><button id="mr-add-another" type="button" aria-pressed="false">같은 캐릭터 추가</button><button id="mr-clean-duplicates" type="button">겹친 캐릭터 정리</button></div><p class="mr-note">포즈를 다시 탭하면 기존 캐릭터의 그림이 바뀝니다. 별도 인물이 필요할 때만 '같은 캐릭터 추가'를 켜세요.</p>
          <p id="mr-asset-count" class="mr-note"></p><div id="mr-assets" class="mr-assets"></div><div class="mr-toolbar"><button id="mr-asset-prev" type="button">이전 6개</button><span id="mr-asset-page" class="mr-note">1 / 1</span><button id="mr-asset-next" type="button">다음 6개</button></div>
          <label>보유한 원본 투명 PNG 추가<input id="mr-character" type="file" accept="image/png"></label>
        </fieldset>
        <fieldset><legend>03 · 캐릭터와 말풍선</legend>
          <div id="mr-layers" class="mr-layers" aria-label="현재 장면의 항목"></div>
          <label>선택한 항목 크기<input id="mr-size" type="range" min="8" max="90" value="30" disabled></label>
          <div class="mr-toolbar"><button id="mr-flip" type="button">좌우 반전</button><button id="mr-front" type="button">맨 앞으로</button><button id="mr-delete" type="button">선택 삭제</button><button id="mr-bubble-add" type="button">말풍선 추가</button></div>
          <label>말풍선 모양<select id="mr-format"><option value="legacy">기존 말풍선</option><option value="speech">대화</option><option value="thought">생각</option><option value="note">현장 설명</option><option value="none">없음</option></select></label><label>말풍선 화자<select id="mr-speaker" disabled></select></label>
          <label>말풍선 내용<textarea id="mr-bubble" rows="3" maxlength="180" placeholder="말풍선을 선택하거나 추가하세요" disabled></textarea></label>
          <div class="mr-toolbar"><button type="button" data-mr-phrase="결이 잘 보인다개!">결이 잘 보인다개!</button><button type="button" data-mr-phrase="여기도 확인했다개!">여기도 확인했다개!</button></div>
          <label>전체 컷 말풍선 글자 크기<input id="mr-font" type="range" min="24" max="64" value="38"></label>
          <p class="mr-note">좌우 반전하면 원본 명찰 글자도 함께 뒤집힙니다. 문구는 직접 확인한 뒤 저장하세요.</p>
        </fieldset>
      </div>
    </div>
    <div class="mr-export"><button id="mr-export-one" type="button">현재 컷 PNG</button><button id="mr-export-all" type="button" class="mr-primary">6컷 PNG · ZIP 준비</button><button id="mr-backup" type="button">편집 프로젝트 ZIP 백업</button><button id="mr-restore-button" type="button">프로젝트 ZIP 복원</button><input id="mr-restore" type="file" accept=".zip,application/zip" hidden></div>
    <p class="mr-note">이 기기 자동 저장 · 다른 기기에서 이어 작업할 때는 편집 프로젝트 ZIP을 옮겨 복원하세요. PNG 출력 ZIP은 편집 프로젝트와 다릅니다.</p>
    <dialog id="mr-result-dialog" aria-labelledby="mr-result-title"><h3 id="mr-result-title">저장할 파일이 준비됐어요</h3><div id="mr-result-actions" class="mr-toolbar"></div><div id="mr-results" class="mr-results"></div><button id="mr-result-close" type="button">닫기</button></dialog>`;
  let project = C.create(), media = new Map(), manifest = [], active = 0, selected = null, actorTab = 'maruni', photoMode = false, touchEdit = false;
  let history = [], revision = 0, savedRevision = -1, timer, saving = Promise.resolve(), busy = false, ready = false, paintFrame = 0;
  const cache = new Map(), thumbs = new Map(), resultURLs = [];
  let boxes = new Map();
  const hiddenPosePrefix = 'cheonginmaru-maruni-story:hidden-pose:';
  let managingPoses = false, assetPage = 0, initStarted = false, addAnotherActor = false;
  function isPoseHidden(id) {
    try { return localStorage.getItem(hiddenPosePrefix + id) === '1'; }
    catch { return false; }
  }
  function setPoseHidden(id, hidden) {
    try {
      if (hidden) localStorage.setItem(hiddenPosePrefix + id, '1');
      else localStorage.removeItem(hiddenPosePrefix + id);
      assets();
    } catch {
      status('이 기기에 목록 설정을 저장하지 못했습니다.', true);
    }
  }
  const scene = () => project.scenes[active], layer = () => scene().layers.find(l => l.id === selected);
  function status(text, error = false) { $('#mr-status').textContent = text; $('#mr-status').dataset.error = String(error); }
  function remember() { history.push(C.copy(project)); if (history.length > 30) history.shift(); $('#mr-undo').disabled = !history.length; }
  function changed() { revision++; project.updatedAt = new Date().toISOString(); clearTimeout(timer); status('변경됨 · 자동 저장 대기'); timer = setTimeout(() => save().catch(() => {}), 550); schedulePaint(); }
  function dispose(m) { if (m.image instanceof HTMLCanvasElement) m.image.width = m.image.height = 1; else m.image.src = ''; if (m.url) URL.revokeObjectURL(m.url); }
  function release() { for (const m of cache.values()) dispose(m); cache.clear(); thumbs.clear(); }
  async function decode(blob, full = false, previewLimit = 2048) {
    if (!(blob instanceof Blob) || !['image/png', 'image/jpeg', 'image/webp'].includes(blob.type) || !blob.size || blob.size > 25 * 1024 * 1024) throw Error('PNG·JPEG·WebP 이미지 25MB 이하를 선택하세요. HEIC 사진은 JPEG로 변환해 주세요.');
    const url = URL.createObjectURL(blob), image = new Image();
    try { await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(Error('이미지를 열 수 없습니다.')); image.src = url; }); if (image.width * image.height > 48000000 || Math.max(image.width, image.height) > 12000) throw Error('4800만 화소·한 변 12000px 이하 사진을 선택하세요.'); if (!full && Math.max(image.width, image.height) > previewLimit) { const scale = previewLimit / Math.max(image.width, image.height), preview = document.createElement('canvas'); preview.width = Math.round(image.width * scale); preview.height = Math.round(image.height * scale); preview.getContext('2d').drawImage(image, 0, 0, preview.width, preview.height); image.src = ''; URL.revokeObjectURL(url); return { image: preview, url: null }; } return { image, url }; }
    catch (e) { image.src = ''; URL.revokeObjectURL(url); throw e; }
  }
  function cacheImage(mid, decoded) {
    cache.set(mid, decoded);
    // 같은 장면의 캐릭터 5~6개를 고를 때 캐시 4개가 계속 지워져 매 프레임 다시 디코딩되는 현상 방지.
    const important=new Set(scene().layers.filter(l=>l.type==='actor').map(l=>l.mediaId));
    if(scene().photoId)important.add(scene().photoId);
    while(cache.size>8){
      const key=[...cache.keys()].find(id=>!important.has(id))||cache.keys().next().value;
      dispose(cache.get(key));cache.delete(key);
    }
  }
  async function image(mid) { if (cache.has(mid)) { const hit = cache.get(mid); cache.delete(mid); cache.set(mid, hit); return hit.image; } const m = media.get(mid); if (!m) throw Error('원본 이미지가 없습니다. 프로젝트를 다시 불러와 주세요.'); const actorPreview=scene().layers.some(l=>l.type==='actor'&&l.mediaId===mid); const decoded = await decode(m.blob,false,actorPreview?900:2048); m.dimensions = { width: decoded.image.width, height: decoded.image.height }; cacheImage(mid, decoded); return decoded.image; }
  async function addMedia(blob, name) {
    const total = [...media.values()].reduce((n, m) => n + m.blob.size, 0); if (total + blob.size > 240 * 1024 * 1024) throw Error('프로젝트 이미지 합계는 240MB까지입니다. 사진 용량을 줄여 주세요.');
    const decoded = await decode(blob), mid = C.id(); media.set(mid, { id: mid, name: name.slice(0, 250), blob, dimensions: { width: decoded.image.width, height: decoded.image.height } }); cacheImage(mid, decoded); return mid;
  }
  async function refreshProjects() {
    const list = await S.list(), select = $('#mr-projects'), previous = select.value; select.replaceChildren(new Option('저장된 프로젝트', ''));
    for (const p of list) select.add(new Option(p.name, p.id)); if (list.some(p => p.id === previous)) select.value = previous; else if (list.some(p => p.id === project.id)) select.value = project.id;
  }
  async function save() {
    clearTimeout(timer); if (!ready || savedRevision === revision) return saving;
    const p = C.validate(project), snapshot = new Map(media), rev = revision;
    saving = saving.catch(() => {}).then(async () => {
      await S.save(p, snapshot); if (project.id === p.id && revision === rev) { savedRevision = rev; status('이 기기에 저장됨 · ' + p.name); } await refreshProjects();
    });
    try { await saving; } catch (e) { status('저장 실패 · ' + e.message + ' · 프로젝트 ZIP으로 백업해 주세요.', true); throw e; }
  }
  async function flush() { clearTimeout(timer); await save(); await saving; }
  async function thumbnail(mid) {
    if (thumbs.has(mid)) return thumbs.get(mid);
    const im = await image(mid), c = document.createElement('canvas'); c.width = 96; c.height = 120;
    const b = C.fitPhoto(im.width, im.height, 96, 120, { x: .5, y: .5, zoom: 1 }); c.getContext('2d').drawImage(im, b.x, b.y, b.w, b.h);
    const src = c.toDataURL('image/jpeg', .65); c.width = c.height = 1; thumbs.set(mid, src); return src;
  }
  const sceneCount = () => project.layout === 'four' ? 5 : 6;
  const sceneLabel = i => project.layout === 'four' ? (i ? '본편 '+i+'컷' : '썸네일') : (i+1)+'컷';
  $('#mr-layout').onchange = e => {
    if (busy) return;
    remember(); project.layout=e.target.value; cancelGesture(); selected=null;
    changed(); render();
  };
  function renderScenes() {
    const holder = $('#mr-scenes'); holder.replaceChildren();
    project.scenes.slice(0, sceneCount()).forEach((s, i) => {
      const b = el('button'); b.type = 'button'; b.setAttribute('aria-pressed', String(i === active)); b.setAttribute('aria-label', sceneLabel(i)+' 선택');
      const label = el('span', sceneLabel(i)); b.append(label);
      if (s.photoId) { const im = el('img'); im.alt = ''; b.prepend(im); thumbnail(s.photoId).then(src => { if (b.isConnected) im.src = src; }).catch(e => status(e.message, true)); }
      else { const ph = el('span', '+'); ph.className = 'mr-empty-thumb'; b.prepend(ph); }
      b.onclick = () => { if (busy) return; cancelGesture(); active = i; selected = null; photoMode = false; render(); }; holder.append(b);
    });
    const target = $('#mr-copy-target'), old = target.value; target.replaceChildren();
    for (let i = 0; i < sceneCount(); i++) if (i !== active) target.add(new Option(sceneLabel(i), String(i))); if ([...target.options].some(o => o.value === old)) target.value = old;
    $('#mr-prev').disabled = active === 0; $('#mr-next').disabled = active === sceneCount()-1;
  }
  function controls() {
    const l = layer(), bubble = l?.type === 'bubble';
    previewTools.show(l?.type === 'actor' ? Math.round(l.width * 100) : null);
    const holder = $('#mr-layers'); holder.replaceChildren();
    for (const [i, item] of scene().layers.entries()) { const b = el('button', item.type === 'actor' ? (item.actor === 'maruni' ? '마루니' : '루루') : '말풍선 ' + (i + 1)); b.type = 'button'; b.setAttribute('aria-pressed', String(selected === item.id)); b.onclick = () => { if (busy) return; selected = item.id; photoMode = false; controls(); schedulePaint(); }; holder.append(b); }
    $('#mr-size').disabled = !l; $('#mr-size').value = Math.round((l?.width || .3) * 100);
    $('#mr-flip').disabled = l?.type !== 'actor' || !l.allowFlip; $('#mr-delete').disabled = $('#mr-front').disabled = !l;
    $('#mr-bubble-add').disabled = scene().layers.length >= 12;
    $('#mr-bubble').disabled = $('#mr-speaker').disabled = !bubble; $('#mr-bubble').value = bubble ? l.text : '';
    $('#mr-format').disabled=!bubble; $('#mr-format').value=bubble?(l.format||'legacy'):'speech';
    const sp = $('#mr-speaker'); sp.replaceChildren(new Option('화자 없음', ''));
    for (const a of scene().layers.filter(a => a.type === 'actor')) sp.add(new Option(a.actor === 'maruni' ? '마루니' : '루루', a.id)); sp.value = bubble ? l.speakerId || '' : '';
    $('#mr-photo-mode').hidden = true; $('#mr-photo-zoom').parentElement.hidden = true; $('#mr-photo-reset').hidden = true; $('#mr-photo-mode').setAttribute('aria-pressed', String(photoMode)); $('#mr-photo-mode').textContent = photoMode ? '사진 조절 · 켜짐' : '사진 조절 · 잠김'; $('#mr-photo-zoom').disabled = !photoMode || !scene().photoId; $('#mr-photo-zoom').value = Math.round(scene().photo.zoom * 100);
    $('#mr-undo').disabled = !history.length; $('#mr-font').value = project.style.fontSize;
  }
  function render() { active=Math.min(active,sceneCount()-1); $('#mr-layout').value=sceneCount()===5?'four':'six'; $('#mr-export-all').textContent=sceneCount()+'장 PNG · ZIP 준비'; $('#mr-name').value = project.name; renderScenes(); controls(); schedulePaint(); }
  function schedulePaint() { if (paintFrame) return; paintFrame = requestAnimationFrame(() => { paintFrame = 0; paint().catch(e => status(e.message, true)); }); }
  let painting = false, repaint = false;
  async function paint() {
    if (!root.open) return;
    if (painting) { repaint = true; return; } painting = true;
    try {
      // Render to a temporary canvas to prevent partially drawn asynchronous frames.
      const p = C.copy(project), s = p.scenes[active], chosen = selected, drawRevision = revision, c = document.createElement('canvas'); c.width = 648; c.height = 810;
      try { const next = await R.draw(c, p, s, image, { selected: chosen }); if (project.id === p.id && scene().id === s.id && revision === drawRevision && selected === chosen) { $('#mr-canvas').getContext('2d').drawImage(c, 0, 0); boxes = next; refreshActorTargets(); previewTools.refresh(); } else repaint = true; } finally { c.width = c.height = 1; }
    } finally { painting = false; if (repaint) { repaint = false; schedulePaint(); } }
  }
  function assets() {
    for(const actor of ['maruni','ruru']){
      const button=$('#mr-browse-'+actor);
      button.textContent=(actor==='maruni'?'마루니 ':'루루 ')+manifest.filter(a=>a.actor===actor&&a.status==='ready').length+'종 보기';
      button.onclick=()=>{if(busy)return;actorTab=actor;assetPage=0;$('#mr-search').value='';assets();$('#mr-assets').scrollIntoView({block:'center'});};
    }
    $('#mr-tab-maruni').setAttribute('aria-pressed', String(actorTab === 'maruni')); $('#mr-tab-ruru').setAttribute('aria-pressed', String(actorTab === 'ruru'));
    const all = manifest.filter(a => a.actor === actorTab), q = $('#mr-search').value.trim(), available = all.filter(a => a.status === 'ready');
    const hiddenCount = available.filter(a => isPoseHidden(a.id)).length;
    $('#mr-asset-count').textContent = managingPoses
      ? `등록 ${available.length}종 · 이 기기에서 숨김 ${hiddenCount}종`
      : `선택 가능 ${available.length - hiddenCount}종 · 숨김 ${hiddenCount}종`;
    const host = $('#mr-assets'); host.replaceChildren();
    const matching = all.filter(a => (a.label + ' ' + a.tags.join(' ')).includes(q) && (managingPoses || !isPoseHidden(a.id)) );
    const totalPages = Math.max(1, Math.ceil(matching.length / 6));
    assetPage = Math.max(0, Math.min(assetPage, totalPages-1));
    $('#mr-asset-page').textContent = (assetPage+1) + ' / ' + totalPages;
    $('#mr-asset-prev').disabled = assetPage === 0;
    $('#mr-asset-next').disabled = assetPage >= totalPages-1;
    for (const a of matching.slice(assetPage*6,assetPage*6+6)) {
      if (a.status !== 'ready') { const b = el('button', a.label + ' · 확인 필요'); b.type = 'button'; b.disabled = true; host.append(b); continue; }
      const hidden = isPoseHidden(a.id);
      if (hidden && !managingPoses) continue;
      const b = el('button'), im = el('img'); b.type = 'button'; im.src = a.path; im.alt = ''; im.loading = 'lazy'; b.dataset.assetId = a.id;
      if (managingPoses) {
        b.append(im, el('span', a.label + (hidden ? ' · 복원' : ' · 숨기기')));
        b.onclick = () => setPoseHidden(a.id, !isPoseHidden(a.id));
        host.append(b);
        continue;
      }
      b.append(im, el('span', a.label)); b.onclick = () => run(async () => {
        if (!scene().photoId) throw Error('현장 사진을 먼저 선택해 주세요. 사진 위에 캐릭터를 배치합니다.');
        const currentLayer=layer();
        const existing=addAnotherActor?null:
          (currentLayer?.type==='actor'&&currentLayer.actor===a.actor?currentLayer:
            [...scene().layers].reverse().find(l=>l.type==='actor'&&l.actor===a.actor));
        if (!existing && scene().layers.length >= 12) throw Error('한 컷에는 캐릭터·말풍선을 합해 12개까지 넣을 수 있습니다.');
        const resp = await fetch(a.path); if (!resp.ok) throw Error('캐릭터 원본을 불러오지 못했습니다.');
        const blob = await resp.blob();
        const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer()))].map(n => n.toString(16).padStart(2, '0')).join('');
        if (hash !== a.sha256) throw Error('캐릭터 원본 버전이 다릅니다. 새로고침 후 다시 선택하세요.');
        const mid=await addMedia(blob,a.label+'.png');
        remember();
        if(existing){
          const next=cache.get(mid).image;
          existing.mediaId=mid; existing.assetId=a.id; existing.assetVersion=1;
          existing.aspect=next.width/next.height; existing.allowFlip=a.allowFlip; existing.flipped=false;
          selected=existing.id;photoMode=false;
        }else addActor(mid,a.actor,a.id,a.allowFlip);
        addAnotherActor=false;
        $('#mr-add-another').setAttribute('aria-pressed','false');
        changed();render();
        status(existing?'기존 '+(a.actor==='maruni'?'마루니':'루루')+' 포즈를 바꿨습니다.':'캐릭터를 사진에 추가했습니다.');
      }); host.append(b);
    }
    if (!host.children.length) host.append(el('p', '일치하는 등록 원본이 없습니다.'));
  }
  function addActor(mid, actor, assetId, allowFlip) { const im = cache.get(mid).image, a = { id: C.id(), type: 'actor', mediaId: mid, actor, assetId, assetVersion: 1, aspect: im.width / im.height, allowFlip, x: actor === 'maruni' ? .25 : .75, y: .78, width: .32, flipped: false }; scene().layers.push(a); selected = a.id; photoMode = false; }
  async function run(fn) {
    if (busy || !ready) return;
    cancelGesture(); busy = true; root.setAttribute('aria-busy', 'true'); for (const group of root.querySelectorAll('.mr-grid,.mr-projectbar,.mr-export')) group.inert = true;
    try { await fn(); } catch (e) { status(e.message || '작업 중 오류가 발생했습니다.', true); }
    finally { busy = false; root.removeAttribute('aria-busy'); for (const group of root.querySelectorAll('.mr-grid,.mr-projectbar,.mr-export')) group.inert = false; }
  }
  async function switchProject(next, nextMedia, dirty = false) {
    cancelGesture(); release(); project = next; media = nextMedia; active = 0; selected = null; photoMode = false; history = []; revision++; savedRevision = dirty ? -1 : revision; render(); if (dirty) await save();
  }
  $('#mr-open-locked').onclick = () => run(async()=>{
    await flush();
    const locked=document.getElementById('maruni-locked-template');
    if(!locked)throw Error('4컷 고정 템플릿을 찾을 수 없습니다.');
    root.open=false;locked.open=true;
    locked.scrollIntoView({block:'start',behavior:'smooth'});
  });
  $('#mr-quick-photo').onclick = () => { if(!busy)$('#mr-photo').click(); };
  $('#mr-photo').onchange = e => run(async () => {
    const files = [...e.target.files]; e.target.value = ''; if (!files.length) return; if (files.length > sceneCount()) throw Error('사진은 한 번에 '+sceneCount()+'장까지 선택하세요.');
    touchEdit = false; updateTouchEdit();
    const targets = files.map((_, i) => (active + i) % sceneCount());
    if (targets.some(i => project.scenes[i].photoId) && !confirm('선택한 컷의 사진을 바꿀까요? 캐릭터와 말풍선은 유지합니다.')) return;
    const staged = [];
    for (const f of files) staged.push(await addMedia(f, f.name));
    remember(); staged.forEach((mid, i) => { project.scenes[targets[i]].photoId = mid; project.scenes[targets[i]].photo = { x: .5, y: .5, zoom: 1 }; }); changed(); render();
  });
  $('#mr-photo-all').onclick = () => { if (busy) return; if (!scene().photoId) { status('먼저 현장 사진을 넣어 주세요.', true); return; } if (project.scenes.slice(0,sceneCount()).some(s => s.photoId && s.photoId !== scene().photoId) && !confirm('전체 컷의 사진을 현재 사진으로 바꿀까요? 캐릭터와 대사는 유지합니다.')) return; remember(); const mid=scene().photoId; project.scenes.slice(0,sceneCount()).forEach(s => { s.photoId=mid; s.photo={x:.5,y:.5,zoom:1}; }); changed(); render(); };
  $('#mr-character').onchange = e => run(async () => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return; if (f.type !== 'image/png') throw Error('원본 투명 PNG를 선택하세요.');
    if (scene().layers.length >= 12) throw Error('한 컷 최대 12개입니다.');
    const mid = await addMedia(f, f.name), im = await image(mid), c = document.createElement('canvas'); c.width = c.height = 100; c.getContext('2d').drawImage(im, 0, 0, 100, 100); const px = c.getContext('2d').getImageData(0, 0, 100, 100).data; let transparent = false; for (let i = 3; i < px.length; i += 4) if (px[i] < 255) { transparent = true; break; } c.width = c.height = 1;
    if (!transparent) throw Error('투명 배경이 없는 PNG입니다. 공식 원본을 선택해 주세요.');
    remember(); addActor(mid, actorTab, 'user-original', true); changed(); render();
  });
  for (const actor of ['maruni', 'ruru']) $('#mr-tab-' + actor).onclick = () => { if (busy) return; actorTab = actor; assetPage=0; assets(); };
  $('#mr-search').oninput = () => {assetPage=0;assets();};
  $('#mr-asset-prev').onclick = () => {assetPage--;assets();};
  $('#mr-asset-next').onclick = () => {assetPage++;assets();};
  $('#mr-add-another').onclick=()=>{
    addAnotherActor=!addAnotherActor;
    $('#mr-add-another').setAttribute('aria-pressed',String(addAnotherActor));
    status(addAnotherActor?'다음 포즈 선택은 새로운 캐릭터를 한 명 더 추가합니다.':'같은 캐릭터는 기존 것을 교체합니다.');
  };
  $('#mr-clean-duplicates').onclick=()=>{
    if(busy)return;
    const actors=scene().layers.filter(l=>l.type==='actor'),keep=new Map();
    actors.forEach(l=>keep.set(l.actor,l));
    if(layer()?.type==='actor')keep.set(layer().actor,layer());
    const extras=actors.filter(l=>keep.get(l.actor)!==l);
    if(!extras.length){status('겹쳐진 같은 종류의 캐릭터가 없습니다.');return;}
    if(!confirm('이 컷에서 마루니·루루 각각 한 명만 남기고 '+extras.length+'개 중복 캐릭터를 정리할까요? 취소·되돌리기가 가능합니다.'))return;
    remember();
    const oldActors=new Map(actors.map(l=>[l.id,l.actor])),removed=new Set(extras.map(l=>l.id));
    scene().layers=scene().layers.filter(l=>!removed.has(l.id));
    for(const l of scene().layers){
      if(l.type==='bubble'&&removed.has(l.speakerId))l.speakerId=keep.get(oldActors.get(l.speakerId))?.id||null;
    }
    selected=null;changed();render();status('이 컷의 중복 캐릭터를 정리했습니다. 필요하면 되돌릴 수 있습니다.');
  };
  $('#mr-manage-poses').onclick = () => {
    managingPoses = !managingPoses;assetPage=0;
    $('#mr-manage-poses').setAttribute('aria-pressed', String(managingPoses));
    $('#mr-manage-poses').textContent = managingPoses ? '관리 마치기' : '목록 관리';
    assets();
  };
  window.addEventListener('storage', event => {
    if (event.key === null || event.key.startsWith(hiddenPosePrefix)) assets();
  });
  let renaming = false;
  $('#mr-name').oninput = e => { if (busy) { e.target.value = project.name; return; } if (!renaming) { remember(); renaming = true; } project.name = e.target.value.trim() || '현장 이야기'; changed(); };
  $('#mr-name').onblur = () => { renaming = false; };
  $('#mr-save').onclick = () => run(flush);
  $('#mr-new').onclick = () => run(async () => { await flush(); await switchProject(C.create(), new Map(), true); });
  $('#mr-open').onclick = () => run(async () => { const id = $('#mr-projects').value; if (!id) throw Error('불러올 프로젝트를 선택하세요.'); await flush(); const next = await S.load(id); await switchProject(next.project, next.media); status('프로젝트를 불러왔습니다.'); });
  $('#mr-project-copy').onclick = () => run(async () => { await flush(); const p = C.copy(project); p.id = C.id(); p.name = (p.name + ' · 복사').slice(0, 100); await switchProject(p, new Map(media), true); });
  $('#mr-project-delete').onclick = () => run(async () => { if (!confirm('현재 캐릭터 프로젝트를 삭제할까요? 필요한 작업은 ZIP으로 백업해 주세요.')) return; clearTimeout(timer); await saving.catch(() => {}); await S.remove(project.id); await switchProject(C.create(), new Map(), false); await refreshProjects(); status('프로젝트를 삭제했습니다.'); });
  $('#mr-photo-mode').onclick = () => { if (busy) return; photoMode = false; selected = null; cancelGesture(); controls(); schedulePaint(); };
  $('#mr-photo-reset').onclick = () => { if (busy) return; remember(); scene().photo = { x: .5, y: .5, zoom: 1 }; changed(); controls(); };
  function range(id, update) { let begun = false; const n = $(id); n.addEventListener('input', () => { if (busy) return; if (!begun) { remember(); begun = true; } update(Number(n.value)); changed(); }); n.addEventListener('change', () => { begun = false; }); n.addEventListener('blur', () => { begun = false; }); }
  range('#mr-photo-zoom', n => { if (photoMode) scene().photo.zoom = n / 100; });
  range('#mr-size', n => { if (layer()) layer().width = n / 100; });
  range('#mr-font', n => { project.style.fontSize = n; });
  $('#mr-flip').onclick = () => { const l = layer(); if (busy || l?.type !== 'actor' || !l.allowFlip) return; remember(); l.flipped = !l.flipped; changed(); };
  $('#mr-front').onclick = () => { const l = layer(); if (busy || !l) return; remember(); scene().layers = scene().layers.filter(a => a.id !== l.id); scene().layers.push(l); changed(); controls(); };
  $('#mr-delete').onclick = () => { if (busy || !layer()) return; remember(); const id = selected; scene().layers = scene().layers.filter(l => l.id !== id); for (const l of scene().layers) if (l.speakerId === id) l.speakerId = null; selected = null; changed(); controls(); };
  $('#mr-format').onchange=e=>{if(busy||layer()?.type!=='bubble')return;remember();layer().format=e.target.value;changed();};
  function addBubble() { if (scene().layers.length >= 12) throw Error('한 컷 최대 12개입니다.'); const a = layer()?.type === 'actor' ? layer() : scene().layers.find(l => l.type === 'actor'); const l = { id: C.id(), type: 'bubble', speakerId: a?.id || null, text: '', x: a ? (a.x < .5 ? .27 : .73) : .5, y: Math.min(.7, .18 + scene().layers.filter(l => l.type === 'bubble' && l.speakerId === (a?.id || null)).length * .22), width: a ? .46 : .7 }; scene().layers.push(l); selected = l.id; photoMode = false; }
  $('#mr-bubble-add').onclick = () => { if (busy) return; remember(); addBubble(); changed(); controls(); $('#mr-bubble').focus(); };
  let typingId = null;
  $('#mr-bubble').oninput = e => { if (busy || layer()?.type !== 'bubble') return; if (typingId !== selected) { remember(); typingId = selected; } layer().text = e.target.value; changed(); };
  $('#mr-bubble').onblur = () => { typingId = null; };
  $('#mr-speaker').onchange = e => { if (busy || layer()?.type !== 'bubble') return; remember(); layer().speakerId = e.target.value || null; changed(); };
  root.querySelectorAll('[data-mr-phrase]').forEach(b => b.onclick = () => { if (busy) return; remember(); if (layer()?.type !== 'bubble') addBubble(); layer().text = b.dataset.mrPhrase; changed(); controls(); });
  $('#mr-undo').onclick = () => { if (busy || !history.length) return; cancelGesture(); project = history.pop(); selected = null; changed(); render(); };
  for (const [id, direction] of [['#mr-prev', -1], ['#mr-next', 1]]) $(id).onclick = () => { if (busy || active + direction < 0 || active + direction > 5) return; remember(); const i = active + direction; [project.scenes[active], project.scenes[i]] = [project.scenes[i], project.scenes[active]]; active = i; changed(); render(); };
  $('#mr-copy-scene').onclick = () => { if (busy) return; const target = Number($('#mr-copy-target').value); if (target === active || target < 0 || target > 5) return; if ((project.scenes[target].photoId || project.scenes[target].layers.length) && !confirm(`${target + 1}컷을 현재 장면의 복사본으로 바꿀까요?`)) return; remember(); project.scenes[target] = C.duplicate(scene()); changed(); render(); };
  // Pointer capture, fixed drag offset, separate pinch targets and cancellation.
  const canvas = $('#mr-canvas'), points = new Map(); let gesture = null;
  const point = e => { const r = canvas.getBoundingClientRect(); return { x: (e.clientX - r.left) / r.width * R.W, y: (e.clientY - r.top) / r.height * R.H }; };
  function refreshActorTargets() {
    const host=canvas.parentElement;
    host.querySelectorAll('.mr-actor-target').forEach(el=>el.remove());
    if(photoMode || touchEdit)return;
    const cr=canvas.getBoundingClientRect(), hr=host.getBoundingClientRect();
    for(const actor of scene().layers.filter(l=>l.type==='actor')){
      const b=boxes.get(actor.id); if(!b)continue;
      const pad=document.createElement('div');
      pad.className='mr-actor-target';
      Object.assign(pad.style,{position:'absolute',touchAction:'none',left:(cr.left-hr.left+b.x*cr.width/R.W)+'px',top:(cr.top-hr.top+b.y*cr.height/R.H)+'px',width:b.w*cr.width/R.W+'px',height:b.h*cr.height/R.H+'px'});
      pad.onpointerdown=e=>beginPointer(e,true);
      host.append(pad);
    }
  }
  new ResizeObserver(refreshActorTargets).observe(canvas);
  const previewTools = window.maruniCanvasTools(canvas, {
    box(){const l=layer();return l?.type==='actor'?C.actorBox(l):null;},
    startMove(){
      const l=layer();if(busy||l?.type!=='actor')return;
      const b=C.actorBox(l), x=(b.x+b.w/2)/R.W,y=(b.y+b.h/2)/R.H;
      remember();return (dx,dy)=>{if(layer()!==l||busy)return;l.x=C.clamp(x+dx/R.W,0,1);l.y=C.clamp(y+dy/R.H,0,1);changed();};
    },
    anchor: canvas.parentElement, min: 8, max: 90,
    pick(e) {
      if (busy || photoMode) return;
      const p = point(e);
      const hit = [...scene().layers].reverse().find(l => {
        const b = boxes.get(l.id);
        return b && p.x >= b.x && p.x <= b.x+b.w && p.y >= b.y && p.y <= b.y+b.h;
      });
      selected = hit?.id || null;
      controls(); schedulePaint();
    },
    resize(value, type) {
      if (busy || layer()?.type !== 'actor') return;
      const slider = $('#mr-size');
      slider.value = value;
      slider.dispatchEvent(new Event(type));
    },
    remove() { if (layer()?.type === 'actor') $('#mr-delete').click(); }
  });
  const distance = () => { const [a, b] = [...points.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };
  function cancelGesture() { for (const pid of points.keys()) { try { canvas.releasePointerCapture(pid); } catch {} } points.clear(); gesture = null; }
  function updateTouchEdit(){
    canvas.dataset.touchEdit=String(touchEdit);refreshActorTargets();
    const button=$('#mr-touch-edit');
    button.setAttribute('aria-pressed',String(touchEdit));
    button.textContent=touchEdit?'캐릭터 이동 켜짐 · 손가락으로 옮기기':'배경 스크롤';
    $('#mr-touch-help').textContent=touchEdit
      ? '사진 위 캐릭터를 잡고 움직이세요. 아래 설정을 보려면 이동 모드를 끄세요.'
      : '사진 위를 위아래로 밀면 화면이 스크롤됩니다. 캐릭터는 바로 잡고 끌어 옮기세요.';
  }
  $('#mr-touch-edit').addEventListener('click',()=>{
    cancelGesture();touchEdit=!touchEdit;updateTouchEdit();
  });
  updateTouchEdit();
  canvas.addEventListener('pointerdown', e => beginPointer(e,false));
  function beginPointer(e, direct){
    if (busy || !ready || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (!direct && e.pointerType === 'touch' && !touchEdit) return; // 사진 위에서도 Safari 기본 세로 스크롤
    e.preventDefault(); const p = point(e);
    if (points.size >= 2) return;
    if (points.size === 0) {
      if (!photoMode) { const hit = [...scene().layers].reverse().find(l => { const b = boxes.get(l.id); return b && p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h; }); selected = hit?.id || null; }
      const target = photoMode && scene().photoId ? scene().photo : layer();
      if (!target) { controls(); schedulePaint(); return; }
      remember(); const b = !photoMode && boxes.get(target.id); if (b) { target.x = (b.x + b.w / 2) / R.W; target.y = (b.y + b.h / 2) / R.H; }
      gesture = { target, start: p, x: target.x, y: target.y, photo: photoMode };
    }
    points.set(e.pointerId, p); canvas.setPointerCapture(e.pointerId);
    if (points.size === 2 && gesture) { gesture.pinch = distance(); gesture.width = gesture.target.width; gesture.zoom = scene().photo.zoom; }
    controls(); schedulePaint();
  }
  canvas.addEventListener('pointermove', e => {
    if (!gesture || !points.has(e.pointerId) || busy) return;
    e.preventDefault(); const p = point(e); points.set(e.pointerId, p); const t = gesture.target;
    if (points.size === 2) {
      const factor = distance() / Math.max(1, gesture.pinch);
      if (gesture.photo) t.zoom = C.clamp(gesture.zoom * factor, 1, 3); else t.width = C.clamp(gesture.width * factor, .08, .9);
    } else if (gesture.photo) {
      const m = media.get(scene().photoId); const im = cache.get(scene().photoId)?.image || m?.dimensions; if (!im) return; const fit = C.fitPhoto(im.width, im.height, R.W, R.H, t);
      t.x = C.clamp(gesture.x - (p.x - gesture.start.x) / Math.max(1, fit.w - R.W), 0, 1); t.y = C.clamp(gesture.y - (p.y - gesture.start.y) / Math.max(1, fit.h - R.H), 0, 1);
    } else { t.x = C.clamp(gesture.x + (p.x - gesture.start.x) / R.W, 0, 1); t.y = C.clamp(gesture.y + (p.y - gesture.start.y) / R.H, 0, 1); }
    changed(); $('#mr-size').value = Math.round((t.width || .3) * 100); $('#mr-photo-zoom').value = Math.round(scene().photo.zoom * 100);
  });
  function endPointer(e) {
    if (!points.has(e.pointerId)) return; points.delete(e.pointerId);
    if (points.size === 1 && gesture) { const p = [...points.values()][0]; gesture.start = p; gesture.x = gesture.target.x; gesture.y = gesture.target.y; delete gesture.pinch; }
    else if (!points.size) gesture = null;
  }
  canvas.addEventListener('pointerup', e => {
    const remove = points.size === 1 && points.has(e.pointerId) && gesture?.target.type === 'actor' && previewTools.overTrash(e);
    endPointer(e);
    if (remove) $('#mr-delete').click();
  }); canvas.addEventListener('pointercancel', () => cancelGesture()); canvas.addEventListener('lostpointercapture', endPointer);
  root.addEventListener('toggle', () => { if (!root.open) { cancelGesture(); touchEdit=false;updateTouchEdit(); } else schedulePaint(); }); window.addEventListener('blur', cancelGesture);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelGesture(); if (ready) save().catch(() => {}); } }); window.addEventListener('pagehide', () => { if (ready) save().catch(() => {}); });
  function clearResults() { for (const url of resultURLs) URL.revokeObjectURL(url); resultURLs.length = 0; $('#mr-results').replaceChildren(); $('#mr-result-actions').replaceChildren(); }
  function showResults(blob, filename, files = []) {
    clearResults(); const actions = $('#mr-result-actions'), gallery = $('#mr-results');
    const link = el('a', filename.endsWith('.zip') ? 'ZIP 파일 저장' : 'PNG 파일 저장'), url = URL.createObjectURL(blob); resultURLs.push(url); link.href = url; link.download = filename; actions.append(link);
    const sharedFiles = files.map(f => new File([f.blob], f.name, { type: f.blob.type })); let canShare = false; try { canShare = sharedFiles.length && navigator.canShare?.({ files: sharedFiles }); } catch {}
    if (canShare) { const b = el('button', '공유 · 사진에 저장'); b.type = 'button'; b.onclick = async () => { try { await navigator.share({ files: sharedFiles, title: project.name }); } catch (e) { if (e.name !== 'AbortError') status('공유하지 못했습니다. PNG 또는 ZIP 파일 저장을 이용해 주세요.', true); } }; actions.append(b); }
    for (const f of files) { const figure = el('figure'), im = el('img'), a = el('a', f.name + ' 저장'), u = URL.createObjectURL(f.blob); resultURLs.push(u); im.src = a.href = u; im.alt = f.name; a.download = f.name; figure.append(im, a); gallery.append(figure); }
    $('#mr-result-dialog').showModal(); status('파일 준비 완료 · 저장 또는 공유 버튼을 눌러 주세요.');
  }
  $('#mr-result-close').onclick = () => $('#mr-result-dialog').close(); $('#mr-result-dialog').addEventListener('close', clearResults);
  let exportDecoded = null, exportId = null;
  async function exportImage(mid) { if (exportId === mid && exportDecoded) return exportDecoded.image; if (exportDecoded) dispose(exportDecoded); exportDecoded = null; exportId = null; const m = media.get(mid); if (!m) throw Error('출력할 원본이 없습니다.'); exportDecoded = await decode(m.blob, true); exportId = mid; return exportDecoded.image; }
  async function outputImages(p, indices) { try { return await E.images(p, exportImage, indices, status); } finally { if (exportDecoded) dispose(exportDecoded); exportDecoded = null; exportId = null; } }
  $('#mr-export-one').onclick = () => run(async () => { const p = C.copy(project), files = await outputImages(p, [active]); showResults(files[0].blob, E.name(p) + '_' + files[0].name, files); });
  $('#mr-export-all').onclick = () => run(async () => { const p = C.copy(project), files = await outputImages(p, Array.from({length:sceneCount()},(_,i)=>i)); status('ZIP 구성 중…'); showResults(await E.zip(files), E.name(p) + '_'+sceneCount()+'장.zip', files); });
  $('#mr-backup').onclick = () => run(async () => { const p = C.copy(project); status('사진과 편집 내용을 백업하는 중…'); showResults(await E.backup(p, media), E.name(p) + '_편집프로젝트.zip'); });
  $('#mr-restore-button').onclick = () => { if (!busy) $('#mr-restore').click(); };
  $('#mr-restore').onchange = e => run(async () => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; status('프로젝트 ZIP 확인 중…'); const next = await E.restore(f); const decoded = [];
    try { for (const m of next.media.values()) { const d = await decode(m.blob); dispose(d); } } finally { for (const d of decoded) dispose(d); }
    await flush(); await switchProject(next.project, next.media, true); status('별도 프로젝트로 복원했습니다.');
  });
  async function init() {
    if(initStarted)return;initStarted=true;
    try {
      const response = await fetch('assets/characters/manifest.json?v=20261118-poses', { cache: 'no-cache' }); if (!response.ok) throw Error('공식 캐릭터 목록을 불러오지 못했습니다.'); const data = await response.json(); manifest = data.assets; assets();
      const list = await S.list(); ready = true;
      if (list.length) { const next = await S.load(list[0].id); await switchProject(next.project, next.media); }
      else { savedRevision = revision; render(); }
      await refreshProjects(); status(list.length ? '최근 프로젝트를 불러왔습니다.' : '현장 사진을 넣고 공식 캐릭터를 골라 주세요.');
    } catch (e) { ready = true; render(); status(e.message + ' · 새 작업은 편집 프로젝트 ZIP으로 백업할 수 있습니다.', true); }
  }
  root.addEventListener('toggle', () => {if(root.open)init();});
  if(root.open)init();
})();
