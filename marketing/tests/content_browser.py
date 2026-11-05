"""Brand-writing integration and legacy regression. Synthetic pixels and product fixtures only."""
from playwright.sync_api import sync_playwright
from pathlib import Path
from legacy_fixture import legacy
import json,os
out=Path(os.environ.get('STUDIO_TEST_OUTPUT','/tmp/content-engine-evidence'));out.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 context=browser.new_context(viewport={'width':1440,'height':1050},accept_downloads=True)
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept())
 page.add_init_script("window.userProducts=()=>state.catalog.filter(p=>!p.id.startsWith('provided-table-'))")
 page.goto('http://127.0.0.1:8000/marketing/');page.wait_for_function('writingReady && easyReady && !easyBusy',timeout=120000)
 old=legacy();page.evaluate("async s=>{await dbPut('current',s)}",old);page.reload();page.wait_for_function('writingReady && easyReady && !easyBusy',timeout=120000);assert page.evaluate("dbGet('pre-content-engine-v1')")==page.evaluate("dbGet('pre-office-v2')") or page.evaluate("(async()=>{const s=await dbGet('pre-content-engine-v1');return s.title})()") ==old['title']
 assert page.evaluate('state.photos.length')==4
 page.locator('[data-tab="products"]').click()
 for key,value in [('category','강마루'),('brand','검증 브랜드'),('model','바닥 테스트 F1'),('size','90×900mm'),('color','검증 밝은색'),('material','검증 소재')]:page.locator('#catalog-'+key).fill(value)
 page.locator('#catalog-features').fill('검증되지 않은 방수성');page.locator('#catalog-form button').first.click();assert page.evaluate('userProducts().length')==1
 # Import floor 2 + wall 2 and preview without writing until confirmed.
 csv='type,category,brand,model,size,color,material,features,source,verified\nfloor,원목마루,검증 브랜드,바닥 F2,120×1200mm,중간색,검증 소재,,,false\nfloor,SPC,검증 브랜드,바닥 F3,180×1200mm,회색,검증 소재,,,false\nwall,벽장재,검증 벽 브랜드,벽 W1,400×800mm,백색,벽 소재,확인한 표면 정보,테스트 제품표,true\nwall,시그니월,검증 벽 브랜드,벽 W2,600×1200mm,웜그레이,벽 소재,,,false\n'
 fixture=out/'test-products.csv';fixture.write_text(csv);page.locator('#catalog-csv').set_input_files(str(fixture));page.wait_for_function("!document.getElementById('confirm-csv').disabled");assert page.evaluate('userProducts().length')==1;page.locator('#confirm-csv').click();assert page.evaluate('userProducts().length')==5
 page.locator('[data-tab="copy"]').click();assert page.locator('#engine-product').input_value()==page.evaluate('userProducts()[0].id')
 # Every registered material must use its own specifications and proper floor/wall language.
 for i in range(5):
  prod=page.evaluate('(i)=>userProducts()[i]',i);page.locator('#engine-product').select_option(prod['id']);page.locator('#make-copy').click();page.wait_for_function('!!state.authoring.draft');caption=page.locator('#engine-caption').input_value();assert prod['model'] in caption and prod['size'] in caption;assert '검증되지 않은 방수성' not in caption
  if prod['type']=='wall':assert '바닥' not in caption
  assert '철거' not in caption
 # No site info, category-only product, no special work: no invented data.
 page.locator('#writing-site').fill('');page.locator('#writing-memo').fill('');page.locator('#engine-product').select_option('category:wall:벽장재');page.locator('#make-copy').click();assert '바닥' not in page.locator('#engine-caption').input_value();assert '검증 브랜드' not in page.locator('#engine-caption').input_value()
 page.evaluate('''async()=>{window.exportText=[];const base=CanvasRenderingContext2D.prototype.fillText;CanvasRenderingContext2D.prototype.fillText=function(t,...a){exportText.push(t);return base.call(this,t,...a)};try{await card('editorial',0)}finally{CanvasRenderingContext2D.prototype.fillText=base}}''');assert all('동화' not in text and '검증 브랜드' not in text for text in page.evaluate('exportText'))
 page.locator('#engine-product').select_option(page.evaluate('userProducts()[3].id'));page.locator('#writing-mode').select_option('craft');page.locator('#work-options input').first.check();page.locator('#make-copy').click();assert '철거' in page.locator('#engine-caption').input_value();assert '샌딩' not in page.locator('#engine-caption').input_value()
 page.locator('#work-options input').first.uncheck();page.locator('#make-copy').click();assert '철거' not in page.locator('#engine-caption').input_value()
 page.locator('#instagram-preview').screenshot(path=str(out/'generated-caption.png'))
 # All outputs editable; approved snapshots survive reload and backup.
 page.locator('#title-choices input[type=radio]').nth(1).check();page.locator('#engine-caption').fill('직접 검토한 게시글입니다.\n공간의 위로가 되다.');page.locator('#approve-writing').click();page.wait_for_timeout(800);page.reload();page.wait_for_function('writingReady && easyReady && !easyBusy',timeout=120000);page.locator('[data-tab="copy"]').click();assert page.locator('#engine-caption').input_value().startswith('직접 검토');assert page.evaluate('state.authoring.approved!==null')
 page.evaluate('scrollTo(0,0)');page.screenshot(path=str(out/'writing-desktop.png'))
 for name,w,h in [('ipad',820,1180),('iphone',390,844),('galaxy',412,915)]:
  page.set_viewport_size({'width':w,'height':h});page.evaluate('scrollTo(0,0)');page.screenshot(path=str(out/f'writing-{name}.png'));assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),name
 page.set_viewport_size({'width':1440,'height':1050});page.locator('#save-post').click();page.locator('#schedule-form button').click();assert page.evaluate('state.posts[0].productSnapshot.type')=='wall';assert page.evaluate('state.posts[0].contentMode')=='craft';assert page.evaluate('state.contentHistory.length')==0
 page.locator('#post-list select').first.select_option('게시 완료');assert page.evaluate('state.contentHistory.length')==1
 previous=page.evaluate('state.contentHistory[0].title');page.locator('[data-tab="copy"]').click();page.locator('#make-copy').click();assert page.evaluate('state.authoring.draft.titles[0]')!=previous
 # Published metrics join product/mode/post, and sparse data does not invent rankings.
 page.locator('[data-tab="growth"]').click();page.locator('#new-followers').fill('8');page.locator('#saves').fill('15');page.locator('#shares').fill('4');page.locator('#insight-form button').click();assert '순위' in page.locator('#content-performance').text_content();assert page.evaluate('Writer.stats(state.posts,state.insights,state.leads).rows[0].followers')==8
 # Image output still works and includes current generated per-card text.
 page.locator('[data-tab="studio"]').click()
 page.wait_for_function('!easyBusy',timeout=120000)
 page.locator('#generate').click();page.wait_for_function("document.querySelectorAll('#designs canvas').length===15",timeout=60000)
 with page.expect_download() as info:page.locator('#designs article').first.locator('button').first.click()
 info.value.save_as(out/'content-card.png')
 page.locator('[data-tab="storage"]').click();page.locator('#archive-project').click();page.wait_for_timeout(400)
 with page.expect_download() as info:page.locator('#backup').click()
 info.value.save_as(out/'backup.json');bundle=json.loads((out/'backup.json').read_text());assert len([p for p in bundle['current']['catalog'] if not p['id'].startswith('provided-table-')])==5;assert len(bundle['current']['authoring']['approvals'])>=1;assert bundle['current']['posts'][0]['contentSnapshot']['caption'].startswith('직접 검토')
 page.evaluate("state.catalog=[]");page.locator('#restore').set_input_files(str(out/'backup.json'));page.wait_for_function("userProducts().length===5");assert page.evaluate('state.contentHistory.length')==1
 page.locator('#new-project').click();page.wait_for_function('state.photos.length===0');assert page.evaluate('userProducts().length')==5;assert page.evaluate('state.contentHistory.length')==1;assert page.evaluate('state.authoring.draft') is None
 assert not errors,errors
 (out/'results.json').write_text(json.dumps({'runtime_errors':errors,'products_3_floor_2_wall':'PASS','missing_facts_unchecked_work':'PASS','CSV_preview_import':'PASS','approve_edit_reload':'PASS','published_history_and_performance':'PASS','photo_and_carousel_preserved':'PASS','migration_archive_backup_restore':'PASS','responsive_chromium_viewports':'PASS'},ensure_ascii=False,indent=2))
 print((out/'results.json').read_text());browser.close()
