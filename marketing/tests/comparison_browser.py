"""Reproduce the reported iPhone comparison using retained contain/manual settings."""
from playwright.sync_api import sync_playwright
from pathlib import Path
from PIL import Image,ImageDraw
import os,json,hashlib
out=Path(os.environ.get('STUDIO_TEST_OUTPUT','/tmp/comparison-evidence'));out.mkdir(parents=True,exist_ok=True)
photo=out/'synthetic-progress.jpg';im=Image.new('RGB',(1200,1600),(206,206,196));g=ImageDraw.Draw(im);g.polygon([(0,1000),(1200,900),(1200,1600),(0,1600)],fill=(132,131,121));g.rectangle((800,150,1150,950),fill=(229,236,231));g.rectangle((370,940,600,1070),fill=(139,95,62));g.text((50,50),'QA CONSTRUCTION SCENE / NOT A CLIENT SITE',fill='black');im.save(photo,quality=90)
report={}
with sync_playwright()as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 for name,device in [('iphone',p.devices['iPhone 13']),('ipad',p.devices['iPad Pro 11'])]:
  ctx=b.new_context(**device,accept_downloads=True);a=ctx.new_page();errors=[];a.on('pageerror',lambda e:errors.append(str(e)));a.on('dialog',lambda d:d.accept())
  a.goto('http://127.0.0.1:8000/marketing/');a.wait_for_function('workflowReady&&easyReady');a.locator('#production-files').set_input_files(str(photo));a.wait_for_function('state.photos.length===1&&state.brandStoryMode==="auto"',timeout=60000)
  a.evaluate('()=>{state.brandOutput={...brandSettings(),fit:"contain",titles:"소재가 만나는 자리까지, 보고 결정하세요"};state.brandStoryMode="manual";persist();}');a.wait_for_timeout(600);a.reload();a.wait_for_function('workflowReady&&document.querySelector("#designs canvas")');assert a.evaluate('brandSettings().fit')=='contain'
  checks=a.evaluate('''async()=>{const list=[];for(const theme of ['editorial','gallery','journal']){const c=await card(theme,0,'carousel',true);list.push({theme,width:c.width,height:c.height,renderer:c.dataset.renderer,src:c.toDataURL(),photos:c.photoLayout});releaseCanvas(c);}return list;}''')
  assert len(set(hashlib.sha256(c['src'].encode()).hexdigest()for c in checks))==3
  for c in checks:
   assert c['renderer']=='cheongin-comparison-v6';assert c['width']==1080 and c['height']==1350;assert c['photos']
   for ph in c['photos']:assert ph['fit']=='contain';assert abs(ph['width']/ph['height']-ph['sourceWidth']/ph['sourceHeight'])<1e-6
  a.locator('.direction-trigger').click();a.wait_for_function('document.querySelectorAll(".direction-options canvas").length===3')
  assert a.locator('#direction-dialog').is_visible();bounds=a.locator('.direction-art canvas').first.bounding_box();assert bounds['width']>=260,bounds
  assert a.evaluate('document.getElementById("direction-dialog").scrollWidth<=innerWidth+1')
  a.screenshot(path=str(out/f'{name}-comparison.png'))
  a.locator('.direction-navigation button').last.click();a.wait_for_function('document.querySelector(".direction-navigation span").textContent.includes("02")',timeout=10000)
  a.locator('.direction-apply').nth(1).click();a.wait_for_function('state.theme==="gallery"');assert a.evaluate('brandSettings().fit')=='contain';a.locator('#undo-brand-story').click();assert a.evaluate('brandSettings().titles')=='소재가 만나는 자리까지, 보고 결정하세요'
  # The stage selector changes proposals; no image classifier or completed-site claim is invented.
  a.locator('#campaign-stage').select_option('progress');a.evaluate('selectBrandDirection("journal")');assert a.evaluate('brandCampaignFor("journal").stage')=='progress';assert '진행 중' in a.evaluate('brandCampaignFor("journal").titles[0]')
  a.locator('#campaign-stage').select_option('complete');assert a.evaluate('brandCampaignFor("journal").stage')=='complete'
  a.wait_for_timeout(500);a.reload();a.wait_for_function('workflowReady');assert a.evaluate('state.siteStage')=='complete';assert a.locator('#campaign-stage').input_value()=='complete'
  assert not errors,errors;report[name]={'legacy_contain_three_distinct_designs':'PASS','uncropped_photo_ratio':'PASS','large_swipe_gallery':'PASS','apply_undo_saved_copy':'PASS','stage_copy_reload':'PASS','runtime_errors':errors};ctx.close()
 b.close()
(out/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False))
