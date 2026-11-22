(() => {
  const panel = document.getElementById('simple-marketing-panel');
  if (!panel || !document.getElementById('thumbnail-sticker-slot')) {
    window.addEventListener('marketing:sticker-slot-ready', mount, {once:true});
  } else mount();

  function mount() {
    const panel = document.getElementById('simple-marketing-panel');
    if (!panel || document.getElementById('work-mode')) return;
    const desk = panel.closest('.production-desk'), preview = desk.querySelector('.desk-layout');
    const nav = document.createElement('nav');
    nav.className='work-nav';nav.ariaLabel='편집 도구';
    nav.innerHTML='<label>작업 형식 <select id="work-mode"><option value="single">청인마루 콘텐츠</option><option value="locked">썸네일 + 4컷 만화</option><option value="free">현장 이야기 · 자유 6컷</option></select></label><div class="work-tabs"></div>';
    const selector=nav.querySelector('select'), tabs=nav.querySelector('.work-tabs');
    const stickerBox=document.createElement('section'), comicTools=document.createElement('section'), stage=document.createElement('section');
    stickerBox.id='work-stickers';comicTools.id='work-comic-tools';stage.id='work-comic-preview';
    stage.ariaLabel='선택한 만화 컷 미리보기';stage.hidden=stickerBox.hidden=true;
    panel.prepend(nav,stickerBox,comicTools);preview.append(stage);
    const surfaces={locked:document.querySelector('.ml-canvas-wrap'),free:document.querySelector('.mr-canvas-wrap')};
    const anchors={};
    for(const [key,node] of Object.entries(surfaces)){anchors[key]=document.createComment(key);node.before(anchors[key]);}
    const active=()=>document.body.classList.contains('simple-marketing-mode');
    let section='photo', mode='single';
    function choose(key){
      section=key;panel.dataset.section=key;
      for(const b of tabs.children)b.setAttribute('aria-pressed',String(b.dataset.section===key));
      if(key==='stickers'){
        if(!stickerBox.contains(document.getElementById('mh-poses')))window.dispatchEvent(new CustomEvent('marketing:form-stickers',{detail:stickerBox}));
        stickerBox.hidden=false;
      }else stickerBox.hidden=true;
      panel.scrollTop=0;
    }
    for(const [key,title] of [['photo','사진·표지'],['site','현장·제품'],['copy','문구·출력'],['stickers','캐릭터·말풍선']]){
      const b=document.createElement('button');b.type='button';b.dataset.section=key;b.textContent=title;b.onclick=()=>choose(key);tabs.append(b);
    }
    const comicTabs=document.createElement('div');
    comicTabs.className='work-tabs';nav.append(comicTabs);
    const shortcuts=[
      ['컷·사진','#ml-tabs','#mr-scenes'],
      ['캐릭터','#ml-card-maruni','#mr-tab-maruni'],
      ['말풍선','#ml-format','#mr-format'],
      ['저장·출력','#ml-export-one','#mr-export-one']
    ];
    for(const [label,locked,free] of shortcuts){
      const button=document.createElement('button');button.type='button';button.textContent=label;
      button.onclick=()=>{
        const field=comicTools.querySelector(mode==='locked'?locked:free);
        if(field)panel.scrollBy({top:field.getBoundingClientRect().top-nav.getBoundingClientRect().bottom-10});
      };
      comicTabs.append(button);
    }
    function reflect(key){
      if(mode!==key)panel.scrollTop=0;
      mode=key;selector.value=key;desk.dataset.workMode=key;
      for(const [name,node] of Object.entries(surfaces)){
        if(name===key){if(node.parentElement!==stage)stage.append(node);}
        else if(node.parentElement===stage)anchors[name].after(node);
      }
      const comic=key!=='single';
      stage.hidden=!comic;comicTabs.hidden=!comic;tabs.hidden=comic;comicTools.hidden=!comic;
      stickerBox.hidden=comic||section!=='stickers';
      if(comic)document.body.classList.remove('maruni-editor-scrolling');
    }
    const setMode=key=>window.dispatchEvent(new CustomEvent('marketing:work-mode',{detail:key}));
    selector.onchange=()=>{setMode(selector.value);if(mode==='single')choose(section);};
    function stickers(){if(mode!=='single')setMode('single');choose('stickers');}
    window.marketingWorkbench={active,reflect,stickers};
    desk.addEventListener('click',e=>{
      if(!active()||!e.target.closest('.thumbnail-live-tabs button:last-child'))return;
      e.preventDefault();e.stopPropagation();stickers();
    },true);
    window.dispatchEvent(new Event('marketing:sticker-slot-ready'));
    reflect('single');choose('photo');
    new MutationObserver(()=>{
      if(!active() && mode!=='single')setMode('single');
    }).observe(document.body,{attributes:true,attributeFilter:['class']});
  }
})();
