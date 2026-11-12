/* On-canvas photo and text editing. Selection controls are DOM-only, never exported. */
(()=>{
'use strict';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const zoomBy=(t,f)=>({...t,zoom:clamp((t.zoom||1)*f,1,3)});
const pan=(t,b,dx,dy)=>({...t,x:clamp((t.x??.5)-dx*b.sw/b.width/Math.max(1,b.sourceWidth-b.sw),0,1),y:clamp((t.y??.55)-dy*b.sh/b.height/Math.max(1,b.sourceHeight-b.sh),0,1)});
window.CheonginDirectMath={zoomBy,pan};
let redrawTimer,bodyPending=false;
function redraw(body=true){bodyPending ||= body;window.CheonginThumbnailEditor?.refresh();clearTimeout(redrawTimer);redrawTimer=setTimeout(()=>{if(bodyPending){bodyPending=false;window.renderProductionWorkspace?.();}},75);}
// Safari may move the layout viewport again while its keyboard is retracting.
let cancelSettlement;
function settleScroll(x,y,after){
 cancelSettlement?.();
 const vv=window.visualViewport;
 function restore(){if(window.scrollX!==x||window.scrollY!==y)window.scrollTo(x,y);after?.();}
 function stop(){vv?.removeEventListener('resize',restore);vv?.removeEventListener('scroll',restore);
  window.removeEventListener('pointerdown',stop,true);window.removeEventListener('touchstart',stop,true);window.removeEventListener('focusin',stop,true);
  clearTimeout(timer);cancelSettlement=null;}
 const timer=setTimeout(()=>{restore();stop();},550);
 vv?.addEventListener('resize',restore);vv?.addEventListener('scroll',restore);
 window.addEventListener('pointerdown',stop,true);window.addEventListener('touchstart',stop,true);window.addEventListener('focusin',stop,true);
 cancelSettlement=stop;restore();
}
let formScroll=null;
document.addEventListener('focusin',e=>{
 if(window.navigator.maxTouchPoints && e.target.matches?.('.simple-marketing-panel textarea,.simple-marketing-panel input')){
  formScroll??={x:window.scrollX,y:window.scrollY};
 }
});
document.addEventListener('focusout',e=>{
 if(!formScroll||!e.target.closest?.('.simple-marketing-panel')||e.relatedTarget?.matches?.('.simple-marketing-panel textarea,.simple-marketing-panel input'))return;
 const saved=formScroll;formScroll=null;settleScroll(saved.x,saved.y);
});
function init(host,thumb){
 if(host.dataset.directEdit)return;host.dataset.directEdit='true';host.classList.add('direct-edit-surface');host.tabIndex=0;
 let selected=null,frame=null,overlay=null,editor=null,gesture=null,pointers=new Map(),suppressClick=false;
 const canvas=()=>host.querySelector('canvas');
 function logical(c){return c.dataset.renderer==='cheongin-channel-cover-v1'?Number(c.dataset.exportWidth)||1080:1080;}
 function coords(e,c){const r=c.getBoundingClientRect(),u=logical(c)/r.width;return {x:(e.clientX-r.left)*u,y:(e.clientY-r.top)*u};}
 function get(b){if(!b.editKey)return window.CheonginThumbnailEditor?.get(b.target||'background')||{x:b.anchorX??.5,y:b.anchorY??.55,zoom:1};return state.signaturePhotos?.[b.id]?.frameTransforms?.[b.editKey]||{x:b.anchorX??.5,y:b.anchorY??.55,zoom:b.zoom||1};}
 function set(b,t){if(!b.editKey)window.CheonginThumbnailEditor?.set(b.target||'background',t);else{state.signaturePhotos??={};state.signaturePhotos[b.id]??={};state.signaturePhotos[b.id].frameTransforms??={};state.signaturePhotos[b.id].frameTransforms[b.editKey]=t;persist();}redraw(!thumb||!b.editKey);}
 function fit(){
  const c=canvas();if(!c)return;
  const desk=host.closest('.desk-preview');
  const tablet=window.innerWidth>=700 && window.innerWidth<=1366;
  const bounded=tablet && host.clientHeight>0;
  const w=bounded?Math.max(1,host.clientWidth-20):Math.max(150,(desk?.clientWidth||host.clientWidth||440)-32);
  const h=bounded?Math.max(1,host.clientHeight-20):Math.max(200,Math.min(720,window.innerHeight*.5));
  const ratio=c.width/c.height,width=Math.min(w,h*ratio);
  c.style.setProperty('width',width+'px','important');c.style.setProperty('height',width/ratio+'px','important');
  c.style.setProperty('max-height','none','important');c.style.setProperty('max-width','100%','important');c.style.setProperty('object-fit','fill','important');
 }
 function paint(){fit();if(!selected||editor)return;const c=canvas();if(!c)return;const b=(c.photoLayout||[]).find(v=>v.id===selected.id&&v.editKey===selected.editKey&&v.target===selected.target);if(!b){overlay?.remove();overlay=null;selected=null;return;}frame=b;
  if(!overlay||!overlay.isConnected){overlay=document.createElement('div');overlay.className='direct-photo-selection';for(const corner of ['nw','ne','sw','se']){const h=document.createElement('button');h.type='button';h.className='direct-photo-handle '+corner;h.dataset.resizeCorner=corner;h.setAttribute('aria-label','사진 크기 조절');overlay.append(h);}const controls=document.createElement('div');controls.className='direct-photo-controls';for(const [action,label]of [['minus','−'],['plus','+'],['reset','원래 크기']]){const b=document.createElement('button');b.type='button';b.dataset.photoAction=action;b.textContent=label;b.setAttribute('aria-label',action==='minus'?'사진 축소':action==='plus'?'사진 확대':'사진 위치와 크기 초기화');controls.append(b);}overlay.append(controls);host.append(overlay);}
  const hr=host.getBoundingClientRect(),cr=c.getBoundingClientRect(),u=cr.width/logical(c);Object.assign(overlay.style,{left:cr.left-hr.left+b.x*u+'px',top:cr.top-hr.top+b.y*u+'px',borderRadius:b.shape==='circle'?'50%':'',width:b.width*u+'px',height:b.height*u+'px'});
 }
 function facts(c){return {...(window.CheonginThumbnailEditor?.facts()||{}),...(c.previewMeta||{})};}
 function fieldFor(t,c){if(t.field)return t.field;const f=facts(c),v=String(t.source||'');for(const key of ['title','product','spec','location'])if(f[key]&&(v===f[key]||v.includes(f[key])))return key;if(f.site&&v===f.site)return 'location';return null;}
 function editText(hit,c){const key=fieldFor(hit,c);if(!key)return false;overlay?.remove();overlay=null;const f=facts(c),source=String(f[key]??hit.source??''),group=(c.typeLayout||[]).filter(t=>t.source===hit.source),left=Math.min(...group.map(t=>t.x)),top=Math.min(...group.map(t=>t.y)),right=Math.max(...group.map(t=>t.x+t.width)),bottom=Math.max(...group.map(t=>t.y+t.height)),cr=c.getBoundingClientRect(),hr=host.getBoundingClientRect(),u=cr.width/logical(c);
  const input=document.createElement('textarea');input.className='direct-text-input';input.value=source;input.setAttribute('aria-label',({title:'제목',product:'제품명',spec:'규격',location:'현장명',firstScene:'첫 번째 장면 이름',secondScene:'두 번째 장면 이름'})[key]);Object.assign(input.style,{left:cr.left-hr.left+left*u+'px',top:cr.top-hr.top+top*u+'px',width:Math.min(cr.width-left*u,Math.max(150,(right-left)*u+18))+'px',height:Math.max(44,(bottom-top)*u+16)+'px',fontSize:Math.max(16,hit.size*u)+'px'});editor=input;host.append(input);let ended=false;
  const restoreEditing=keepAboveKeyboard(input,c,{left,top,right,bottom,size:hit.size},()=>finish(true));
  function finish(save){if(ended)return;ended=true;editor=null;const value=input.value.trim();input.blur();input.remove();restoreEditing();if(save&&value!==source){if(key==='title'&&!thumb&&c.dataset.renderer!=='cheongin-channel-cover-v1'&&c.dataset.thumbnail!=='true'){state.manualOverlay??={};state.manualOverlay.slideTitles??=[];state.manualOverlay.slideTitles[Number(c.dataset.slide)||0]=value;}else window.CheonginThumbnailEditor?.setFacts({[key]:value});persist();redraw(true);}paint();}
  input.addEventListener('pointerdown',e=>e.stopPropagation());input.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();finish(false);}else if(e.key==='Enter'&&!e.shiftKey&&!e.isComposing&&e.keyCode!==229){e.preventDefault();finish(true);}});input.addEventListener('blur',()=>finish(true));input.focus({preventScroll:true});input.select();return true;
 }
 function keepAboveKeyboard(input,c,box,done){
  const vv=window.visualViewport,touch=Boolean(window.matchMedia?.('(pointer:coarse)').matches||window.navigator?.maxTouchPoints);
  if(!touch)return ()=>{};
  const originX=window.scrollX,originY=window.scrollY;
  const shell=document.createElement('div'),snapshot=document.createElement('canvas');
  shell.className='keyboard-photo-edit';shell.setAttribute('role','dialog');
  shell.setAttribute('aria-label','사진 위 문구 수정');
  // Leave the preview and its scroll containers in place throughout editing.
  snapshot.width=c.width;snapshot.height=c.height;
  snapshot.getContext('2d').drawImage(c,0,0);
  const button=document.createElement('button');button.type='button';
  button.className='keyboard-edit-done';button.textContent='완료';
  button.addEventListener('pointerdown',e=>e.preventDefault());button.onclick=done;
  shell.append(snapshot,input,button);document.body.append(shell);
  const fullHeight=vv?.height||window.innerHeight,fullWidth=vv?.width||window.innerWidth;
  let keyboardSeen=false,disposed=false,queued=false;
  function layout(){
   if(disposed)return;
   const width=vv?.width||window.innerWidth,height=vv?.height||window.innerHeight;
   if(Math.abs(width-fullWidth)<48){
    if(fullHeight-height>100)keyboardSeen=true;
    if(keyboardSeen&&height>=fullHeight-48){done();return;}
   }
   Object.assign(shell.style,{left:(vv?.offsetLeft||0)+8+'px',top:(vv?.offsetTop||0)+8+'px',
    width:Math.max(120,width-16)+'px',height:Math.max(120,height-16)+'px'});
   const ratio=snapshot.width/snapshot.height,w=Math.min(Math.max(100,width-48),Math.max(100,height-86)*ratio);
   snapshot.style.width=w+'px';snapshot.style.height=w/ratio+'px';
   const hr=shell.getBoundingClientRect(),cr=snapshot.getBoundingClientRect(),u=cr.width/logical(c);
   const inputHeight=Math.max(44,Math.min(height-64,(box.bottom-box.top)*u+16));
   const left=clamp(cr.left-hr.left+box.left*u,6,Math.max(6,hr.width-126));
   Object.assign(input.style,{left:left+'px',top:clamp(cr.top-hr.top+box.top*u,42,Math.max(42,height-24-inputHeight))+'px',
    width:Math.min(hr.width-left-6,Math.max(120,(box.right-box.left)*u+16))+'px',height:inputHeight+'px',fontSize:Math.max(16,box.size*u)+'px'});
  }
  function queue(){if(queued||disposed)return;queued=true;requestAnimationFrame(()=>{queued=false;layout();});}
  vv?.addEventListener('resize',queue);vv?.addEventListener('scroll',queue);window.addEventListener('resize',queue);
  layout();
  return ()=>{
   disposed=true;vv?.removeEventListener('resize',queue);vv?.removeEventListener('scroll',queue);window.removeEventListener('resize',queue);
   shell.remove();snapshot.width=snapshot.height=1;
   settleScroll(originX,originY,fit);
  };
 }
 function openLogoColors(c) {
   overlay?.remove(); overlay=null; selected=null;
   const palette=document.createElement('div');
   palette.className='cover-logo-colors';
   palette.setAttribute('role','group');palette.setAttribute('aria-label','로고 색상');
   for(const [key,[name,color]] of Object.entries(window.CheonginCoverStyle.colors)){
     const swatch=document.createElement('button');swatch.type='button';
     swatch.dataset.logoColor=key;swatch.setAttribute('aria-label',name);swatch.title=name;
     swatch.setAttribute('aria-pressed',String(key===(state.thumbnailPosting?.logoTone||'white')));
     swatch.style.setProperty('--swatch',color);swatch.textContent=name;palette.append(swatch);
   }
   const cr=c.getBoundingClientRect(),hr=host.getBoundingClientRect(),b=c.logoBox,unit=cr.width/b.units;
   palette.style.left=Math.max(2,Math.min(hr.width-210,cr.left-hr.left+b.x*unit))+'px';
   palette.style.top=(cr.top-hr.top+(b.y+b.height)*unit+6)+'px';host.append(palette);
 }
 function choose(e){const c=canvas();if(!c)return null;const pt=coords(e,c);return [...(c.photoLayout||[])].reverse().find(b=>window.CheonginCoverStyle.hits(b,pt.x,pt.y));}
 host.addEventListener('pointerdown',e=>{if(e.target.closest('.direct-text-input,.keyboard-edit-done'))return;if(window.CheonginThumbnailEditor?.busy())return;const c=canvas();if(!c)return;
  const swatch=e.target.closest('[data-logo-color]');
  if(swatch){e.preventDefault();e.stopImmediatePropagation();suppressClick=true;swatch.closest('.cover-logo-colors').remove();window.CheonginThumbnailEditor?.setLogo(swatch.dataset.logoColor);return;}
  host.querySelector('.cover-logo-colors')?.remove();
  const bLogo=c.logoBox;
  if(bLogo&&!pointers.size&&!e.target.closest('.direct-photo-selection')){
    const point=coords(e,c);
    if(point.x>=bLogo.x-4&&point.x<=bLogo.x+bLogo.width+4&&point.y>=bLogo.y-4&&point.y<=bLogo.y+bLogo.height+4){
      e.preventDefault();e.stopImmediatePropagation();suppressClick=true;openLogoColors(c);return;
    }
  }
  const action=e.target.closest('[data-photo-action]')?.dataset.photoAction;if(action&&frame){e.preventDefault();e.stopImmediatePropagation();set(frame,action==='reset'?{x:.5,y:.55,zoom:1}:zoomBy(get(frame),action==='plus'?1.15:1/1.15));return;}
  if(e.button>0)return;const handle=e.target.closest('[data-resize-corner]');const pt=coords(e,c);const text=[...(c.typeLayout||[])].reverse().find(t=>fieldFor(t,c)&&pt.x>=t.x-5&&pt.x<=t.x+t.width+5&&pt.y>=t.y-5&&pt.y<=t.y+t.height+5);
  if(!handle&&!pointers.size&&text){e.preventDefault();e.stopImmediatePropagation();editText(text,c);return;}
  const b=(handle||pointers.size)?frame:choose(e);if(!b)return;e.preventDefault();e.stopImmediatePropagation();suppressClick=true;if(!b.editKey&&b.target)window.CheonginThumbnailEditor?.selectTarget?.(b.target);selected={id:b.id,editKey:b.editKey,target:b.target};frame=b;host.focus({preventScroll:true});pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});host.setPointerCapture?.(e.pointerId);
  if(pointers.size===2){const [a,z]=[...pointers.values()];gesture={mode:'pinch',distance:Math.max(1,Math.hypot(a.x-z.x,a.y-z.y)),start:get(b)};}
  else gesture={mode:handle?'resize':'pan',x:e.clientX,y:e.clientY,corner:handle?.dataset.resizeCorner,start:get(b)};paint();
 },true);
 host.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId)||!gesture||!frame)return;e.preventDefault();e.stopImmediatePropagation();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const c=canvas(),u=logical(c)/c.getBoundingClientRect().width;
  if(gesture.mode==='pinch'&&pointers.size===2){const [a,z]=[...pointers.values()];set(frame,zoomBy(gesture.start,Math.hypot(a.x-z.x,a.y-z.y)/gesture.distance));}
  else if(gesture.mode==='resize'){const dx=(e.clientX-gesture.x)*(gesture.corner.includes('e')?1:-1),dy=(e.clientY-gesture.y)*(gesture.corner.includes('s')?1:-1);set(frame,zoomBy(gesture.start,Math.exp((dx+dy)/220)));}
  else if(gesture.mode==='pan'){const dx=(e.clientX-gesture.x)*u,dy=(e.clientY-gesture.y)*u;set(frame,pan(get(frame),frame,dx,dy));gesture.x=e.clientX;gesture.y=e.clientY;}suppressClick=true;
 },true);
 function end(e){if(!pointers.has(e.pointerId))return;e.stopImmediatePropagation();pointers.delete(e.pointerId);host.releasePointerCapture?.(e.pointerId);gesture=null;if(pointers.size===1){const a=[...pointers.values()][0];gesture={mode:'pan',x:a.x,y:a.y,start:get(frame)};}persist();paint();}
 host.addEventListener('pointerup',end,true);host.addEventListener('pointercancel',end,true);host.addEventListener('click',e=>{if(e.target.closest('.direct-text-input'))return;if(suppressClick||e.target.closest('.direct-photo-selection')){e.preventDefault();e.stopImmediatePropagation();suppressClick=false;}},true);
 host.addEventListener('keydown',e=>{const palette=host.querySelector('.cover-logo-colors');
    if(palette&&e.key==='Escape'){palette.remove();return;}
    if(editor||!frame)return;let t=get(frame);if(['+','=','-'].includes(e.key)){e.preventDefault();set(frame,zoomBy(t,e.key==='-'?1/1.1:1.1));}if(e.key==='Escape'){selected=null;overlay?.remove();overlay=null;}});
 new MutationObserver(paint).observe(host,{childList:true,subtree:true});new ResizeObserver(paint).observe(host);window.addEventListener('resize',paint);paint();
}
function mount(){for(const [selector,thumb]of [['.simple-thumbnail-preview',true],['#designs',false]]){const host=document.querySelector(selector);if(host)init(host,thumb);}}
setInterval(mount,400);window.addEventListener('marketing:ready',mount);mount();
})();
