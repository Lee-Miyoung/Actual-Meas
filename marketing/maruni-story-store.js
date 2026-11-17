/* Deliberately separate DB; never upgrades or writes cheonginmaru-marketing-v1. */
(() => {
  'use strict';
  const C = window.MaruniStoryCore;
  let opening;
  const open = () => opening || (opening = new Promise((resolve, reject) => {
    const r = indexedDB.open('cheonginmaru-maruni-story-v1', 1);
    r.onupgradeneeded = () => { r.result.createObjectStore('projects', { keyPath: 'id' }); r.result.createObjectStore('media', { keyPath: ['projectId', 'id'] }).createIndex('projectId', 'projectId'); };
    r.onsuccess = () => { r.result.onversionchange = () => { r.result.close(); opening = null; }; resolve(r.result); };
    r.onerror = () => { opening = null; reject(r.error); };
    r.onblocked = () => { opening = null; reject(Error('다른 창을 닫고 저장을 다시 눌러 주세요.')); };
  }));
  const request = r => new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
  const complete = t => new Promise((resolve, reject) => { t.oncomplete = resolve; t.onabort = t.onerror = () => reject(t.error || Error('저장 중단')); });
  async function save(project, media) {
    const p = C.validate(project), db = await open(), tx = db.transaction(['projects', 'media'], 'readwrite'), done = complete(tx);
    tx.objectStore('projects').put(p);
    const referenced = new Set(C.mediaIds(p)), store = tx.objectStore('media');
    for (const mid of referenced) { const m = media.get(mid); if (!m || !(m.blob instanceof Blob)) { tx.abort(); await done; } const get = store.getKey([p.id, mid]); get.onsuccess = () => { if (!get.result) store.put({ id: mid, projectId: p.id, name: m.name, blob: m.blob }); }; }
    const cursor = store.index('projectId').openCursor(IDBKeyRange.only(p.id));
    cursor.onsuccess = () => { const c = cursor.result; if (!c) return; if (!referenced.has(c.value.id)) c.delete(); c.continue(); };
    await done;
  }
  async function list() { const db = await open(); return (await request(db.transaction('projects').objectStore('projects').getAll())).sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt))); }
  async function load(id) {
    const db = await open(), tx = db.transaction(['projects', 'media']), store = tx.objectStore('media');
    // Queue all reads synchronously while the transaction is active.
    const pPromise = request(tx.objectStore('projects').get(id));
    const mediaPromise = request(store.index('projectId').getAll(id));
    const [raw, rows] = await Promise.all([pPromise, mediaPromise]);
    if (!raw) throw Error('저장된 프로젝트를 찾지 못했습니다.');
    const project = C.validate(raw), map = new Map(rows.filter(r => r.projectId === id).map(r => [r.id, r]));
    for (const mid of C.mediaIds(project)) if (!map.has(mid)) throw Error('프로젝트 사진이 누락되었습니다. 백업을 확인해 주세요.');
    return { project, media: map };
  }
  async function remove(id) {
    const db = await open(), tx = db.transaction(['projects', 'media'], 'readwrite'), done = complete(tx);
    tx.objectStore('projects').delete(id);
    const req = tx.objectStore('media').openCursor();
    req.onsuccess = () => { const c = req.result; if (!c) return; if (c.value.projectId === id) c.delete(); c.continue(); };
    await done;
  }
  window.MaruniStoryStore = { save, list, load, remove };
})();
