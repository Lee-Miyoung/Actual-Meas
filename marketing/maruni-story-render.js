(() => {
  'use strict';
  const C = window.MaruniStoryCore, W = 1080, H = 1350;
  let fontPromise;
  function fonts() {
    return fontPromise || (fontPromise = (async () => {
      const f = new FontFace('Maruni Story', 'url(fonts/Hahmlet-Title.woff)');
      await f.load(); document.fonts.add(f); return f;
    })().catch(e => { fontPromise = null; throw Error('말풍선 글꼴을 불러오지 못했습니다. 다시 시도해 주세요.'); }));
  }
  function bubbleBox(ctx, layer, style) {
    const w = Math.max(220, W * layer.width), fs = style.fontSize;
    ctx.font = `500 ${fs}px "Maruni Story", serif`;
    const lines = C.wrap(layer.text || '내용을 입력하세요', t => ctx.measureText(t).width, w - 56), lh = fs * 1.55, h = lines.length * lh + 48;
    return { x: C.clamp(layer.x * W - w / 2, 14, W - w - 14), y: C.clamp(layer.y * H - h / 2, 14, Math.max(14, H - h - 28)), w, h, lines, lh, overflow: h > H - 60 };
  }
  function balloon(ctx, box, format, speaker, paper, ink) {
    const {x,y,w,h}=box;
    ctx.fillStyle=paper; ctx.strokeStyle=ink; ctx.lineWidth=2;
    ctx.beginPath();ctx.roundRect(x,y,w,h,format==='note'?8:Math.min(35,h/2));
    ctx.fill();ctx.stroke();
    if(format==='note'||!speaker)return;
    const sign=speaker.y<y+h/2?-1:1, edge=sign<0?y:y+h;
    const base=C.clamp(speaker.x,x+30,x+w-30);
    const tip=C.clamp(speaker.x-base,-26,26);
    if(format==='thought'){
      for(const [offset,r] of [[10,6],[23,3]]){
        ctx.beginPath();ctx.arc(base+tip*offset/24,edge+sign*offset,r,0,Math.PI*2);ctx.fill();ctx.stroke();
      }
    }else{
      ctx.beginPath();ctx.moveTo(base-12,edge-sign);ctx.lineTo(base+tip,edge+sign*22);
      ctx.lineTo(base+12,edge-sign);ctx.fill();ctx.stroke();
    }
  }
  async function draw(canvas, project, scene, image, options = {}) {
    await fonts();
    const ctx = canvas.getContext('2d'), ratio = canvas.width / W;
    if (!ctx) throw Error('미리보기를 열 수 없습니다.');
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, W, H); ctx.fillStyle = '#e9e5dd'; ctx.fillRect(0, 0, W, H);
    if (scene.photoId) { const im = await image(scene.photoId), b = C.fitPhoto(im.width, im.height, W, H, scene.photo); ctx.drawImage(im, b.x, b.y, b.w, b.h); }
    else { ctx.fillStyle = '#72675a'; ctx.textAlign = 'center'; ctx.font = '36px "Maruni Story", serif'; ctx.fillText('현장 사진을 불러오세요', W / 2, H / 2); ctx.textAlign = 'start'; }
    const boxes = new Map();
    for (const l of scene.layers) {
      if (l.type === 'actor') {
        const im = await image(l.mediaId), b = C.actorBox(l); boxes.set(l.id, b); ctx.save();
        if (l.flipped && l.allowFlip) { ctx.translate(b.x + b.w, b.y); ctx.scale(-1, 1); ctx.drawImage(im, 0, 0, b.w, b.h); }
        else ctx.drawImage(im, b.x, b.y, b.w, b.h); ctx.restore();
      } else {
        if (l.format==='none') continue;
        if (!l.text.trim() && options.selected !== l.id) continue;
        const b = bubbleBox(ctx, l, project.style); if (b.overflow) throw Error('말풍선이 너무 깁니다. 문구를 줄이거나 폭을 넓혀 주세요.');
        boxes.set(l.id, b); ctx.save(); ctx.fillStyle = project.style.paper; ctx.strokeStyle = project.style.ink; ctx.lineWidth = 3;
        if(l.format && l.format!=='legacy'){
          const actor=scene.layers.find(a=>a.type==='actor' && a.id===l.speakerId);
          const w=Math.min(b.w,Math.max(90,...b.lines.map(t=>ctx.measureText(t).width+56)));
          b.x+=(b.w-w)/2;b.w=w;
          balloon(ctx,b,l.format,actor?{x:actor.x*W,y:actor.y*H}:null,project.style.paper,project.style.ink);
        }else{
        ctx.beginPath(); ctx.roundRect(b.x, b.y, b.w, b.h, 24); ctx.fill(); ctx.stroke();
        const speaker = scene.layers.find(a => a.id === l.speakerId && a.type === 'actor');
        if (speaker) {
          const a = C.actorBox(speaker), center = C.clamp(a.x + a.w / 2, b.x + 28, b.x + b.w - 28), up = a.y + a.h / 2 < b.y + b.h / 2, edge = up ? b.y : b.y + b.h, tip = edge + (up ? -22 : 22);
          ctx.beginPath(); ctx.moveTo(center - 13, edge); ctx.lineTo(center, tip); ctx.lineTo(center + 13, edge); ctx.fill(); ctx.stroke();
        }
        }
        ctx.font = `500 ${project.style.fontSize}px "Maruni Story", serif`; ctx.textBaseline = 'top'; ctx.fillStyle = project.style.ink;
        b.lines.forEach((t, i) => ctx.fillText(t, b.x + 28, b.y + 24 + i * b.lh)); ctx.restore();
      }
    }
    if (options.selected && boxes.has(options.selected)) {
      const b = boxes.get(options.selected); ctx.save(); ctx.strokeStyle = '#38664e'; ctx.lineWidth = 5; ctx.setLineDash([14, 10]); ctx.strokeRect(b.x - 5, b.y - 5, b.w + 10, b.h + 10); ctx.restore();
    }
    return boxes;
  }
  window.MaruniStoryRender = { draw, fonts, balloon, bubbleBox, W, H };
})();
