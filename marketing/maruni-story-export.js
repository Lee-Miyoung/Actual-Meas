(() => {
  'use strict';
  const C = window.MaruniStoryCore, R = window.MaruniStoryRender;
  const LIMIT = 240 * 1024 * 1024, ITEM_LIMIT = 25 * 1024 * 1024;
  const encode = o => new TextEncoder().encode(JSON.stringify(o));
  const name = p => (p.name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').trim() || '현장이야기').slice(0, 60);
  function png(canvas) { return new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(Error('PNG 생성 실패')), 'image/png')); }
  async function images(project, image, indices, progress = () => {}) {
    C.validate(project); const files = [];
    for (const index of indices) {
      const s = project.scenes[index]; if (!s?.photoId) throw Error(`${index + 1}컷에 현장 사진을 넣어 주세요.`);
    }
    const c = document.createElement('canvas'); c.width = R.W; c.height = R.H;
    try {
      for (const index of indices) {
        progress(`${index + 1}컷 PNG 준비 중…`); await R.draw(c, project, project.scenes[index], image);
        files.push({ name: `${String(index + 1).padStart(2, '0')}.png`, blob: await png(c) });
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    } finally { c.width = c.height = 1; }
    return files;
  }
  async function zip(files) {
    const entries = Object.create(null);
    for (const f of files) entries[f.name] = [new Uint8Array(await f.blob.arrayBuffer()), { level: 0 }];
    return new Promise((resolve, reject) => fflate.zip(entries, (e, bytes) => e ? reject(e) : resolve(new Blob([bytes], { type: 'application/zip' }))));
  }
  async function backup(project, media) {
    const p = C.validate(project), entries = [{ name: 'project.json', blob: new Blob([encode(p)], { type: 'application/json' }) }], index = [];
    let bytes = 0;
    for (const mid of C.mediaIds(p)) {
      const m = media.get(mid); if (!m) throw Error('원본 이미지가 누락되었습니다.');
      bytes += m.blob.size; if (bytes > LIMIT) throw Error('프로젝트가 너무 큽니다. 사진 용량을 줄여 주세요.');
      const path = `media/${mid}`;
      entries.push({ name: path, blob: m.blob }); index.push({ id: mid, name: m.name, mime: m.blob.type, path });
    }
    entries.push({ name: 'media.json', blob: new Blob([encode(index)], { type: 'application/json' }) });
    return zip(entries);
  }
  async function restore(file) {
    if (file.size > LIMIT) throw Error('240MB 이하 프로젝트 ZIP을 선택하세요.');
    const bytes = new Uint8Array(await file.arrayBuffer()); let total = 0, count = 0;
    const entries = await new Promise((resolve, reject) => fflate.unzip(bytes, { filter: entry => {
      const size = entry.originalSize;
      if (!Number.isSafeInteger(size) || size < 0 || size > ITEM_LIMIT || (total += size) > LIMIT || ++count > 100 || !/^(project\.json|media\.json|media\/[A-Za-z0-9_-]{1,100})$/.test(entry.name)) { reject(Error('지원하지 않는 ZIP 구성 또는 용량입니다.')); return false; }
      return true;
    } }, (e, files) => e ? reject(e) : resolve(files)));
    if (!entries['project.json'] || !entries['media.json'] || entries['project.json'].length > 300000 || entries['media.json'].length > 100000) throw Error('편집용 프로젝트 ZIP이 아닙니다.');
    const decode = b => JSON.parse(new TextDecoder().decode(b));
    const project = C.validate(decode(entries['project.json'])), rows = decode(entries['media.json']), media = new Map();
    if (!Array.isArray(rows) || rows.length > 80) throw Error('이미지 목록 오류');
    for (const row of rows) {
      if (!row || !/^[A-Za-z0-9_-]{1,100}$/.test(row.id) || row.path !== `media/${row.id}` || !['image/png', 'image/jpeg', 'image/webp'].includes(row.mime) || typeof row.name !== 'string' || row.name.length > 250 || !entries[row.path] || media.has(row.id)) throw Error('프로젝트 이미지 형식 오류');
      media.set(row.id, { id: row.id, name: row.name, blob: new Blob([entries[row.path]], { type: row.mime }) });
    }
    for (const mid of C.mediaIds(project)) if (!media.has(mid)) throw Error('프로젝트 이미지가 누락되었습니다.');
    // Always restore as a separate project; never overwrite an existing record.
    project.id = C.id(); project.name = (project.name + ' · 복원').slice(0, 100); project.updatedAt = new Date().toISOString();
    return { project, media };
  }
  window.MaruniStoryExport = { images, zip, backup, restore, name };
})();
