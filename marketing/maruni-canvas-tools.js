// Keep the preview controls outside the canvas so exports contain only artwork.
window.maruniCanvasTools = function (canvas, options) {
  const bar = document.createElement('div');
  bar.className = 'maruni-canvas-tools';
  bar.hidden = true;
  const label = document.createElement('label');
  label.textContent = '캐릭터 크기 ';
  const size = document.createElement('input');
  size.type = 'range';
  size.min = options.min;
  size.max = options.max;
  label.append(size);
  const trash = document.createElement('button');
  trash.type = 'button';
  trash.textContent = '이 컷에서 삭제';
  trash.title = '누르거나 캐릭터를 여기로 끌어 놓으세요';
  bar.append(label, trash);
  options.anchor.after(bar);
  trash.onclick = options.remove;
  size.oninput = () => options.resize(Number(size.value), 'input');
  size.onchange = () => options.resize(Number(size.value), 'change');

  const host=canvas.parentElement;
  if(getComputedStyle(host).position==='static')host.style.position='relative';
  const frame=document.createElement('div');
  frame.className='maruni-selection';
  const handle=document.createElement('button');
  handle.type='button';handle.textContent='↘';handle.setAttribute('aria-label','드래그해서 캐릭터 크기 조절');
  const erase=document.createElement('button');
  erase.type='button';erase.textContent='×';erase.setAttribute('aria-label','사진에서 선택 캐릭터 삭제');
  frame.append(erase,handle);host.append(frame);
  erase.onclick=options.remove;
  function refresh(){
    const b=options.box(),cr=canvas.getBoundingClientRect(),hr=host.getBoundingClientRect();
    frame.hidden=bar.hidden||!b||!cr.width;
    if(frame.hidden)return;
    Object.assign(frame.style,{
      left:(cr.left-hr.left-host.clientLeft+host.scrollLeft+b.x*cr.width/1080)+'px',
      top:(cr.top-hr.top-host.clientTop+host.scrollTop+b.y*cr.height/1350)+'px',
      width:(b.w*cr.width/1080)+'px',height:(b.h*cr.height/1350)+'px'
    });
  }
  let drag=null;
  frame.onpointerdown=e=>{
    if(e.target===erase||drag||e.button!==0)return;
    const b=options.box();if(!b)return;
    drag={id:e.pointerId,x:e.clientX,y:e.clientY,value:Number(size.value),width:frame.getBoundingClientRect().width,
      resize:e.target===handle,move:e.target===handle?null:options.startMove()};
    frame.setPointerCapture(e.pointerId);e.preventDefault();
  };
  frame.onpointermove=e=>{
    if(!drag||drag.id!==e.pointerId)return;
    const dx=e.clientX-drag.x,dy=e.clientY-drag.y,cr=canvas.getBoundingClientRect();
    if(drag.resize){
      size.value=Math.round(drag.value*(1+(dx+dy)/2/Math.max(1,drag.width)));
      options.resize(Number(size.value),'input');
    }else drag.move?.(dx*1080/cr.width,dy*1350/cr.height);
    refresh();
  };
  function end(e){
    if(!drag||drag.id!==e.pointerId)return;
    const remove=!drag.resize&&e.type==='pointerup'&&overTrash(e);
    if(drag.resize)options.resize(Number(size.value),'change');
    drag=null;if(remove)options.remove();refresh();
  }
  frame.onpointerup=frame.onpointercancel=frame.onlostpointercapture=end;
  frame.hidden=true;
  new ResizeObserver(refresh).observe(host);
  // Native scrolling cancels a touch sequence. Only a completed tap selects.
  canvas.addEventListener('click', event => options.pick(event));
  function overTrash(event) {
    if (bar.hidden) return false;
    const box = trash.getBoundingClientRect();
    return event.clientX >= box.left && event.clientX <= box.right &&
      event.clientY >= box.top && event.clientY <= box.bottom;
  }
  return {
    refresh,
    show(value) {
      bar.hidden = value == null;
      if (value != null) size.value = value;
      refresh();
    },
    remove: options.remove,
    overTrash
  };
};
