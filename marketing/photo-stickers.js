// Positions are fractions of the composed picture, shared by its preview and PNG.
window.PhotoStickers = (() => {
  let selected = null;
  function layout(item, width, height) {
    const w = Math.min(item.w, height / width / item.aspect);
    return { w, h: w * width / height * item.aspect,
      x: Math.max(0, Math.min(1 - w, item.x)),
      y: Math.max(0, Math.min(1 - w * width / height * item.aspect, item.y)) };
  }
  async function finish(canvas, photo, live = false) {
    if (!photo || canvas.dataset.stickerPhoto) return canvas;
    canvas.dataset.stickerPhoto = photo.id;
    if (live) return canvas;
    const ctx = canvas.getContext('2d');
    for (const item of photo.formStickers || []) {
      const img = await loadImage(item.path);
      const b = layout(item, canvas.width, canvas.height);
      ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(img, b.x * canvas.width, b.y * canvas.height, b.w * canvas.width, b.h * canvas.height);
      ctx.restore();
    }
    return canvas;
  }
  function current(host) {
    const canvas = host?.querySelector('canvas');
    const photo = state.photos.find(p => p.id === canvas?.dataset.stickerPhoto);
    return photo && canvas ? { canvas, photo } : null;
  }
  function activeHost() {
    return [...document.querySelectorAll('.simple-thumbnail-preview,#designs')].find(h => h.getClientRects().length && current(h));
  }
  function position(host, overlay, canvas) {
    const r = canvas.getBoundingClientRect(), h = host.getBoundingClientRect();
    Object.assign(overlay.style, {left:r.left-h.left-host.clientLeft+host.scrollLeft+'px', top:r.top-h.top-host.clientTop+host.scrollTop+'px', width:r.width+'px', height:r.height+'px'});
  }
  function paint(host) {
    host.querySelector('.form-stickers')?.remove();
    const data = current(host);
    if (!data?.photo.formStickers?.length) return;
    const {canvas,photo} = data;
    const overlay = document.createElement('div');
    overlay.className = 'form-stickers'; host.append(overlay); position(host,overlay,canvas);
    for (const item of photo.formStickers) {
      const box = document.createElement('div'), img = new Image();
      box.className = 'mh-actor'; img.src=item.path; img.alt=item.name; img.draggable=false;
      box.append(img); overlay.append(box);
      const del=document.createElement('button'), size=document.createElement('button');
      for (const [b,label,symbol,cls] of [[del,'사진에서 삭제','×','erase'],[size,'크기 조절','↘','size']]) {
        b.type='button'; b.className=cls; b.ariaLabel=label; b.textContent=symbol; box.append(b);
      }
      const place=()=>{
        const b=layout(item,canvas.width,canvas.height);
        Object.assign(box.style,{left:b.x*100+'%',top:b.y*100+'%',width:b.w*100+'%',height:b.h*100+'%'});
        box.classList.toggle('active',selected===item); size.hidden=del.hidden=selected!==item;
      };
      place();
      del.onclick=e=>{e.stopPropagation(); photo.formStickers=photo.formStickers.filter(i=>i!==item); selected=null; persist(); refresh();};
      box.onpointerdown=e=>{
        e.stopPropagation(); if(e.target===del || e.button!==0)return;
        e.preventDefault(); selected=item;
        for(const other of overlay.children){other.classList.toggle('active',other===box);for(const b of other.querySelectorAll('button'))b.hidden=other!==box;}
        const start=layout(item,canvas.width,canvas.height), rect=overlay.getBoundingClientRect();
        const sx=e.clientX,sy=e.clientY,id=e.pointerId,resize=e.target===size;
        box.setPointerCapture(id);
        box.onpointermove=ev=>{
          if(ev.pointerId!==id)return;
          const dx=(ev.clientX-sx)/rect.width,dy=(ev.clientY-sy)/rect.height;
          if(resize)item.w=Math.max(.04,Math.min(1,start.w+(dx+dy*start.w/start.h)/2));
          else {item.x=start.x+dx;item.y=start.y+dy;}
          const b=layout(item,canvas.width,canvas.height); Object.assign(item,{x:b.x,y:b.y,w:b.w});place();
        };
        box.onlostpointercapture=()=>{box.onpointermove=null;persist();refresh();};
      };
    }
  }
  function refresh(){document.querySelectorAll('.simple-thumbnail-preview,#designs').forEach(paint);}
  function watch(host){
    if(!host || host.dataset.watchesStickers)return;
    host.dataset.watchesStickers='1';
    new MutationObserver(records=>{
      if(records.some(r=>[...r.addedNodes,...r.removedNodes].some(n=>n.nodeName==='CANVAS')))paint(host);
    }).observe(host,{childList:true});
    new ResizeObserver(()=>{const overlay=host.querySelector('.form-stickers'),c=host.querySelector('canvas');if(overlay&&c)position(host,overlay,c);}).observe(host);
    paint(host);
  }
  async function add(asset,host=activeHost()){
    const data=current(host); if(!data)throw Error('현장 사진을 먼저 넣어 주세요.');
    const img=await loadImage(asset.path);
    if(current(host)?.photo!==data.photo)return;
    selected={path:asset.path,name:asset.label,x:.38,y:.42,w:.22,aspect:img.height/img.width};
    (data.photo.formStickers??=[]).push(selected);persist();refresh();
  }
  return {finish,watch,activeHost,add};
})();
