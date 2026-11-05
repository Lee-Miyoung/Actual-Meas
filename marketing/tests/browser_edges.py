from playwright.sync_api import sync_playwright
from pathlib import Path
import json,os
out=Path(os.environ.get('STUDIO_TEST_OUTPUT','/tmp/studio-test-evidence'))
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);c=b.new_context(viewport={'width':1440,'height':1000});page=c.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept())
 page.goto('http://127.0.0.1:8000/marketing/');page.wait_for_function('officeReady')
 data=json.loads((out/'backup.json').read_text())['current'];page.evaluate('async s=>{state=s;await dbPut("current",s);sync()}',data)
 page.locator('[data-tab="storage"]').click();page.locator('#ai-url').fill('http://127.0.0.1:8787');page.locator('#ai-token').fill('test-token-not-a-real-credential');page.locator('#settings-form button').first.click()
 def route(r):
  if r.request.url.endswith('/health'):body={'configured':True,'dailyLimit':5}
  else:
   source=page.evaluate('''()=>{const c=document.createElement('canvas');c.width=$('photo-preview').width;c.height=$('photo-preview').height;const x=c.getContext('2d');x.fillStyle='white';x.fillRect(0,0,c.width,c.height);return c.toDataURL()}''');body={'image':source}
  r.fulfill(status=200,headers={'Access-Control-Allow-Origin':'http://127.0.0.1:8000','Access-Control-Allow-Headers':'Authorization,Content-Type'},content_type='application/json',body=json.dumps(body))
 page.route('http://127.0.0.1:8787/**',route)
 page.locator('#check-ai').click();page.wait_for_function("!document.getElementById('run-ai').disabled")
 page.locator('[data-tab="studio"]').click();page.locator('.ai-editor summary').click();page.locator('#mask-canvas').scroll_into_view_if_needed();page.wait_for_timeout(200)
 before=page.evaluate("Array.from($('photo-preview').getContext('2d').getImageData(0,0,1,1).data)")
 r=page.locator('#mask-canvas').bounding_box();page.mouse.click(r['x']+r['width']/2,r['y']+r['height']/2);page.locator('#ai-consent').check();page.locator('#run-ai').click();page.wait_for_function('aiCandidate!==null')
 after=page.evaluate("Array.from($('photo-preview').getContext('2d').getImageData(0,0,1,1).data)");assert before==after
 page.locator('#accept-ai').click();page.wait_for_function('state.photos[0].originalSrc!==undefined');assert page.evaluate('!!state.photos[0].originalSrc')
 page.get_by_role('button',name='AI 편집 전 원본 복원').click();assert not page.evaluate('!!state.photos[0].originalSrc')
 # Switching project must not roll back business records.
 page.locator('[data-tab="storage"]').click();page.locator('#archive-project').click();page.wait_for_timeout(300);page.locator('#new-project').click();page.wait_for_function('state.photos.length===0');assert page.evaluate('state.leads.length')==1
 page.locator('#project-list button').first.click();page.wait_for_function('state.photos.length===4');assert page.evaluate('state.leads.length')==1
 # Validate added shape checks without mutating persistent current.
 assert page.evaluate("(()=>{let v=structuredClone(state);v.leads[0].date=5;try{validate(v);return false}catch{return true}})()")
 # Capture current analytics (after lead contribution).
 page.locator('[data-tab="growth"]').click();page.evaluate('scrollTo(0,0)');page.screenshot(path=str(out/'growth.png'))
 page.locator('[data-tab="pipeline"]').click();page.evaluate('scrollTo(0,0)');page.screenshot(path=str(out/'pipeline.png'))
 root=c.new_page();root.goto('http://127.0.0.1:8000/');root.wait_for_function("typeof calculate==='function'");root.evaluate("document.getElementById('login-gate').style.display='none'");root.locator('#zone-width-input').fill('4000');root.locator('#zone-height-input').fill('3000');root.evaluate('addZone()');assert float(root.locator('#input-real-m2').input_value())==12
 root.locator('#cust-name').fill('테스트');root.evaluate('saveRecord()');assert root.evaluate("JSON.parse(localStorage.getItem('cm_v20_records')).length")==1
 assert not errors,errors
 print('PASS: mock-provider mask preserves outside pixels; original restoration; project switching keeps analytics; added schema validation; legacy measurement calculation/save. Real AI provider NOT tested.')
 b.close()
