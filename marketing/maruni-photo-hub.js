(() => {
  const hub=$('maruni-hub'), fixed=$('maruni-locked-template'), free=$('maruni-story');
  const base=$('mh-base'), stage=$('mh-stage'), holder=$('mh-actors'), photos=$('mh-photo');
  let mode='single', photo=null, layers=[], chosen=null, applying=false, catalog;
  const drafts=new WeakMap();
  const note=text=>{$('mh-status').textContent=text;};
  function switchMode(key){
    if (window.marketingWorkbench?.active()) window.marketingWorkbench.reflect(key);
    mode=key;
    $('mh-situations').hidden=key==='locked';
    $('mh-single').hidden=key!=='single';
    for(const [name,panel] of [['locked',fixed],['free',free]]){
      panel.hidden=key!==name;panel.open=hub.open&&key===name;
    }
    hub.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===key)));
    if(key==='single'&&hub.open){refreshPhotos();poses();}
  }
  function editablePhotos(){
    const exterior=state.thumbnailPosting?.exteriorPhoto;
    return exterior?[...state.photos,exterior]:state.photos;
  }
  function refreshPhotos(prefer){
    if(applying)return;
    const list=editablePhotos();
    photos.replaceChildren(...list.map((p,i)=>new Option((i+1)+' · '+p.name,p.id)));
    const next=list.find(p=>p.id===prefer)||list.find(p=>p===photo)||state.photos[selected]||list[0];
    photo=next;chosen=null;layers=[];
    $('mh-apply').disabled=!next;stage.hidden=!next;
    if(next){
      photos.value=next.id;
      layers=drafts.get(next)||structuredClone(next.characterEdit?.layers||[]);
      drafts.set(next,layers);base.src=next.characterEdit?.source||next.src;
    }else base.removeAttribute('src');
    render();note(next?'':'현장 사진을 먼저 불러오세요.');
  }
  function render(){
    holder.replaceChildren();
    for(const item of layers){
      const box=document.createElement('div'), im=new Image();
      im.src=item.path;im.alt=item.name;im.draggable=false;box.append(im);
      box.className='mh-actor'+(item===chosen?' active':'');
      const place=()=>Object.assign(box.style,{left:item.x*100+'%',top:item.y*100+'%',width:item.w*100+'%'});
      place();holder.append(box);
      const del=document.createElement('button'),size=document.createElement('button');
      del.type=size.type='button';del.textContent='×';size.textContent='↘';
      del.className='erase';size.className='size';del.ariaLabel='이 사진에서 삭제';size.ariaLabel='크기 조절';
      box.append(del,size);del.hidden=size.hidden=item!==chosen;
      del.onclick=()=>{if(applying)return;layers.splice(layers.indexOf(item),1);chosen=null;render();};
      box.onpointerdown=e=>{
        if(applying||e.target===del||e.button!==0)return;
        e.preventDefault();chosen=item;
        for(const other of holder.children){
          other.classList.toggle('active',other===box);
          other.querySelectorAll('button').forEach(b=>b.hidden=other!==box);
        }
        const r=stage.getBoundingClientRect(),sx=e.clientX,sy=e.clientY,start={...item},id=e.pointerId;
        box.setPointerCapture(id);
        box.onpointermove=ev=>{
          if(ev.pointerId!==id)return;
          const dx=(ev.clientX-sx)/r.width,dy=(ev.clientY-sy)/r.height;
          const aspect=(im.naturalHeight||1)/(im.naturalWidth||1)*r.width/r.height;
          if(e.target===size)item.w=Math.max(.04,Math.min(.95,1/aspect,start.w+(dx+dy/aspect)/2));
          item.x=Math.max(0,Math.min(1-item.w,start.x+(e.target===size?0:dx)));
          item.y=Math.max(0,Math.min(1-item.w*aspect,start.y+(e.target===size?0:dy)));place();
        };
        box.onpointerup=box.onpointercancel=box.onlostpointercapture=()=>{box.onpointermove=null;};
      };
    }
  }
  let actor='maruni', page=0;
  let managing=false;
  const prefix='cheonginmaru-maruni-story:hidden-pose:';
  function hidden(id){try{return localStorage.getItem(prefix+id)==='1';}catch{return false;}}
  $('mh-manage').onclick=()=>{managing=!managing;page=0;$('mh-manage').textContent=managing?'관리 마치기':'스티커 삭제·복원';poses();};
  window.addEventListener('pose-list-changed',poses);
  window.addEventListener('storage',e=>{if(!e.key||e.key.startsWith(prefix))poses();});
  async function poses(){
    try{
      catalog??=fetch('assets/characters/manifest.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error();return r.json();});
      const {assets}=await catalog;
      for(const b of $('mh-poses').querySelectorAll('[data-actor]')){
        const name=b.dataset.actor;
        b.textContent=(name==='maruni'?'마루니 ':'루루 ')+assets.filter(a=>a.actor===name&&a.status==='ready'&&!hidden(a.id)).length+'종 보기';
        b.setAttribute('aria-pressed',String(name===actor));
      }
      const items=assets.filter(a=>a.actor===actor&&a.status==='ready'&&(managing||!hidden(a.id))),pages=Math.max(1,Math.ceil(items.length/8));
      page=Math.max(0,Math.min(page,pages-1));
      $('mh-gallery').replaceChildren(...items.slice(page*8,page*8+8).map(a=>{
        const b=document.createElement('button'),im=new Image(),label=document.createElement('span');
        b.type='button';im.alt='';im.loading='lazy';im.decoding='async';im.src=a.path;label.textContent=a.label+(managing?(hidden(a.id)?' · 복원':' · 목록에서 삭제'):'');
        b.append(im,label);b.onclick=()=>{
          if(!managing)return addPose(a);
          try{if(hidden(a.id))localStorage.removeItem(prefix+a.id);else localStorage.setItem(prefix+a.id,'1');window.dispatchEvent(new Event('pose-list-changed'));}
          catch{note('목록 설정을 저장하지 못했습니다.');}
        };return b;
      }));
      $('mh-count').textContent=(page+1)+' / '+pages;
      $('mh-prev').disabled=page===0;$('mh-next').disabled=page+1>=pages;
    }catch{catalog=null;note('포즈를 불러오지 못했어요. 캐릭터 이름을 눌러 다시 열어 주세요.');}
  }
  for(const b of $('mh-poses').querySelectorAll('[data-actor]'))b.onclick=()=>{actor=b.dataset.actor;page=0;poses();};
  $('mh-prev').onclick=()=>{page--;poses();};$('mh-next').onclick=()=>{page++;poses();};
  const controls=hub.querySelector('.mh-controls'),controlsHome=controls.parentElement;
  let picker=null;
  function closePicker(){if(picker){controlsHome.prepend(controls);picker.hidden=true;picker=null;}}
  window.addEventListener('marketing:form-stickers',e=>{
    if(picker){const same=picker===e.detail;closePicker();if(same)return;}
    picker=e.detail;picker.replaceChildren(controls);picker.hidden=false;poses();
  });
  document.addEventListener('pointerdown',e=>{if(picker&&picker.id!=='work-stickers'&&!picker.contains(e.target)&&!e.target.closest('.thumbnail-live-tabs'))closePicker();},true);
  async function addPose(asset){
    if(picker){try{await PhotoStickers.add(asset);if(picker?.id!=='work-stickers')closePicker();}catch(e){toast(e.message);}return;}
    const target=photo;
    if(!target){note('캐릭터를 넣을 현장 사진을 먼저 골라 주세요.');return;}
    if(applying)return;
    try{
      const img=await loadImage(asset.path);await base.decode();if(target!==photo||applying)return;
      const ratio=base.naturalWidth/base.naturalHeight;
      const w=Math.min(.25,.45/ratio*img.width/img.height);
      chosen={path:asset.path,name:asset.label,x:.35,y:.35,w};layers.push(chosen);render();
      stage.scrollIntoView({block:'nearest'});
      note(asset.label+' 포즈를 넣었어요. 캐릭터를 잡고 끌면 움직입니다.');
    }catch{note('선택한 포즈를 열 수 없습니다.');}
  }
  $('mh-add-balloon').onclick=async()=>{
    const target=photo,text=$('mh-dialogue').value.trim(),font=$('mh-font').value,shape=$('mh-shape').value;
    if((!target&&!picker)||!text){note('사진을 선택하고 대사를 입력해 주세요.');return;}
    try{
      const R=window.MaruniStoryRender;
      await R.loadBubbleFont(font,text);
      if(!picker&&photo!==target)return;
      const c=document.createElement('canvas'),ctx=c.getContext('2d'),face=R.bubbleFont(font,38);
      ctx.font=face;
      const lines=window.MaruniStoryCore.wrap(text,t=>ctx.measureText(t).width,660);
      const w=Math.ceil(Math.max(...lines.map(t=>ctx.measureText(t).width),70))+64,h=lines.length*56+36;
      c.width=w+8;c.height=h+34;ctx.font=face;
      R.balloon(ctx,{x:4,y:4,w,h},shape,{x:w*.3,y:h+40},'#fffaf1','#332b26');
      ctx.fillStyle=shape==='caption'?'#fffaf1':'#332b26';ctx.textBaseline='top';
      lines.forEach((t,i)=>ctx.fillText(t,36,20+i*56));
      await addPose({path:c.toDataURL('image/png'),label:text});
    }catch{note('말풍선을 만들지 못했습니다.');}
  };
  $('mh-apply').onclick=async()=>{
    if(!photo||applying)return;
    applying=true;const p=photo,source=p.characterEdit?.source||p.src,list=structuredClone(layers);
    try{
      let output=source;
      if(list.length){
        const im=await loadImage(source),c=document.createElement('canvas');
        c.width=im.width;c.height=im.height;const ctx=c.getContext('2d');ctx.drawImage(im,0,0);
        for(const item of list){const actor=await loadImage(item.path),w=c.width*item.w;ctx.drawImage(actor,item.x*c.width,item.y*c.height,w,w*actor.height/actor.width);}
        output=c.toDataURL('image/png');if(output==='data:,')throw Error('사진 크기를 처리할 수 없습니다.');c.width=c.height=1;
      }
      if(!editablePhotos().includes(p))return;
      p.src=output;if(list.length)p.characterEdit={source,layers:list};else delete p.characterEdit;
      images.delete(p.id);delete p.thumbnail;await photoImage(p);
      if(state.photos.includes(p))selected=state.photos.indexOf(p);thumbnails();invalidate();await preview();await renderProductionWorkspace();
      await flushPendingSave();note($('save-status').textContent);window.dispatchEvent(new Event('marketing:photo-applied'));
    }catch(e){note(e.message||'사진에 적용하지 못했습니다.');}finally{applying=false;}
  };
  photos.onchange=()=>refreshPhotos(photos.value);
  $('mh-upload').onclick=()=>$('photos').click();
  new MutationObserver(()=>{if(hub.open&&mode==='single'&&(photos.length!==editablePhotos().length||!editablePhotos().includes(photo)))refreshPhotos();}).observe($('thumbnails'),{childList:true});
  hub.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>switchMode(b.dataset.mode));
  hub.ontoggle=()=>switchMode(mode);
  for(const [name,panel] of [['locked',fixed],['free',free]])panel.addEventListener('toggle',()=>{
    if(panel.open&&(!hub.open||mode!==name)){hub.open=true;switchMode(name);}
  });
  const prompts={
    product:'어떤 제품을 골랐나요? 색과 결이 잘 보이는 사진을 골라 보세요.',
    episode:'현장에서 기억에 남는 순간을 골라 보세요.',
    process:'시공 전과 후의 차이가 보이는 사진을 골라 보세요.',
    tips:'관리 방법을 설명할 부분에 캐릭터를 놓아 보세요.',
    everyday:'오늘 있었던 일에 어울리는 표정이나 포즈를 골라 보세요.',
    question:'사진과 함께 고객님이 자주 묻는 질문을 소개해 보세요.',
    behind:'작업을 준비하거나 마무리하는 순간을 골라 보세요.'
  };
  const phrases={
    product:['빛을 받으니 결이 잘 보여요.','이 색으로 골랐어요.'],episode:['여기서 잠깐 멈췄어요.','이렇게 맞췄어요.'],
    process:['시공 전 모습이에요.','같은 자리에서 다시 봤어요.'],tips:['이 부분을 살펴보세요.','물기는 바로 닦아 주세요.'],
    everyday:['오늘은 여기 왔어요.','잠깐 쉬어 갈까요?'],question:['고객님이 자주 묻는 질문이에요.','현장에 맞춰 설명드릴게요.'],behind:['오늘 쓸 자재예요.','마지막으로 확인해요.']
  };
  const select=$('ml-type');
  for(const option of select.options){
    const button=document.createElement('button');button.type='button';button.textContent=option.text;
    button.onclick=()=>{
      for(const b of $('mh-choices').children)b.setAttribute('aria-pressed',String(b===button));
      $('mh-prompt').textContent=prompts[option.value];
      free.querySelectorAll('[data-mr-phrase]').forEach((b,i)=>{b.textContent=b.dataset.mrPhrase=phrases[option.value][i];});
    };
    $('mh-choices').append(button);
    const preset=button.cloneNode(true);
    preset.onclick=()=>{if(select.value!==option.value){select.value=option.value;select.dispatchEvent(new Event('change'));}};
    select.closest('details').append(preset);
  }
  window.addEventListener('marketing:work-mode',e=>{
    closePicker(); const key=e.detail;
    if(key==='single'){switchMode(key);hub.open=false;}else{hub.open=true;switchMode(key);}
  });
  const home=document.createComment('사진 편집기');
  hub.before(home);
  function mountTools(){
    const slot=$('work-comic-tools')||$('thumbnail-sticker-slot');
    if(slot && document.body.classList.contains('simple-marketing-mode')){
      if(hub.parentElement!==slot){slot.append(hub);hub.open=false;}
    }else if(home.nextSibling!==hub)home.after(hub);
  }
  mountTools();
  window.addEventListener('marketing:sticker-slot-ready',mountTools);
  new MutationObserver(mountTools).observe(document.body,{attributes:true,attributeFilter:['class']});
  function revealTools(){
    const card=hub.closest('.simple-thumbnail-card');
    if(card)card.open=true;
    hub.open=true;
  }
  function openPhotoEditor(id){
    if(window.marketingWorkbench?.active()){window.marketingWorkbench.stickers();return;}
    mountTools();revealTools();switchMode('single');refreshPhotos(id);
    hub.scrollIntoView({block:'nearest'});
  }
  window.addEventListener('marketing:edit-photo',e=>openPhotoEditor(e.detail.id));
  function entry(anchor,production){
    if(!anchor)return;
    const b=document.createElement('button');b.type='button';b.textContent='사진에 마루니·루루 넣기';
    b.onclick=()=>{openPhotoEditor((production?state.signatureSequence?.[state.productionView?.slide||0]?.photoIds?.[0]:null)||state.photos[selected]?.id);};
    anchor.append(b);
  }
  entry($('export-photo').parentElement,false);
  const attach=()=>{const slot=document.querySelector('.simple-photo-card');if(slot&&!slot.querySelector('[data-character-entry]')){entry(slot,true);slot.lastElementChild.dataset.characterEntry='true';}};
  attach();const observer=new MutationObserver(()=>{attach();if(document.querySelector('[data-character-entry]'))observer.disconnect();});observer.observe($('studio'),{childList:true,subtree:true});
  function openGallery(){
    if(location.hash!=='#mh-poses')return;
    document.querySelector('button[data-tab="studio"]')?.click();
    revealTools();switchMode('single');$('mh-poses').scrollIntoView({block:'center'});
  }
  window.addEventListener('hashchange',openGallery);
  window.addEventListener('load',openGallery);
  switchMode('single');
})();
