/* A site has a reason to be wanted, details to consider, and a way to enquire. */
const BRAND_DIRECTIONS=Object.freeze({editorial:{name:'살고 싶은 공간',mode:'editorial',reason:'공간에 마음이 가는 첫 장 → 실제 선택한 소재 → 우리 집 상담'},gallery:{name:'소재를 고르는 안목',mode:'product',reason:'느낌과 컬러 → 확인된 모델·규격 → 내 집에 맞는 선택'},journal:{name:'맡길 수 있는 시공',mode:'craft',reason:'완성 공간 → 확인된 작업과 살펴볼 부분 → 현장 조건 상담'}});
function campaignProduct(){
  const selected=selectedProduct(),manual=brandSettings().product.trim();
  if(manual){
    const key=s=>s.replace(/[\s_·×*(),/\-]/g,'').toLowerCase();const matches=[];
    for(const base of state.catalog){
      for(const value of [base,...(base.variants||[]).map(v=>Writer.resolveProduct(state.catalog,base.id+'::'+v.id))]){
        if([Writer.label(value),value.model+(value.id.includes('::')?' '+value.color:'')].some(s=>key(s)===key(manual)))matches.push(value);
      }
    }
    const unique=[...new Map(matches.map(p=>[p.id,p])).values()];
    if(unique.length===1)return {...unique[0],...(brandSettings().size?{size:brandSettings().size}:{})};
    if(selected&&[Writer.label(selected),selected.model].includes(manual))return {...selected,...(brandSettings().size?{size:brandSettings().size}:{})};
    // An unrecognised manual name never inherits another model's size or claims.
    return {id:'manual',type:'floor',category:'마감재',model:manual,size:brandSettings().size||''};
  }
  return selected&&!selected.id.startsWith('category:')?selected:{id:'unconfirmed',type:'floor',category:'마감재',size:brandSettings().size||''};
}
function campaignInput(){return {product:campaignProduct(),stage:state.siteStage||'unknown',site:state.marketingSite||state.region||'',memo:state.authoring?.memo||state.memo||'',works:state.authoring?.works||[],photoCount:state.photos.length,count:state.slideCount||5,contact:state.settings?.kakao||state.settings?.website||''};}
function campaignKey(){return JSON.stringify({...campaignInput(),photos:state.photos.map(p=>p.id)});}
function brandCampaignFor(theme){
  const key=campaignKey();if(state.brandStories?.key!==key){
    const input=campaignInput();state.brandStories={version:1,key,directions:Object.fromEntries(Object.entries(BRAND_DIRECTIONS).map(([id,d])=>[id,Writer.create({...input,mode:d.mode},state.contentHistory||[],0)]))};
  }
  return state.brandStories.directions[theme]||state.brandStories.directions.editorial;
}
function canUseBrandCampaign(){return state.brandStoryMode==='auto';}
function applyBrandDirection(theme){
  const draft=brandCampaignFor(theme);state.theme=theme;
  state.brandOutput={...brandSettings(),titles:draft.carousel.map(c=>c.text.replace(/\n/g,' ')).join('\n')};
  state.brandSlides=draft.carousel.map((c,i)=>({...state.brandSlides?.[i],title:c.text,photo:state.brandSlides?.[i]?.photo||state.photos[(c.photo-1)%state.photos.length]?.name||''}));
  state.brandCaptions={carousel:draft.caption+'\n\n'+draft.hashtags,naver:draft.blog,naverCover:draft.blog,kakao:draft.kakao,kakaoWide:draft.kakao,youtube:draft.caption,reels:draft.shorts,shorts:draft.shorts,story:draft.story,youtubeCover:draft.titles[0]};
  syncBrandControls();persist();
}
async function prepareBrandStories({apply=false,resetPhotos=false}={}){
  if(!state.photos.length||!writingReady)return;
  if(resetPhotos){
    for(const p of state.photos)if(!p.analysis)await analysePhoto(p);duplicates();
    const order=photoOrder();state.brandSlides=Array.from({length:state.slideCount||5},(_,i)=>({photo:order[i%order.length].name,title:''}));
  }
  brandCampaignFor(state.theme);
  if(apply){state.brandStoryMode='auto';applyBrandDirection(state.theme);}
}
window.brandCampaignFor=brandCampaignFor;window.canUseBrandCampaign=canUseBrandCampaign;window.prepareBrandStories=prepareBrandStories;
// Bring the existing catalogue selector into the daily production workflow.
const campaignPicker=$('quick-product').closest('label');campaignPicker.firstChild.textContent='제품 도감 · 선택하면 규격 자동 연결';document.querySelector('.production-facts').before(campaignPicker);
$('quick-product').addEventListener('change',()=>{
  state.brandOutput={...brandSettings(),product:'',size:''};delete state.brandStories;
  if(canUseBrandCampaign())applyBrandDirection(state.theme);
  window.renderProductionWorkspace();
});
for(const id of ['brand-product','brand-size'])$(id).addEventListener('change',()=>{delete state.brandStories;if(canUseBrandCampaign())applyBrandDirection(state.theme);window.renderProductionWorkspace();});
for(const id of ['brand-titles','brand-caption'])$(id).addEventListener('change',()=>{state.brandStoryMode='manual';persist();});
$('production-style').addEventListener('change',()=>{if(canUseBrandCampaign())applyBrandDirection(state.theme);window.renderProductionWorkspace();});
$('story-draft').onclick=()=>{
  const draft=brandCampaignFor(state.theme),host=$('story-review');host.replaceChildren();
  draft.carousel.forEach((c,i)=>host.append(node('p',`${i+1}. ${c.role} / ${c.text}`)));host.append(node('p',draft.caption,'draft-caption'));host.hidden=false;$('story-apply').disabled=false;
  $('story-suggestion').textContent='검토한 뒤 적용하면 현재 작업의 문구를 교체합니다. 승인된 채널 원고는 유지됩니다.';
};
$('story-apply').onclick=()=>{selectBrandDirection(state.theme);window.renderProductionWorkspace();$('story-suggestion').textContent='적용했습니다. 카드별 문구는 계속 수정할 수 있습니다.';};
const stageLabel=node('label','현장 상태'),stageSelect=node('select');stageSelect.id='campaign-stage';
for(const [value,label]of [['unknown','확인 전 · 완료로 표현하지 않음'],['before','시공 전'],['progress','시공 중'],['complete','시공 완료']])stageSelect.append(new Option(label,value));
stageSelect.value=state.siteStage||'unknown';stageLabel.append(stageSelect);campaignPicker.after(stageLabel);
stageSelect.onchange=()=>{state.siteStage=stageSelect.value;delete state.brandStories;if(canUseBrandCampaign())applyBrandDirection(state.theme);persist();window.renderProductionWorkspace();};
const campaignSummary=node('section',undefined,'campaign-summary');
campaignSummary.innerHTML='<span class="eyebrow">청인마루 콘텐츠 방향</span><h3 id="campaign-name"></h3><p id="campaign-reason"></p>';
$('production-platforms').before(campaignSummary);
const undoWriting=node('button','이전 문구로 되돌리기');undoWriting.type='button';undoWriting.id='undo-brand-story';campaignSummary.append(undoWriting);
function updateCampaignSummary(){
  stageSelect.value=state.siteStage||'unknown';
  const direction=BRAND_DIRECTIONS[state.theme]||BRAND_DIRECTIONS.editorial;
  $('campaign-name').textContent=direction.name;$('campaign-reason').textContent=direction.reason;
  undoWriting.hidden=!state.brandStoryVersions?.length;
}
function selectBrandDirection(theme){
  state.brandStoryVersions??=[];state.brandStoryVersions.push({at:new Date().toISOString(),photoIds:state.photos.map(p=>p.id).join('|'),theme:state.theme,stage:state.siteStage||'unknown',mode:state.brandStoryMode||'manual',output:structuredClone(brandSettings()),slides:structuredClone(state.brandSlides||[]),captions:structuredClone(state.brandCaptions||{})});
  if(state.brandStoryVersions.length>20)state.brandStoryVersions.shift();
  state.brandStoryMode='auto';applyBrandDirection(theme);updateCampaignSummary();
}
undoWriting.onclick=()=>{
  const previous=state.brandStoryVersions?.at(-1);if(!previous)return;
  if(previous.photoIds!==state.photos.map(p=>p.id).join('|'))return toast('사진 구성이 다른 이전 원고입니다. 현재 작업을 보존했습니다.');
  state.brandStoryVersions.pop();state.siteStage=previous.stage||'unknown';$('campaign-stage').value=state.siteStage;delete state.brandStories;state.theme=previous.theme;state.brandStoryMode=previous.mode;state.brandOutput=previous.output;state.brandSlides=previous.slides;state.brandCaptions=previous.captions;
  syncBrandControls();persist();window.renderProductionWorkspace();
};
window.selectBrandDirection=selectBrandDirection;window.updateCampaignSummary=updateCampaignSummary;
const renderBeforeCampaign=window.renderProductionWorkspace;
window.renderProductionWorkspace=async function(){updateCampaignSummary();return renderBeforeCampaign();};
const campaignBoot=setInterval(async()=>{
  if(!writingReady||!easyReady)return;clearInterval(campaignBoot);
  const titles=brandSettings().titles.split('\n').filter(Boolean);
  if(state.photos.length&&!state.brandStoryMode&&titles.length&&titles.every(t=>/^(시공 기록|현장 기록)$/.test(t.trim()))){
    await dbPut('pre-brand-stories:'+Date.now(),structuredClone(state));await prepareBrandStories({apply:true});
  }
  await window.renderProductionWorkspace();
},100);
