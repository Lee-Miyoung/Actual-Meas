"""Reproduces photo selection -> automatic designs -> real downloads without approvals."""
from playwright.sync_api import sync_playwright
from PIL import Image,ImageDraw
from pathlib import Path
import json,os,zipfile,io
out=Path(os.environ.get('STUDIO_TEST_OUTPUT','/tmp/easy-flow-evidence'));out.mkdir(parents=True,exist_ok=True)
for n in range(4):
 im=Image.new('RGB',(4032,3024),(135+n*8,124+n*7,108+n*5));d=ImageDraw.Draw(im)
 for x in range(0,4032,200):d.line((x,0,x,3024),fill=(175,160,135),width=4)
 d.rectangle((300,300,1600,1600),fill=(220,223,212));im.save(out/f'photo-{n}.jpg',quality=90)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox','--disable-dev-shm-usage'])
 context=browser.new_context(viewport={'width':1440,'height':1000},accept_downloads=True)
 page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept())
 page.goto('http://127.0.0.1:8000/marketing/');page.wait_for_function('easyReady',timeout=30000);page.locator('[data-tab="studio"]').click()
 assert page.evaluate('state.catalog.length')==91
 # Empty-state button opens the actual file picker instead of an invisible prerequisite toast.
 with page.expect_file_chooser() as chooser:page.locator('#generate').click()
 chooser.value.set_files(str(out/'photo-0.jpg'))
 page.wait_for_function("document.querySelectorAll('#designs canvas').length===15 && !easyBusy",timeout=120000)
 assert page.evaluate('state.photos.length')==1
 assert page.evaluate('state.photos[0].autoPrepared')
 assert page.evaluate("Math.max(images.get(state.photos[0].id).width,images.get(state.photos[0].id).height)")<=2200
 # Single corrected photo export retains original size; no per-photo confirmation was used.
 with page.expect_download(timeout=30000) as result:page.locator('#export-photo').click()
 result.value.save_as(out/'corrected-photo.png');im=Image.open(out/'corrected-photo.png');assert im.size==(4032,3024)
 assert page.locator('#download-box a[download]').count()>=1
 # Native five-card ZIP is readable and every entry is a valid 1080x1350 PNG.
 with page.expect_download(timeout=60000) as result:page.locator('#save-design-zip').click()
 result.value.save_as(out/'design.zip')
 with zipfile.ZipFile(out/'design.zip') as archive:
  assert len(archive.namelist())==5;assert archive.testzip() is None
  for name in archive.namelist():assert Image.open(io.BytesIO(archive.read(name))).size==(1080,1350)
 # Restored photos auto-generate again after reload, without pressing approve or generate.
 page.wait_for_timeout(800);page.reload();page.wait_for_function("easyReady && document.querySelectorAll('#designs canvas').length===15 && !easyBusy",timeout=120000)
 # Product model search and imported dimensions populate text; price is never part of schema.
 page.locator('[data-tab="copy"]').click();page.locator('#product-search').fill('스킨마루165');page.locator('#product-search').press('Enter');page.wait_for_function("selectedProduct()?.model==='스킨마루165'")
 page.wait_for_function("!easyBusy && state.authoring.draft.product.model==='스킨마루165'",timeout=60000)
 caption=page.evaluate('state.authoring.draft.caption');assert '165 × 1205 × 7.2T' in caption;assert '3.18㎡/BOX' in caption;assert '16pcs' in caption
 page.locator('#product-search').fill('로엔오크1210');page.locator('#product-search').press('Enter');page.wait_for_function("selectedProduct()?.color==='로엔오크1210'")
 page.wait_for_function("!easyBusy && state.authoring.draft.product.color==='로엔오크1210'",timeout=60000)
 assert '230 × 1210 × 8.5T' in page.evaluate('state.authoring.draft.caption');assert '10pcs' in page.evaluate('state.authoring.draft.caption')
 assert not any('price' in prod or '가격' in prod for prod in page.evaluate('state.catalog'))
 page.evaluate('scrollTo(0,0)');page.screenshot(path=str(out/'copy-desktop.png'))
 # Four phone-size originals also render without approval gates and all corrected photos export together.
 page.locator('[data-tab="studio"]').click();page.locator('#photos').set_input_files([str(out/f'photo-{n}.jpg') for n in range(4)])
 page.wait_for_function("state.photos.length===4 && document.querySelectorAll('#designs canvas').length===15 && !easyBusy",timeout=120000)
 with page.expect_download(timeout=120000) as result:page.locator('#save-photos-zip').click()
 result.value.save_as(out/'photos.zip')
 with zipfile.ZipFile(out/'photos.zip') as archive:assert len(archive.namelist())==4;assert archive.testzip() is None
 page.evaluate('scrollTo(0,0)');page.screenshot(path=str(out/'studio-desktop.png'))
 for name,w,h in [('ipad',820,1180),('iphone',390,844),('galaxy',412,915)]:
  page.set_viewport_size({'width':w,'height':h});page.evaluate('scrollTo(0,0)');page.screenshot(path=str(out/f'{name}.png'));assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 # Existing legacy storage is unaffected.
 assert page.evaluate('localStorage.length')==0
 # Direct photo-save from an empty project also opens the picker and completes the save.
 empty=context.new_page();empty_errors=[];empty.on('pageerror',lambda e:empty_errors.append(str(e)))
 # A new isolated context avoids the existing project's IndexedDB.
 empty.close();isolated=browser.new_context(accept_downloads=True);empty=isolated.new_page();empty.on('pageerror',lambda e:empty_errors.append(str(e)))
 empty.goto('http://127.0.0.1:8000/marketing/');empty.wait_for_function('easyReady');empty.locator('[data-tab="studio"]').click()
 with empty.expect_download(timeout=120000) as saved:
  with empty.expect_file_chooser() as chooser:empty.locator('#export-photo').click()
  chooser.value.set_files(str(out/'photo-0.jpg'))
 saved.value.save_as(out/'empty-state-photo.png');assert Image.open(out/'empty-state-photo.png').size==(4032,3024)
 assert not empty_errors,empty_errors
 isolated.close()
 assert not errors,errors
 report={'runtime_errors':errors,'empty_state_file_picker':'PASS','single_photo_auto_3_designs':'PASS','4_phone_resolution_photos':'PASS','full_resolution_PNG':'PASS (4032x3024)','5_card_ZIP':'PASS','4_photo_ZIP':'PASS','reload_auto_designs':'PASS','provided_catalog_91_no_prices':'PASS','specs_in_caption':'PASS','responsive_chromium_4_sizes':'PASS'}
 (out/'results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False));browser.close()
