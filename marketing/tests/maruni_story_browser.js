/* Real browser integration checks with disposable, random-ID projects only. */
(async () => {
  const button = document.getElementById('run'), output = document.getElementById('result');
  button.onclick = async () => {
    button.disabled = true; const logs = [], cleanup = [], urls = [];
    const check = (ok, text) => { if (!ok) throw Error(text); logs.push('PASS · ' + text); output.textContent = logs.join('\n'); };
    const C = MaruniStoryCore, S = MaruniStoryStore, R = MaruniStoryRender, E = MaruniStoryExport;
    try {
      // Modules resolve font relative to the main marketing page; this test page lives one level deeper.
      const base = document.createElement('base'); base.href = new URL('../', location.href).href; document.head.prepend(base);
      const legacyBefore = await legacy(), quotesBefore = localStorage.getItem('cm_v20_records');
      const p = C.create(); cleanup.push(p.id); p.name = '자동 검증 · 임시 프로젝트';
      const source = document.createElement('canvas'); source.width = 1080; source.height = 1350;
      const ctx = source.getContext('2d'); ctx.fillStyle = '#b38c5a'; ctx.fillRect(0, 0, 1080, 1350); ctx.fillStyle = '#d8d1be'; ctx.fillRect(0, 0, 1080, 600);
      for (let x = 0; x < 1080; x += 80) { ctx.fillStyle = x % 160 ? '#9c7549' : '#b18b60'; ctx.fillRect(x, 600, 2, 750); }
      const blob = await new Promise(r => source.toBlob(r, 'image/png')), mid = C.id(), media = new Map([[mid, { id: mid, name: '테스트사진.png', blob }]]);
      const url = URL.createObjectURL(blob); urls.push(url); const im = new Image(); im.src = url; await im.decode(); const image = async id => { if (id !== mid) throw Error('알 수 없는 이미지'); return im; };
      for (const s of p.scenes) s.photoId = mid;
      const a = { id: C.id(), type: 'actor', mediaId: mid, actor: 'ruru', assetId: 'test-only', assetVersion: 1, aspect: .8, width: .2, x: .8, y: .8, flipped: false, allowFlip: true };
      p.scenes[0].layers.push(a, { id: C.id(), type: 'bubble', speakerId: a.id, text: '마루의 색과 결을 그대로\n확인했다개!', x: .5, y: .2, width: .7 });
      await S.save(p, media); const loaded = await S.load(p.id); check(JSON.stringify(p) === JSON.stringify(loaded.project), '사진·6컷·위치·말풍선 저장 복원');
      check((await loaded.media.get(mid).blob.arrayBuffer()).byteLength === blob.size, '원본 Blob 보관');
      const twin = C.copy(p); twin.id = C.id(); cleanup.push(twin.id); const changedBlob = new Blob([await blob.arrayBuffer()], { type: 'image/png' }); await S.save(twin, new Map([[mid, { id: mid, name: '복제사진.png', blob: changedBlob }]]));
      check((await S.load(p.id)).media.get(mid).name === '테스트사진.png', '프로젝트 복제의 미디어 저장 독립성');
      await S.remove(twin.id); check((await S.load(p.id)).project.id === p.id, '복사본 삭제 후 원래 프로젝트 유지');
      const backup = await E.backup(p, media), restored = await E.restore(new File([backup], '편집프로젝트.zip'));
      check(restored.project.id !== p.id && restored.project.scenes[0].layers[1].text === p.scenes[0].layers[1].text, '프로젝트 ZIP 복원은 별도 프로젝트');
      check(await digest(restored.media.get(mid).blob) === await digest(blob), '프로젝트 ZIP의 원본 바이트 일치');
      await S.save(restored.project, restored.media); cleanup.push(restored.project.id); check((await S.load(restored.project.id)).project.scenes.length === 6, '복원 프로젝트 재저장 가능');
      const proof = document.getElementById('proof'); await R.draw(proof, p, p.scenes[1], image); const pixels = proof.getContext('2d').getImageData(0, 0, 1080, 1350).data, original = ctx.getImageData(0, 0, 1080, 1350).data; let equal = true; for (let i = 0; i < pixels.length; i++) if (pixels[i] !== original[i]) { equal = false; break; }
      check(equal, '캐릭터 없는 사진의 모든 픽셀 보존');
      const files = await E.images(p, image, [0, 1, 2, 3, 4, 5]); check(files.length === 6, '6컷 PNG 순차 생성');
      for (const f of files) { const bitmap = await createImageBitmap(f.blob); check(bitmap.width === 1080 && bitmap.height === 1350, f.name + ' 1080×1350'); bitmap.close(); }
      const zip = await E.zip(files), entries = fflate.unzipSync(new Uint8Array(await zip.arrayBuffer())); check(Object.keys(entries).join(',') === '01.png,02.png,03.png,04.png,05.png,06.png', 'PNG ZIP 파일 순서');
      await R.draw(proof, p, p.scenes[0], image); check(proof.toDataURL().startsWith('data:image/png'), '한글 말풍선 공통 렌더러 출력');
      let rejected = false; try { await E.restore(new File([await E.zip([{ name: '../escape', blob: new Blob(['x']) }])], 'bad.zip')); } catch { rejected = true; } check(rejected, '잘못된 ZIP 경로 거부');
      const invalid = C.copy(p); invalid.scenes[0].photoId = null; rejected = false; try { await E.images(invalid, image, [0]); } catch { rejected = true; } check(rejected, '사진 없는 컷 출력 차단');
      check(JSON.stringify(await legacy()) === JSON.stringify(legacyBefore) && quotesBefore === localStorage.getItem('cm_v20_records'), '기존 마케팅·견적 저장 데이터 불변');
      output.dataset.result = 'pass'; logs.push('COMPLETE · 모든 통합 검증 통과');
    } catch (e) { output.dataset.result = 'fail'; logs.push('FAIL · ' + e.stack); }
    finally { for (const id of cleanup) await S.remove(id).catch(() => {}); for (const u of urls) URL.revokeObjectURL(u); output.textContent = logs.join('\n'); button.disabled = false; }
  };
  async function digest(b) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await b.arrayBuffer()))).join(','); }
  async function legacy() {
    if (indexedDB.databases && !(await indexedDB.databases()).some(d => d.name === 'cheonginmaru-marketing-v1')) return null;
    return new Promise((resolve, reject) => { const r = indexedDB.open('cheonginmaru-marketing-v1'); r.onerror = () => reject(r.error); r.onsuccess = () => { const db = r.result; if (!db.objectStoreNames.contains('projects')) { db.close(); resolve(null); return; } const get = db.transaction('projects').objectStore('projects').getAll(); get.onsuccess = () => { db.close(); resolve(get.result); }; get.onerror = () => { db.close(); reject(get.error); }; }; });
  }
})();
