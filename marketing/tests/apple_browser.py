"""Touch/Safari-path regressions in Chromium. Native share is a test double, not an OS Photos test."""
from playwright.sync_api import sync_playwright
from pathlib import Path
from PIL import Image,ImageDraw
import os,json,zipfile,base64
out=Path(os.environ.get('STUDIO_TEST_OUTPUT','/tmp/apple-evidence'));out.mkdir(parents=True,exist_ok=True)
photos=[]
for i in range(10):
 im=Image.new('RGB',(4032,3024),(213-i,211-i,200));g=ImageDraw.Draw(im);g.polygon([(0,1700),(4032,1600),(4032,3024),(0,3024)],fill=(162,140+i,112));
 for x in range(0,4032,240):g.line((x,1670,x+420,3024),fill=(120,102,80),width=4)
 g.rectangle((350,350,1600,1500),fill=(227,235,233));g.text((100,100),'SYNTHETIC QA - NOT A CLIENT SITE',fill='black');f=out/f'qa-{i+1}.jpg';im.save(f,quality=86);photos.append(f)
report={}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for device in ['iPhone 13','iPad Pro 11']:
  ctx=b.new_context(**p.devices[device],accept_downloads=True);a=ctx.new_page();errors=[];a.on('pageerror',lambda e:errors.append(str(e)));a.on('dialog',lambda d:d.accept())
  a.add_init_script("Object.defineProperty(navigator,'canShare',{value:()=>true});Object.defineProperty(navigator,'share',{value:async data=>{window.testSharedFiles=data.files.map(f=>({name:f.name,type:f.type,size:f.size}));}})")
  a.goto('http://127.0.0.1:8000/marketing/');a.wait_for_function('workflowReady&&easyReady');assert a.evaluate('appleTouchDevice')
  a.locator('#production-files').set_input_files([str(f)for f in photos[:4]]);a.wait_for_function('state.photos.length===4&&document.querySelector("#designs canvas")?.dataset.renderer==="cheongin-stories-v4"',timeout=90000)
  assert a.evaluate('document.documentElement.scrollWidth<=innerWidth+1');assert a.evaluate('state.photos.every(p=>p.sourceWidth===4032&&!!p.thumbnail)')
  assert a.evaluate('images.size<=2');assert a.locator('#production-title').evaluate('(el)=>parseFloat(getComputedStyle(el).fontSize)>=16')
  a.locator('.direction-trigger').click();a.wait_for_function('document.querySelectorAll(".direction-options canvas").length===3',timeout=60000);a.locator('.direction-options button').nth(1).click();a.wait_for_function('state.theme==="gallery"&&document.querySelector("#designs canvas")?.dataset.design==="gallery"')
  a.locator('#production-title').fill('자연스러운 공간의 기록');a.locator('#production-title').blur();a.wait_for_timeout(500)
  a.locator('#production-export').click();a.locator('#device-export').wait_for(state='visible',timeout=90000);assert a.locator('.device-export-gallery img').count()==4
  a.locator('.device-export-actions button').click();assert len(a.evaluate('testSharedFiles'))==4;assert a.evaluate('testSharedFiles.every(f=>f.type==="image/png"&&f.size>1000)')
  with a.expect_download() as dl:a.locator('.device-export-actions a').click()
  dl.value.save_as(out/(device.replace(' ','-')+'.zip'))
  with zipfile.ZipFile(out/(device.replace(' ','-')+'.zip')) as z:assert z.testzip()is None;assert len([n for n in z.namelist()if n.endswith('.png')])==4
  a.locator('#device-export .export-close').click();a.screenshot(path=str(out/(device.replace(' ','-')+'.png')),full_page=True)
  # Compressed production ZIP works even where Safari cannot construct deflate-raw streams.
  kit=a.evaluate('currentBrandKit()');package=out/'compressed-production.zip'
  with zipfile.ZipFile(package,'w',zipfile.ZIP_DEFLATED)as z:
   z.writestr('production.json',json.dumps(kit,ensure_ascii=False));
   for f in photos[:4]:z.write(f,f.name)
  a.evaluate('()=>{window.DecompressionStream=class{constructor(){throw new TypeError("not supported")}}}');a.locator('#production-files').set_input_files(str(package));a.wait_for_function('document.getElementById("production-import-status").textContent.includes("을 불러왔습니다")',timeout=90000)
  assert a.evaluate('state.photos.length===4');a.reload();a.wait_for_function('workflowReady&&document.querySelector("#designs canvas")');assert a.evaluate('state.photos.length===4');assert a.locator('#production-title').input_value()=='자연스러운 공간의 기록'
  a.evaluate('()=>{window.testRecordResult="";recordMarketingVideo(i=>card("editorial",i,"reels"),3).then(()=>window.testRecordResult="unexpected").catch(e=>window.testRecordResult=e.message);}')
  a.locator('#video-stage button').wait_for(state='visible',timeout=60000);a.locator('#video-stage button').click();a.wait_for_function('window.testRecordResult.includes("중단")',timeout=30000);assert a.locator('#video-stage').count()==0;assert a.evaluate('state.photos.length')==4
  # Ten full-resolution originals, bounded working cache, repeated theme/platform changes.
  a.locator('#production-files').set_input_files([str(f)for f in photos]);a.wait_for_function('state.photos.length===10&&document.getElementById("production-import-status").textContent.includes("을 불러왔습니다")',timeout=90000)
  for fmt in ['reels','kakao','naver','youtube','carousel']:
   a.locator('#production-platforms button').filter(has_text=a.evaluate('(f)=>OUTPUT_PRESETS[f].label',fmt)).click();a.wait_for_function('(fmt)=>document.querySelector("#designs canvas")?.dataset.platform===fmt',arg=fmt,timeout=60000)
  assert a.evaluate('images.size<=2');assert not errors,errors
  report[device]={'upload_10_originals':'PASS','working_cache_max_2':'PASS','design_compare':'PASS','manual_share_files_test_double':'PASS','PNG_ZIP':'PASS','old_Safari_ZIP_fallback':'PASS','reload':'PASS','cancel_recording_preserves_work':'PASS','no_horizontal_page_overflow':'PASS','runtime_errors':errors};ctx.close()
 b.close()
(out/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False))
