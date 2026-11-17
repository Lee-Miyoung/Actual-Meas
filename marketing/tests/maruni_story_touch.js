(() => {
  const out = document.getElementById('result'), run = document.getElementById('run'), frame = document.getElementById('editor');
  const wait = async predicate => { const end = Date.now() + 20000; while (!predicate()) { if (Date.now() > end) throw Error('UI 상태 대기 시간 초과'); await new Promise(r => setTimeout(r, 60)); } };
  run.onclick = async () => {
    run.disabled = true; const logs = []; let testId, api, d;
    const check = (ok, msg) => { if (!ok) throw Error(msg); logs.push('PASS · ' + msg); out.textContent = logs.join('\n'); };
    try {
      d = frame.contentDocument; await wait(() => /최근 프로젝트|현장 사진을 넣고/.test(d.getElementById('mr-status')?.textContent || ''));
      const w = frame.contentWindow, C = w.MaruniStoryCore; api = w.MaruniStoryStore; const root = d.getElementById('maruni-story'), q = id => d.getElementById(id), click = id => q(id).click(); root.open = true;
      const idle = () => wait(() => !root.hasAttribute('aria-busy'));
      click('mr-new'); await idle(); const name = 'UI 자동검증 ' + Date.now(); q('mr-name').value = name; q('mr-name').dispatchEvent(new w.Event('input', { bubbles: true })); click('mr-save'); await idle();
      let p = (await api.list()).find(p => p.name === name); check(!!p, '새 프로젝트 생성·이름 저장'); testId = p.id;
      const source = d.createElement('canvas'); source.width = 1080; source.height = 1350; const ctx = source.getContext('2d'); ctx.fillStyle = '#b58b5c'; ctx.fillRect(0, 0, source.width, source.height); const blob = await new Promise(r => source.toBlob(r));
      const dt = new w.DataTransfer(); for (let i = 0; i < 6; i++) dt.items.add(new w.File([blob], `scene-${i + 1}.png`, { type: 'image/png' })); q('mr-photo').files = dt.files; q('mr-photo').dispatchEvent(new w.Event('change', { bubbles: true })); await idle(); check(q('mr-scenes').querySelectorAll('img').length === 6, '사진 6장 입력 UI');
      q('mr-assets').querySelector('button').click(); await idle(); check(q('mr-layers').children.length === 1, '공식 PNG 목록에서 마루니 추가');
      click('mr-tab-ruru'); q('mr-assets').querySelector('button').click(); await idle(); check(q('mr-layers').children.length === 2, '동일 장면에 루루 추가');
      click('mr-bubble-add'); q('mr-bubble').value = '루루도 확인했다개!'; q('mr-bubble').dispatchEvent(new w.Event('input', { bubbles: true })); click('mr-save'); await idle();
      p = (await api.load(testId)).project; let a = p.scenes[0].layers.find(l => l.actor === 'ruru'); const bubble = p.scenes[0].layers.find(l => l.type === 'bubble'); check(bubble.speakerId === a.id && bubble.text === '루루도 확인했다개!', '말풍선 화자 연결·문구 저장');
      const canvas = q('mr-canvas'); canvas.setPointerCapture = () => {}; canvas.releasePointerCapture = () => {};
      const ptr = (type, id, x, y) => { const r = canvas.getBoundingClientRect(); canvas.dispatchEvent(new w.PointerEvent(type, { pointerId: id, pointerType: 'touch', clientX: r.left + x / 1080 * r.width, clientY: r.top + y / 1350 * r.height, bubbles: true })); };
      const settled = () => new Promise(r => w.requestAnimationFrame(() => w.requestAnimationFrame(() => setTimeout(r, 100))));
      await settled(); const b = C.actorBox(a), x = b.x + b.w * .4, y = b.y + b.h * .45;
      ptr('pointerdown', 1, x, y); ptr('pointerup', 1, x, y); click('mr-save'); await idle(); let next = (await api.load(testId)).project.scenes[0].layers.find(l => l.id === a.id); check(Math.abs(next.x - a.x) < .00001 && Math.abs(next.y - a.y) < .00001, '누르는 순간 캐릭터 위치가 튀지 않음');
      await settled(); ptr('pointerdown', 1, x, y); ptr('pointermove', 1, x - 108, y - 100); ptr('pointerup', 1, x - 108, y - 100); click('mr-save'); await idle(); next = (await api.load(testId)).project.scenes[0].layers.find(l => l.id === a.id); check(Math.abs(next.x - (a.x - .1)) < .00001, '손가락 이동량과 캐릭터 이동량 일치'); a = next;
      await settled(); const b2 = C.actorBox(a), cx = b2.x + b2.w / 2, cy = b2.y + b2.h / 2; ptr('pointerdown', 2, cx, cy); ptr('pointerdown', 3, cx + 80, cy); ptr('pointermove', 3, cx + 120, cy); ptr('pointercancel', 2, cx, cy); ptr('pointermove', 3, cx + 190, cy); click('mr-save'); await idle(); next = (await api.load(testId)).project.scenes[0].layers.find(l => l.id === a.id); check(Math.abs(next.width - a.width * 1.5) < .0001, '두 손가락 확대·취소 후 이동 중단');
      p = (await api.load(testId)).project; check(p.scenes[0].photo.zoom === 1 && p.scenes[0].photo.x === .5, '캐릭터 조작 중 사진 잠금 유지');
      q('mr-copy-target').value = '1'; w.confirm = () => true; click('mr-copy-scene'); q('mr-scenes').children[1].click(); const bubbleButton = [...q('mr-layers').children].find(b => b.textContent.includes('말풍선')); bubbleButton.click(); q('mr-bubble').value = '2컷만 수정'; q('mr-bubble').dispatchEvent(new w.Event('input', { bubbles: true })); click('mr-save'); await idle(); p = (await api.load(testId)).project;
      check(p.scenes[0].layers.find(l => l.type === 'bubble').text === '루루도 확인했다개!' && p.scenes[1].layers.find(l => l.type === 'bubble').text === '2컷만 수정', '장면 복제 후 문구 독립 편집');
      check(d.documentElement.scrollWidth <= w.innerWidth + 1, '820px 아이패드 폭에서 가로 넘침 없음');
      out.dataset.result = 'pass'; logs.push('COMPLETE · UI 자동 검증 통과 / 물리 아이패드 미검증');
    } catch (e) { out.dataset.result = 'fail'; logs.push('FAIL · ' + e.stack); }
    finally { if (testId) { frame.src = 'about:blank'; await new Promise(r => setTimeout(r, 100)); await api.remove(testId).catch(() => {}); } out.textContent = logs.join('\n'); run.disabled = false; }
  };
})();
