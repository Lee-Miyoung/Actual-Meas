"""Project product identity must never be inferred from company consultation brands."""
from playwright.sync_api import sync_playwright
from pathlib import Path
from PIL import Image,ImageDraw
import os,json
out=Path(os.environ.get('STUDIO_TEST_OUTPUT','/tmp/selection-footer'));out.mkdir(parents=True,exist_ok=True)
f=out/'synthetic-pair.jpg';im=Image.new('RGB',(2400,1400),(198,192,182));g=ImageDraw.Draw(im);g.rectangle((1200,0,2400,1400),fill=(208,202,193));g.text((40,40),'SYNTHETIC QA / NOT A CLIENT SITE',fill='black');im.save(f)
with sync_playwright()as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);a=b.new_page(viewport={'width':1440,'height':1050});errors=[];a.on('pageerror',lambda e:errors.append(str(e)));a.on('dialog',lambda d:d.accept())
 a.goto('http://127.0.0.1:8000/marketing/');a.wait_for_function('workflowReady&&easyReady');a.locator('#production-files').set_input_files(str(f));a.wait_for_function('state.photos.length===1&&document.querySelector("#designs canvas")',timeout=60000)
 a.evaluate(r'''async()=>{state.brandStoryMode='manual';state.brandSlides[0]={...state.brandSlides[0],layout:'pair'};state.brandOutput={...brandSettings(),product:'구정마루 블론테 본오크',titles:'주변 마감과 만나는 자리까지'};await renderProductionWorkspace();}''');a.wait_for_selector('.portfolio-selection')
 assert a.locator('[data-fact="installed-product"] dt').inner_text()=='시공 제품';assert a.locator('[data-fact="installed-product"] dd').inner_text()=='구정마루 블론테 본오크'
 assert a.locator('[data-fact="consultation-brands"] dd').inner_text()=='동화 · 구정 · 노바 · 한솔 · 네스트 외';assert a.locator('.portfolio-caption-title').inner_text()=='주변 마감과 만나는 자리까지'
 snapshot=a.evaluate('JSON.stringify({projectId:state.projectId,photos:state.photos.map(p=>({id:p.id,src:p.src,adjust:p.adjust})),output:state.brandOutput,slides:state.brandSlides})')
 # Source-only product facts: category fallback, unknown and absent product stay absent.
 cases=a.evaluate(r'''()=>{const output=document.querySelector('#designs canvas');const original=output.previewMeta,results=[];for(const [name,productData,expected]of [
 ['missing',{},''],['category',{id:'category:floor:강마루',model:''},''],['unconfirmed',{id:'unconfirmed',model:'제품 정보 미입력'},''],
 ['variant',{id:'hansol::joshua',brand:'한솔',model:'스킨마루165',color:'조슈아 내추럴',type:'floor'},'한솔 스킨마루165 조슈아 내추럴'],
 ['wall',{id:'dongwha::white',brand:'동화',model:'시그니월',color:'몬테 화이트',type:'wall'},'동화 시그니월 몬테 화이트']]){
 output.previewMeta={...original,productData};const el=createPortfolioComparison(output);const actual=el.querySelector('[data-fact="installed-product"] dd')?.textContent||'';results.push({name,expected,actual,heading:el.querySelector('h3').textContent,brands:el.querySelector('[data-fact="consultation-brands"] dd').textContent});for(const c of el.querySelectorAll('canvas'))releaseCanvas(c);
 }output.previewMeta=original;return results;}''')
 for c in cases:assert c['actual']==c['expected'],c;assert c['brands']=='동화 · 구정 · 노바 · 한솔 · 네스트 외'
 assert '벽장재' in cases[-1]['heading']
 a.locator('#toast').wait_for(state='hidden',timeout=15000)
 for name,w,h in [('desktop',1440,1050),('ipad-portrait',820,1180),('ipad-landscape',1180,820),('iphone',390,844),('small-phone',320,740)]:
  a.set_viewport_size({'width':w,'height':h});assert a.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  aligned=a.evaluate('''()=>{const el=document.querySelector('.portfolio-selection');const boxes=[el.querySelector('h3'),el.querySelector('p'),...el.querySelectorAll('dt')].map(e=>e.getBoundingClientRect());return Math.max(...boxes.map(b=>b.left))-Math.min(...boxes.map(b=>b.left));}''');assert aligned<=1
  assert a.locator('.portfolio-selection').evaluate('(e)=>e.scrollWidth<=e.clientWidth+1');a.locator('.portfolio-case-copy').screenshot(path=str(out/f'{name}-footer.png'))
 assert a.evaluate('JSON.stringify({projectId:state.projectId,photos:state.photos.map(p=>({id:p.id,src:p.src,adjust:p.adjust})),output:state.brandOutput,slides:state.brandSlides})')==snapshot
 a.set_viewport_size({'width':820,'height':1180});a.locator('#production-next').click();a.wait_for_function('document.querySelector("#designs canvas")?.dataset.slide==="1"');a.locator('#production-prev').click();a.wait_for_function('document.querySelector("#designs canvas")?.dataset.slide==="0"');a.locator('.portfolio-photo').first.click();a.wait_for_selector('#portfolio-zoom canvas');a.locator('#portfolio-zoom button').last.click();a.wait_for_timeout(500);a.reload();a.wait_for_selector('.portfolio-selection');assert a.locator('[data-fact="installed-product"] dd').inner_text()=='구정마루 블론테 본오크'
 assert not errors,errors;b.close();report={'actual_model_variant_binding':'PASS','missing_product_hidden':'PASS','company_brands_separate':'PASS','wall_copy':'PASS','original_caption_preserved':'PASS','left_alignment_5_viewports':'PASS','navigation_zoom_reload':'PASS','unchanged_photo_settings_project':'PASS','runtime_errors':errors};(out/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report))
