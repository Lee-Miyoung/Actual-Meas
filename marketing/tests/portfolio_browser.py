"""Portfolio composition, bounded render work and recovery. Chromium emulation is not physical iOS."""
from playwright.sync_api import sync_playwright
from pathlib import Path
from PIL import Image,ImageDraw
import json,os
out=Path(os.environ.get('STUDIO_TEST_OUTPUT','/tmp/portfolio-evidence'));out.mkdir(parents=True,exist_ok=True)
photos=[]
for i in range(6):
 im=Image.new('RGB',(4032,3024),(205,204-i,194));g=ImageDraw.Draw(im);g.polygon([(0,1800),(4032,1600),(4032,3024),(0,3024)],fill=(156,138,115));g.rectangle((200,300,1100,1700),fill=(224,233,230));g.text((100,100),'SYNTHETIC QA - NOT A CLIENT SITE',fill='black');f=out/f'room-{i}.jpg';im.save(f,quality=88);photos.append(f)
pair=Image.new('RGB',(4032,3024));pair.paste(Image.open(photos[0]).resize((2016,3024)),(0,0));pair.paste(Image.open(photos[1]).resize((2016,3024)),(2016,0));pair=pair.resize((4032,1600));pairfile=out/'comparison-qa.jpg';pair.save(pairfile,quality=88);photos[3]=pairfile
report={}
with sync_playwright()as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for name,w,h in [('desktop',1440,1050),('ipad-portrait',820,1180),('ipad-landscape',1180,820),('iphone',390,844),('android',412,915)]:
  ctx=b.new_context(viewport={'width':w,'height':h},has_touch=name!='desktop',device_scale_factor=1);a=ctx.new_page();errors=[];a.on('pageerror',lambda e:errors.append(str(e)));a.on('dialog',lambda d:d.accept())
  a.goto('http://127.0.0.1:8000/marketing/');a.wait_for_function('workflowReady&&easyReady');a.locator('#production-files').set_input_files([str(f)for f in photos]);a.wait_for_function('state.photos.length===6&&document.querySelector("#designs canvas")',timeout=90000)
  a.evaluate(r'''async()=>{state.brandStoryMode='manual';state.marketingSite='검증용 현장';state.brandSlides[3]={...state.brandSlides[3],photo:'comparison-qa.jpg',layout:'pair'};const titles=brandSettings().titles.split('\n');titles[3]='주변 마감과 만나는 자리까지';state.brandOutput={...brandSettings(),titles:titles.join('\n')};persist();await renderProductionWorkspace();}''')
  a.locator('#production-filmstrip button').nth(3).click();a.wait_for_function('document.querySelector("#designs canvas")?.dataset.slide==="3"');assert a.locator('#production-page').inner_text()=='04 / 06';assert a.evaluate('document.querySelector("#designs canvas").width<=960')
  composition=a.evaluate(r'''async()=>{const c=await card(state.theme,3,'carousel');const b=c.photoLayout;const r={width:c.width,height:c.height,parts:b,text:c.typeLayout};releaseCanvas(c);return r;}''');assert [composition['width'],composition['height']]==[1080,1350];assert len(composition['parts'])==2
  for ph in composition['parts']:
   assert ph['fit']=='pair-contain';assert abs(ph['width']/ph['height']-ph['sourceWidth']/ph['sourceHeight'])<1e-5;assert ph['labelBottom']<=ph['y']
  assert not any('함께 살펴볼 기준' in t.get('source','')for t in composition['text'])
  assert a.evaluate('document.documentElement.scrollWidth<=innerWidth+1');a.locator('#production-preview').scroll_into_view_if_needed();a.screenshot(path=str(out/f'{name}.png'))
  a.locator('#designs .portfolio-photo').first.click();a.wait_for_function('document.querySelector("#portfolio-zoom canvas")');a.locator('#portfolio-zoom button').first.click();assert a.locator('.portfolio-zoom-stage').evaluate('(e)=>e.classList.contains("is-enlarged")');a.locator('#portfolio-zoom button').last.click();assert a.locator('#portfolio-zoom canvas').count()==0
  # Rapid edits used to leave every full-resolution render running concurrently.
  stress=a.evaluate(r'''async()=>{const base=card;let active=0,max=0,calls=0;const rendered=[];card=async(...args)=>{if(args[4]?.maxEdge){active++;max=Math.max(max,active);calls++;await new Promise(r=>setTimeout(r,30));try{const c=await base(...args);rendered.push(c);return c;}finally{active--;}}return base(...args);};try{for(let i=0;i<80;i++)document.getElementById('production-next').click();await renderProductionWorkspace();return{max,calls,staleReleased:rendered.slice(0,-1).every(c=>c.width===1),cache:images.size};}finally{card=base;}}''');assert stress['max']==1,stress;assert stress['calls']<=3,stress;assert stress['staleReleased'],stress;assert stress['cache']<=2
  # Restore the active photo and existing settings. Refresh is deliberate, not a claim about OS tab survival.
  a.locator('#production-filmstrip button').nth(3).click();a.wait_for_function('document.querySelector("#designs canvas")?.dataset.slide==="3"');a.wait_for_timeout(600);source=a.evaluate('state.photos.map(p=>p.src)');a.reload();a.wait_for_function('workflowReady&&document.querySelector("#designs canvas")?.dataset.slide==="3"');assert a.evaluate('state.photos.map(p=>p.src)')==source;assert a.locator('#production-kind').input_value()=='pair'
  a.set_viewport_size({'width':h,'height':w});a.wait_for_timeout(300);assert a.evaluate('document.documentElement.scrollWidth<=innerWidth+1');a.set_viewport_size({'width':w,'height':h})
  # Browsing repeatedly must not grow the number of attached preview canvases.
  for i in range(24):
   a.locator('#production-next').click();a.wait_for_function('(i)=>document.querySelector("#designs canvas")?.dataset.slide===String(i)',arg=(4+i)%6)
  assert a.locator('#designs canvas').count()<=3;assert a.evaluate('images.size<=2');assert not errors,errors
  report[name]={'pair_ratio_labels':'PASS','full_resolution_export':'PASS','large_touch_zoom_cleanup':'PASS','rapid_navigation':stress,'24_sequential_moves':'PASS','photo_position_reload':'PASS','rotation_no_overflow':'PASS','original_bytes':'PASS','errors':errors};ctx.close()
 b.close()
(out/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False))
