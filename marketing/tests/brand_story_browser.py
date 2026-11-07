from playwright.sync_api import sync_playwright
from pathlib import Path
import json,os,base64
from legacy_fixture import png
out=Path(os.environ.get('STUDIO_TEST_OUTPUT','/tmp/brand-story-evidence'));out.mkdir(parents=True,exist_ok=True)
for i in range(1,5):(out/f'qa-{i}.png').write_bytes(base64.b64decode(png(i).split(',',1)[1]))
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage']);a=b.new_page(viewport={'width':1440,'height':1050});errors=[];a.on('pageerror',lambda e:errors.append(str(e)));a.on('dialog',lambda d:d.accept())
 a.goto('http://127.0.0.1:8000/marketing/');a.wait_for_function('workflowReady&&easyReady&&typeof brandCampaignFor==="function"');a.locator('#production-files').set_input_files([str(out/f'qa-{i}.png')for i in range(1,5)]);a.wait_for_function('state.photos.length===4&&state.brandStoryMode==="auto"',timeout=90000)
 assert len(set(a.evaluate('Object.keys(BRAND_DIRECTIONS).map(t=>brandCampaignFor(t).titles[0])')))==3
 before=a.evaluate('({titles:brandSettings().titles,captions:state.brandCaptions,theme:state.theme})');a.locator('.direction-trigger').click();a.wait_for_function('document.querySelectorAll(".direction-options canvas").length===3');a.locator('.direction-options button').nth(1).click();a.wait_for_function('state.theme==="gallery"');assert a.evaluate('state.brandCaptions.carousel')!=before['captions']['carousel'];a.locator('#undo-brand-story').click();assert a.evaluate('brandSettings().titles')==before['titles'];assert a.evaluate('state.theme')==before['theme']
 a.locator('#production-title').fill('보존해야 하는 대표 수정 문구');a.locator('#production-title').blur();a.wait_for_timeout(800);a.reload();a.wait_for_function('workflowReady&&document.querySelector("#designs canvas")');assert a.locator('#production-title').input_value()=='보존해야 하는 대표 수정 문구'
 for name,w,h in [('desktop',1440,1050),('ipad',820,1180),('iphone',390,844)]:
  a.set_viewport_size({'width':w,'height':h});assert a.evaluate('document.documentElement.scrollWidth<=innerWidth+1');a.evaluate('scrollTo(0,0)');a.screenshot(path=str(out/f'{name}.png'))
 assert not errors,errors;b.close();report={'automatic_content':'PASS','three_different_intents':'PASS','matching_caption_switch':'PASS','undo_preserves_previous_copy':'PASS','manual_edit_reload':'PASS','responsive':'PASS','runtime_errors':errors};(out/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report))
