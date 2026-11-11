"""Five-field endpoint integration, failure fallback, conflict review and full backup restore."""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json
out=Path('/workspace/product-feed-review');out.mkdir(exist_ok=True)
row={'brand':'연동검증','name':'테스트 마루','model':'본오크','spec':'165×1200×7.5T','category':'바닥재'}
feed={'schema':'cheonginmaru.product-feed.v1','generatedAt':'2026-11-10T00:00:00Z','source':'Lee-Miyoung/maru_calc','digest':'fixture','rows':[row,{'brand':'연동검증','name':'테스트 벽장재','model':'화이트','spec':'1010×2460×9T','category':'벽장재'}]}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for name,width,height in [('desktop',1440,1050),('ipad',820,1180)]:
  a=b.new_page(viewport={'width':width,'height':height},accept_downloads=True);errors=[];requests=[]
  a.on('pageerror',lambda e:errors.append(str(e)));a.on('request',lambda r:requests.append(r.url));a.on('dialog',lambda d:d.accept())
  a.route('**/data/product-source.json',lambda r:r.fulfill(json={'endpoint':'https://quote.example/api/marketing-products'}))
  a.route('**/data/products.json?*',lambda r:r.fulfill(status=503,json={'error':'unavailable'}))
  current=json.loads(json.dumps(feed));fail=[False]
  a.route('https://quote.example/api/marketing-products',lambda r:r.fulfill(status=503 if fail[0] else 200,json={'error':'unavailable'} if fail[0] else current))
  a.goto('http://127.0.0.1:8000/marketing/');a.wait_for_function('window.signatureReady&&workflowReady&&document.getElementById("product-feed-date").textContent.length>0');a.wait_for_function('state.catalog.some(p=>p.brand==="연동검증")')
  a.locator('[data-tab="products"]').click();a.locator('#product-feed-brand').fill('연동검증');assert a.locator('#product-feed-results .product-feed-result').count()==2
  a.evaluate('()=>{state.signatureProjectProduct={brand:"기존",model:"승인 제품",size:"원래 규격"};persist();}')
  prior=a.evaluate('JSON.stringify(state.signatureProjectProduct)');count=a.evaluate('state.catalog.length');current['rows'][0]['spec']='165×1200×8T';current['digest']='changed'
  a.locator('#product-feed-sync').click();a.wait_for_function('document.getElementById("product-feed-conflicts").textContent.includes("규격이 변경")');assert a.evaluate('state.catalog.length')==count
  a.locator('#product-feed-conflicts button').first.click();assert a.evaluate('state.catalog.find(p=>p.brand==="연동검증"&&p.type==="floor").size')=='165×1200×8T';assert a.evaluate('JSON.stringify(state.signatureProjectProduct)')==prior
  fail[0]=True;a.locator('#product-feed-sync').click();a.wait_for_function('document.getElementById("product-feed-status").textContent.includes("동기화 실패")');assert a.evaluate('state.catalog.length')==count
  a.screenshot(path=str(out/(name+'.png')),full_page=True)
  a.locator('[data-tab="storage"]').click()
  with a.expect_download() as d:a.locator('#backup').click()
  file=out/(name+'-backup.json');d.value.save_as(file);data=json.loads(file.read_text());assert data['current']['settings']['productSync']['lastGood']['digest']=='changed'
  a.evaluate('state.catalog=state.catalog.filter(p=>p.brand!=="연동검증")');a.locator('#restore').set_input_files(str(file));a.wait_for_function('state.catalog.some(p=>p.brand==="연동검증")');assert a.evaluate('state.catalog.length')==count
  assert not any('script.google.com' in u or 'raw.githubusercontent.com/Lee-Miyoung/maru_calc' in u for u in requests)
  assert not errors,errors
  print(name+': PASS import, floor/wall, explicit merge, immutable snapshot, last-good fallback, full backup/restore, no raw-sheet requests')
  a.close()
 b.close()
