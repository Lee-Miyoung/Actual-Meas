"""Phase 1 site-centered workflow, using synthetic photos and private test profiles."""
from playwright.sync_api import sync_playwright
from pathlib import Path
from legacy_fixture import png
import base64,json,os,zipfile,io,subprocess
out=Path(os.environ.get('STUDIO_TEST_OUTPUT','/tmp/workflow-evidence'));out.mkdir(parents=True,exist_ok=True)
for i in range(2):(out/f'site-{i}.png').write_bytes(base64.b64decode(png(i).split(',',1)[1]))
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage']);ctx=b.new_context(viewport={'width':1440,'height':1050},accept_downloads=True);page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept())
 page.goto('http://127.0.0.1:8000/marketing/');page.wait_for_function('workflowReady',timeout=60000);assert page.locator('#dashboard').is_visible();assert '미기록' in page.locator('#today-metrics').text_content();assert page.evaluate('state.channelJobs.length')==0
 def register(n,name):
  page.locator('#open-site-form').click();page.locator('#site-name').fill(name);page.locator('#site-region').fill('서울 성동구');page.locator('#site-space').fill('거실');page.locator('#site-product').select_option(page.evaluate("state.catalog.find(p=>p.model==='스킨마루165').id"));page.locator('#site-photos').set_input_files(str(out/f'site-{n}.png'));page.locator('#register-site').click();page.wait_for_function('(n)=>(state.channelJobs.length===n && !workflowBusy && !easyBusy)||document.getElementById("site-progress").classList.contains("validation-error")',arg=(n+1)*4,timeout=120000);assert page.evaluate('state.channelJobs.length')==(n+1)*4,page.locator('#site-progress').text_content()
 register(0,'검증 현장 A');assert page.evaluate('state.projectIndex.length')==1;assert page.evaluate('state.region')=='서울 성동구';first_id=page.evaluate('state.projectId');number1=page.evaluate('state.projectNumber');assert page.evaluate('state.channelJobs.every(j=>j.projectId===state.projectId)');assert len(set(page.evaluate('state.channelJobs.map(j=>j.draft.body)')))==4
 website=page.evaluate("state.channelJobs.find(j=>j.channel==='website').id");page.evaluate('(id)=>openJob(id)',website);page.locator('#channel-actions button').filter(has_text='홈페이지 파일').click();page.wait_for_timeout(200);assert '승인된' in page.locator('#site-progress').text_content()
 # Draft edit persists independently of source regeneration.
 page.locator('#channel-body').fill('검토를 위한 홈페이지 원고. 공간의 위로가 되다.');page.wait_for_timeout(800);page.reload();page.wait_for_function('workflowReady && !workflowBusy',timeout=120000);assert page.evaluate("state.channelJobs.find(j=>j.channel==='website').draft.body").startswith('검토를 위한')
 # New source facts do not overwrite a manually edited draft.
 page.locator('[data-tab="copy"]').click();page.locator('#writing-memo').fill('검증된 추가 현장 메모');page.locator('[data-tab="dashboard"]').click();page.locator('#prepare-site-channels').click();page.wait_for_function("state.channelJobs.find(j=>j.channel==='website').pendingDraft!==undefined",timeout=60000)
 assert page.evaluate("state.channelJobs.find(j=>j.channel==='website').draft.body").startswith('검토를 위한')
 page.evaluate('(id)=>openJob(id)',website);page.locator('#channel-actions button').filter(has_text='다음 초안').click();assert page.evaluate("state.channelJobs.find(j=>j.channel==='website').versions.some(v=>v.content.body.startsWith('검토를 위한'))")
 page.locator('#review-project').click();assert page.evaluate("state.channelJobs.every(j=>j.status==='검토')");page.locator('#approve-project').click();assert page.evaluate("state.channelJobs.every(j=>j.status==='승인'&&j.approved)")
 # Website approved package is inert, scoped and contains no private CRM data.
 page.evaluate('(id)=>openJob(id)',website)
 with page.expect_download(timeout=60000) as d:page.locator('#channel-actions button').filter(has_text='홈페이지 파일').click()
 d.value.save_as(out/'approved-website.zip')
 with zipfile.ZipFile(out/'approved-website.zip') as z:
  assert z.testzip() is None;assert 'case.html' in z.namelist();manifest=json.loads(z.read('manifest.json'));assert 'source' not in manifest['product'];assert 'leads' not in manifest;assert b'<script' not in z.read('case.html')
 # Ordered state changes produce a linked calendar post; metrics require actual recorded data.
 page.locator('#channel-date').fill('2026-11-06');page.locator('#channel-actions button').filter(has_text='게시 예정으로').click();assert page.evaluate("state.channelJobs.find(j=>j.channel==='website').status")=='게시 예정';post_id=page.evaluate("state.channelJobs.find(j=>j.channel==='website').postId");assert page.evaluate('(id)=>state.posts.find(p=>p.id===id).projectId',post_id)==first_id
 page.locator('#channel-actions button').filter(has_text='완료 기록').click();page.locator('#channel-actions button').filter(has_text='성과 분석 완료').click();assert '실제 성과' in page.locator('#site-progress').text_content()
 page.evaluate('(id)=>{state.insights.push({postId:id,type:"시공 사례",followers:0,reach:100,views:110,saves:2,shares:1,visits:3});persist()}',post_id);page.locator('#channel-actions button').filter(has_text='성과 분석 완료').click();assert page.evaluate("state.channelJobs.find(j=>j.channel==='website').status")=='성과 분석'
 # Actual IG artifacts still render from immutable approved source references.
 ig=page.evaluate("state.channelJobs.find(j=>j.channel==='instagram').id");page.evaluate('(id)=>openJob(id)',ig)
 with page.expect_download(timeout=60000) as d:page.locator('#channel-actions button').filter(has_text='원고·사진 ZIP').click()
 d.value.save_as(out/'instagram.zip');assert page.evaluate("state.channelJobs.find(j=>j.channel==='instagram').generatedVersions[0].files.length")>=5;assert page.evaluate("(()=>{const j=state.channelJobs.find(j=>j.channel==='instagram');return j.generatedVersions[0].content.title===j.approved.title})()")
 with zipfile.ZipFile(out/'instagram.zip') as z:assert len([n for n in z.namelist() if n.startswith('carousel-')])==5;assert 'story.png' in z.namelist();assert z.testzip() is None
 with page.expect_download(timeout=90000) as d:page.locator('#channel-actions button').filter(has_text='릴스 MP4').click()
 d.value.save_as(out/'project-reel.mp4');probe=subprocess.run(['ffprobe','-v','error','-show_entries','stream=codec_name,width,height:format=duration','-of','json',str(out/'project-reel.mp4')],capture_output=True,text=True,check=True);meta=json.loads(probe.stdout);assert meta['streams'][0]['width']==1080;assert float(meta['format']['duration'])>=14
 for theme in ['gallery','journal']:
  assert page.evaluate('''async theme=>{const j=state.channelJobs.find(j=>j.channel==='instagram');const c=await workflowCard({...j.approved,theme},0);return c.width===1080&&c.height===1350}''',theme)
 page.evaluate('scrollTo(0,0)');page.screenshot(path=str(out/'dashboard.png'))
 # A new source revision preserves the prior published post and its measurements.
 page.locator('[data-tab="copy"]').click();page.locator('#writing-memo').fill('새로 확인한 현장 기록');page.locator('[data-tab="dashboard"]').click();page.locator('#prepare-site-channels').click();page.wait_for_function("state.channelJobs.find(j=>j.channel==='website').pendingDraft!==undefined",timeout=60000)
 page.evaluate('(id)=>openJob(id)',website);page.locator('#channel-actions button').filter(has_text='다음 초안').click();assert page.evaluate('(id)=>state.posts.some(p=>p.id===id)',post_id);assert page.evaluate('(id)=>state.insights.some(i=>i.postId===id)',post_id)
 page.locator('#channel-actions button').filter(has_text='검토 요청').click();page.locator('#channel-actions button').filter(has_text='원고 승인').click();page.locator('#channel-actions button').filter(has_text='게시 예정으로').click();new_post=page.evaluate("state.channelJobs.find(j=>j.channel==='website').postId");assert new_post!=post_id
 assert page.evaluate('(id)=>state.posts.find(p=>p.id===id).status',post_id)=='게시 완료'
 # A second project cannot detach or overwrite earlier channel approvals.
 register(1,'검증 현장 B');assert page.evaluate('state.projectIndex.length')==2;assert page.evaluate('state.projectNumber')!=number1;assert page.evaluate('(id)=>state.channelJobs.filter(j=>j.projectId===id).length',first_id)==4
 page.locator('[data-tab="storage"]').click()
 with page.expect_download() as d:page.locator('#backup').click()
 d.value.save_as(out/'workspace-backup.json');data=json.loads((out/'workspace-backup.json').read_text());assert len(data['current']['channelJobs'])==8;assert len(data['workflowAssets'])>=2
 page.evaluate('state.channelJobs=[]');page.locator('#restore').set_input_files(str(out/'workspace-backup.json'));page.wait_for_function('state.channelJobs.length===8',timeout=60000);assert page.evaluate('(id)=>state.channelJobs.find(j=>j.id===id).approved!==undefined',website)
 page.locator('[data-tab="dashboard"]').click()
 for name,w,h in [('ipad',820,1180),('iphone',390,844),('galaxy',412,915)]:
  page.set_viewport_size({'width':w,'height':h});page.evaluate('scrollTo(0,0)');page.screenshot(path=str(out/f'{name}.png'));assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),name
 assert not errors,errors
 result={'runtime_errors':errors,'one_registration_four_channels':'PASS','independent_drafts_versions':'PASS','ordered_review_approval_schedule':'PASS','public_case_whitelist':'PASS','calendar_post_link':'PASS','no_fake_followers':'PASS','immutable_photos_full_backup_restore':'PASS','IG_ZIP_and_MP4':meta,'responsive_chromium':'PASS'};(out/'results.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False));b.close()
