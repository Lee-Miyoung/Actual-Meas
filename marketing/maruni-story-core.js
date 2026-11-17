/* Independent, versioned photo-story documents. No legacy application state. */
(function (host) {
  'use strict';
  const SCHEMA = 'cheonginmaru-photo-story-v1';
  const copy = value => JSON.parse(JSON.stringify(value));
  const id = () => globalThis.crypto.randomUUID();
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  function scene() { return { id: id(), photoId: null, photo: { x: .5, y: .5, zoom: 1 }, layers: [] }; }
  function create() { return { schema: SCHEMA, schemaVersion: 1, id: id(), name: '새 현장 이야기', updatedAt: new Date().toISOString(), style: { fontSize: 38, ink: '#332b26', paper: '#fffaf1' }, scenes: Array.from({ length: 6 }, scene) }; }
  function validate(p) {
    const fail = () => { throw Error('프로젝트 형식이 올바르지 않습니다.'); };
    const finite = (n, a, b) => typeof n === 'number' && Number.isFinite(n) && n >= a && n <= b;
    const key = s => typeof s === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(s);
    if (!p || p.schema !== SCHEMA || p.schemaVersion !== 1 || !key(p.id) || typeof p.name !== 'string' || p.name.length > 100 || !Array.isArray(p.scenes) || p.scenes.length !== 6) fail();
    if (!p.style || !finite(p.style.fontSize, 24, 64) || !/^#[a-f0-9]{6}$/i.test(p.style.ink) || !/^#[a-f0-9]{6}$/i.test(p.style.paper)) fail();
    const ids = new Set();
    for (const s of p.scenes) {
      if (!key(s.id) || ids.has(s.id) || (s.photoId !== null && !key(s.photoId)) || !s.photo || !finite(s.photo.x, 0, 1) || !finite(s.photo.y, 0, 1) || !finite(s.photo.zoom, 1, 3) || !Array.isArray(s.layers) || s.layers.length > 12) fail();
      ids.add(s.id);
      for (const l of s.layers) {
        if (!key(l.id) || ids.has(l.id) || !['actor', 'bubble'].includes(l.type) || !finite(l.x, 0, 1) || !finite(l.y, 0, 1) || !finite(l.width, .08, .9)) fail();
        ids.add(l.id);
        if (l.type === 'actor' && (!key(l.mediaId) || !['maruni', 'ruru'].includes(l.actor) || typeof l.flipped !== 'boolean' || typeof l.allowFlip !== 'boolean' || !finite(l.aspect, .05, 20) || typeof l.assetId !== 'string' || l.assetId.length > 100 || l.assetVersion !== 1)) fail();
        if (l.type === 'bubble' && (typeof l.text !== 'string' || l.text.length > 180 || (l.speakerId !== null && !key(l.speakerId)))) fail();
      }
      for (const l of s.layers) if (l.type === 'bubble' && l.speakerId && !s.layers.some(a => a.id === l.speakerId && a.type === 'actor')) fail();
    }
    return copy(p);
  }
  function mediaIds(p) { return [...new Set(p.scenes.flatMap(s => [s.photoId, ...s.layers.filter(l => l.type === 'actor').map(l => l.mediaId)]).filter(Boolean))]; }
  function duplicate(s) {
    const next = copy(s), mapping = new Map(); next.id = id();
    for (const l of next.layers) { const old = l.id; l.id = id(); mapping.set(old, l.id); }
    for (const l of next.layers) if (l.type === 'bubble' && l.speakerId) l.speakerId = mapping.get(l.speakerId) || null;
    return next;
  }
  function fitPhoto(iw, ih, w, h, p) { const r = Math.min(w / iw, h / ih), pw = iw * r, ph = ih * r; return { x: (w-pw)/2, y: (h-ph)/2, w: pw, h: ph }; }
  function actorBox(l, w = 1080, h = 1350) {
    const cw = Math.min(w * l.width, (h - 20) * l.aspect), ch = cw / l.aspect;
    return { x: clamp(l.x * w - cw / 2, 0, w - cw), y: clamp(l.y * h - ch / 2, 0, h - ch), w: cw, h: ch };
  }
  function wrap(text, measure, width) {
    const lines = [];
    for (const paragraph of text.split('\n')) {
      let line = '';
      for (const c of Array.from(paragraph)) {
        if (line && measure(line + c) > width) { lines.push(line); line = c; } else line += c;
      }
      lines.push(line);
    }
    return lines;
  }
  host.MaruniStoryCore = { SCHEMA, create, scene, validate, copy, id, clamp, mediaIds, duplicate, fitPhoto, actorBox, wrap };
  if (typeof module !== 'undefined') module.exports = host.MaruniStoryCore;
})(typeof window !== 'undefined' ? window : globalThis);
