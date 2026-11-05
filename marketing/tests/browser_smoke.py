from playwright.sync_api import sync_playwright
from pathlib import Path
import json,subprocess,os
from legacy_fixture import legacy as legacy_state
OUT=Path(os.environ.get('STUDIO_TEST_OUTPUT','/tmp/studio-test-evidence'));OUT.mkdir(parents=True,exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 ctx=b.new_context(viewport={'width':1500,'height':1050},accept_downloads=True)
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept())
 page.goto(os.environ.get('STUDIO_TEST_URL','http://127.0.0.1:8000')+'/marketing/');page.wait_for_function('officeReady && writingReady && easyReady && !easyBusy',timeout=120000)
 # Seed a real old-schema snapshot, then reload to exercise automatic backup + migration.
 legacy=legacy_state()
 page.evaluate('''async s=>{await dbPut('current',s);localStorage.setItem('cm_v20_records','preserved-legacy-marker')}''',legacy)
 page.reload();page.wait_for_function('officeReady && writingReady && easyReady && !easyBusy',timeout=120000);assert page.evaluate('state.officeVersion')==2
 old=page.evaluate("dbGet('pre-office-v2')");assert old==legacy
 assert page.locator('#title').input_value()==legacy['title']
 page.locator('[data-tab="studio"]').click()
 # All photos analysed; recommendations stay separate until applied.
 page.locator('#advanced-edit summary').click();page.locator('#analyze-all').click();page.wait_for_function('state.photos.every(p=>p.analysis)')
 assert page.evaluate('state.photos.every(p=>p.autoPrepared)')
 page.locator('#apply-recommendation').click();page.locator('#photo-preview').screenshot(path=str(OUT/'corrected-fixture.png'))
 page.locator('#compare').click();page.locator('#photo-preview').screenshot(path=str(OUT/'original-fixture.png'));page.locator('#compare').click()
 page.locator('#region').fill('서울 성동구');page.locator('#goal').select_option('consultation')
 for i in range(4):page.locator('.thumb').nth(i).click();page.locator('#approve-photo').click()
 page.locator('#generate').click();page.wait_for_function("document.querySelectorAll('#designs canvas').length===15",timeout=90000)
 for i in range(5):
  with page.expect_download() as info:page.locator('#designs article').first.locator('button').nth(i).click()
  info.value.save_as(OUT/f'carousel-{i+1}.png')
 page.evaluate('scrollTo(0,0)');page.screenshot(path=str(OUT/'desktop.png'))
 for name,w,h in [('ipad',820,1180),('iphone',390,844),('galaxy',412,915)]:
  page.set_viewport_size({'width':w,'height':h});page.evaluate('scrollTo(0,0)');page.screenshot(path=str(OUT/f'{name}.png'));assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),name
 page.set_viewport_size({'width':1500,'height':1050})
 # Schedule, metrics upsert and content-to-contract attribution.
 page.locator('[data-tab="copy"]').click();page.locator('#make-copy').click();assert page.locator('#copy-content textarea').count()>=10
 page.locator('#approve-writing').click();page.locator('#save-post').click();page.locator('#schedule-form button').click();assert page.evaluate('state.posts.length')==1
 page.locator('[data-tab="growth"]').click()
 for id,value in [('new-followers','12'),('reach','1000'),('views','2000'),('saves','30'),('shares','9'),('visits','22')]:page.locator('#'+id).fill(value)
 page.locator('#insight-form button').click();page.locator('#insight-form button').click();assert page.evaluate('state.insights.length')==1
 page.locator('#customer-question').fill('난방 시 마루 관리 방법은?');page.locator('#question-form button').click();page.screenshot(path=str(OUT/'growth.png'),full_page=True)
 page.locator('[data-tab="pipeline"]').click();page.locator('#lead-alias').fill('성수 A');page.locator('#lead-post').select_option(index=1);page.locator('#lead-form button').click();page.locator('#lead-list select').select_option('계약');assert page.evaluate("state.leads[0].stage")=='계약';page.screenshot(path=str(OUT/'pipeline.png'))
 # Actual MP4 generation and codec metadata validation.
 page.locator('[data-tab="copy"]').click()
 with page.expect_download(timeout=90000) as info:page.locator('#export-reel').click()
 info.value.save_as(OUT/'reel.mp4')
 result=subprocess.run(['ffprobe','-v','error','-show_entries','stream=codec_name,width,height:format=duration','-of','json',str(OUT/'reel.mp4')],capture_output=True,text=True,check=True)
 meta=json.loads(result.stdout);assert meta['streams'][0]['width']==1080 and meta['streams'][0]['height']==1920;assert float(meta['format']['duration'])>=14
 (OUT/'video-metadata.json').write_text(result.stdout)
 # Complete backup, archive, reload and restore. Legacy localStorage must remain intact.
 page.locator('[data-tab="storage"]').click();page.locator('#archive-project').click();page.wait_for_function("document.querySelectorAll('#project-list button').length===1")
 with page.expect_download() as info:page.locator('#backup').click()
 info.value.save_as(OUT/'backup.json');backup=json.loads((OUT/'backup.json').read_text());assert len(backup['projects'])==1 and len(backup['current']['leads'])==1
 page.locator('[data-tab="studio"]').click();page.locator('#title').fill('temporary');page.locator('[data-tab="storage"]').click();page.locator('#restore').set_input_files(str(OUT/'backup.json'));page.wait_for_function('state.title!=="temporary"')
 page.wait_for_timeout(1000);page.reload();page.wait_for_function('officeReady && writingReady && easyReady && !easyBusy',timeout=120000);assert page.evaluate('state.insights.length')==1;assert page.evaluate("localStorage.getItem('cm_v20_records')")=='preserved-legacy-marker'
 assert page.locator('#run-ai').is_disabled();assert not errors,errors
 print(json.dumps({'errors':errors,'legacy_migration_backup':'PASS','photo_analysis_approval':'PASS','layouts_png':'PASS','responsive_4_sizes':'PASS','growth_upsert':'PASS','consultation_attribution':'PASS','mp4':meta,'archive_backup_restore':'PASS','legacy_storage_preserved':'PASS'},ensure_ascii=False))
 (OUT/'results.json').write_text(json.dumps({'errors':errors,'all_assertions':'PASS','video':meta},ensure_ascii=False,indent=2))
 b.close()
