/* Layout geometry and bounded, local-only ZIP import. */
(function(root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.ProductionCore = factory();
})(globalThis, function() {
  'use strict';
  function crop(iw, ih, w, h, focus = .5) {
    const scale = Math.max(w / iw, h / ih);
    const sw = w / scale, sh = h / scale;
    return { sx: (iw - sw) / 2, sy: (ih - sh) * Math.max(0, Math.min(1, Number(focus) || 0)), sw, sh };
  }
  function basename(name) { return name.replace(/\\/g, '/').split('/').pop(); }
  function matchPhoto(name, photos) {
    if (!name) return null;
    const exact = photos.filter(p => basename(p.name) === basename(name));
    if (exact.length) return exact.length === 1 ? exact[0] : null;
    const stem = s => basename(s).replace(/\.(?:png|jpe?g|webp)$/i, '').toLowerCase();
    const matches = photos.filter(p => stem(p.name) === stem(name));
    return matches.length === 1 ? matches[0] : null;
  }
  async function readZip(buffer) {
    const b = new Uint8Array(buffer), v = new DataView(buffer);
    if (b.length > 100 * 1024 * 1024) throw Error('ZIP은 100MB 이하로 넣어 주세요.');
    let end = -1;
    for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) {
      if (v.getUint32(i, true) === 0x06054b50 && i + 22 + v.getUint16(i + 20, true) === b.length) { end = i; break; }
    }
    if (end < 0) throw Error('ZIP 파일 형식을 확인해 주세요.');
    if (v.getUint16(end + 4, true) || v.getUint16(end + 6, true)) throw Error('분할 ZIP은 지원하지 않습니다.');
    const count = v.getUint16(end + 10, true);
    if (count > 100 || count !== v.getUint16(end + 8, true)) throw Error('파일이 너무 많거나 지원하지 않는 ZIP입니다.');
    let at = v.getUint32(end + 16, true), total = 0;
    const entries = [], names = new Set();
    for (let i = 0; i < count; i++) {
      if (at + 46 > end || v.getUint32(at, true) !== 0x02014b50) throw Error('손상된 ZIP 목록입니다.');
      const flags = v.getUint16(at + 8, true), method = v.getUint16(at + 10, true);
      const compressed = v.getUint32(at + 20, true), size = v.getUint32(at + 24, true);
      const length = v.getUint16(at + 28, true), extra = v.getUint16(at + 30, true), comment = v.getUint16(at + 32, true);
      const local = v.getUint32(at + 42, true), checksum = v.getUint32(at + 16, true);
      if (at + 46 + length + extra + comment > end) throw Error('손상된 ZIP 파일입니다.');
      const name = new TextDecoder().decode(b.slice(at + 46, at + 46 + length));
      at += 46 + length + extra + comment;
      if (/\/$/.test(name) || /(?:^|\/)__MACOSX\//.test(name)) continue;
      if (flags & 1 || ![0, 8].includes(method)) throw Error('암호 ZIP 또는 지원하지 않는 압축입니다.');
      total += size;
      if (size > 21 * 1024 * 1024 || total > 180 * 1024 * 1024) throw Error('압축 해제 용량이 너무 큽니다.');
      if (names.has(name)) throw Error('중복 파일명이 있는 ZIP입니다.');
      names.add(name);
      if (local + 30 > end || v.getUint32(local, true) !== 0x04034b50) throw Error('손상된 ZIP 내용입니다.');
      const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
      if (start + compressed > end) throw Error('잘린 ZIP 파일입니다.');
      entries.push({ name, size, method, checksum, bytes: b.slice(start, start + compressed) });
    }
    // Inflate only requested files and cap actual output, not just advertised size.
    for (const e of entries) e.read = async function() {
      let bytes = e.bytes;
      if (e.method === 8) {
        let decompressor;
        try { if (typeof DecompressionStream !== 'undefined') decompressor = new DecompressionStream('deflate-raw'); } catch { /* Safari 16/17: local fallback below. */ }
        if (!decompressor) {
          const codec = typeof fflate !== 'undefined' ? fflate : typeof require === 'function' ? require('./vendor/fflate-0.8.2.js') : null;
          if (!codec) throw Error('ZIP을 풀어 사진과 JSON을 함께 선택해 주세요.');
          const parts=[]; let length=0;
          const inflater=new codec.Inflate((part)=>{length+=part.length;if(length>e.size||length>21*1024*1024)throw Error('ZIP 실제 용량이 올바르지 않습니다.');parts.push(part);});
          for(let offset=0;offset<bytes.length;offset+=1024)inflater.push(bytes.subarray(offset,offset+1024),offset+1024>=bytes.length);
          bytes=new Uint8Array(length);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}
        } else {
        const reader = new Blob([bytes]).stream().pipeThrough(decompressor).getReader();
        const chunks = []; let length = 0;
        try {
          while (true) {
            const part = await reader.read(); if (part.done) break;
            length += part.value.length;
            if (length > e.size || length > 21 * 1024 * 1024) { await reader.cancel(); throw Error('ZIP 실제 용량이 올바르지 않습니다.'); }
            chunks.push(part.value);
          }
        } finally { reader.releaseLock(); }
        bytes = new Uint8Array(length); let offset = 0;
        for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
        }
      }
      if (bytes.length !== e.size) throw Error('ZIP 파일 크기가 일치하지 않습니다.');
      let crc = 0xffffffff;
      for (const value of bytes) { crc ^= value; for (let k = 0; k < 8; k++) crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1; }
      if (((crc ^ 0xffffffff) >>> 0) !== e.checksum) throw Error('ZIP 파일이 손상되었습니다.');
      return bytes;
    };
    return entries;
  }
  return { crop, basename, matchPhoto, readZip };
});
