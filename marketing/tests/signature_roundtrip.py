"""Portable settings/production kit and existing whole-workspace backup retain pinned identity."""
from playwright.sync_api import sync_playwright
from pathlib import Path
from PIL import Image
import json,os,hashlib,zipfile
out=Path(os.environ.get('STUDIO_TEST_OUTPUT','/tmp/signature-roundtrip'));out.mkdir(parents=True,exist_ok=True)
f=out/'qa-room.jpg';Image.new('RGB',(1600,1200),(198,186,166)).save(f)
with sync_playwright()as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',args=['--no-sandbox']);a=b.new_page(viewport={'width':1440,'height':1050},accept_downloads=True);errors=[];a.on('pageerror',lambda e:errors.append(str(e)));a.on('dialog',lambda d:d.accept());a.goto('http://127.0.0.1:8000/marketing/');a.wait_for_function('window.signatureReady');a.locator('#production-files').set_input_files(str(f));a.wait_for_function('state.slideCount===2&&!document.getElementById("production-files").disabled');a.evaluate('async()=>{persist();await flushPendingSave();}');identity=a.evaluate('state.signatureDesign');photo=a.evaluate('state.photos[0].src')
 a.locator('.signature-daily button').click();a.locator('#signature-preset').select_option('material-journal');a.locator('#signature-show-logo').uncheck();
 with a.expect_download()as d:a.locator('#signature-export').click()
 d.value.save_as(out/'settings.json');config=json.loads((out/'settings.json').read_text());assert config['id']=='material-journal' and not config['show']['logo'];assert a.evaluate('state.signatureDesign')==identity
 a.locator('#signature-form button[type=submit]').click();a.wait_for_function('state.signatureDesign.id==="material-journal"');assert not a.evaluate('state.signatureDesign.show.logo')
 a.locator('#signature-restore').click();assert a.evaluate('state.settings.brandDesign.current.id')=='editorial-studio';assert a.evaluate('state.signatureDesign.id')=='material-journal'
 bad=out/'bad-settings.json';data=dict(config);data['version']=99;bad.write_text(json.dumps(data));before=a.evaluate('state.signatureDesign');a.locator('#signature-import').set_input_files(str(bad));a.wait_for_function('document.getElementById("signature-status").textContent.includes("실패")');assert a.evaluate('state.signatureDesign')==before
 a.locator('#signature-import').set_input_files(str(out/'settings.json'));a.wait_for_function('document.getElementById("signature-status").textContent.includes("초안")');assert a.evaluate('state.signatureDesign')==before
 # Export two-page kit, which old unsigned kits intentionally still restrict to 3-6 pages.
 a.locator('[data-tab="studio"]').click();kit=a.evaluate('currentBrandKit()');assert len(kit['slides'])==2;parsed=a.evaluate('(s)=>CheonginBrandKit.parse(s)',json.dumps(kit,ensure_ascii=False));assert parsed['signaturePackage']['design']==before
 package=out/'production.zip'
 with zipfile.ZipFile(package,'w',zipfile.ZIP_DEFLATED)as z:z.writestr('production.json',json.dumps(kit,ensure_ascii=False));z.write(f,f.name)
 a.locator('#production-files').set_input_files(str(package));a.wait_for_function('!document.getElementById("production-files").disabled&&state.slideCount===2');assert a.evaluate('state.signatureDesign')==before;assert a.evaluate('state.photos[0].src')==photo
 # Full existing backup carries settings profile and project snapshot without changing schema.
 a.locator('[data-tab="storage"]').click()
 with a.expect_download()as d:a.locator('#backup').click()
 d.value.save_as(out/'workspace.json');backup=json.loads((out/'workspace.json').read_text());assert backup['current']['signatureDesign']==before;assert backup['current']['settings']['brandDesign']['current']['id']=='editorial-studio'
 a.evaluate('()=>{state.signatureDesign=SignatureCore.create();state.signaturePhotos={};}');a.locator('#restore').set_input_files(str(out/'workspace.json'));a.wait_for_function('state.signatureDesign.id==="material-journal"');assert a.evaluate('state.photos[0].src')==photo
 # Output and prepared captions survive refresh, while custom owner copy remains untouched.
 a.locator('[data-tab="studio"]').click();a.locator('#brand-caption').fill('대표가 승인한 직접 수정 문구');a.locator('#brand-caption').blur();a.wait_for_timeout(600);a.reload();a.wait_for_function('window.signatureReady');assert a.evaluate('platformCaption()')=='대표가 승인한 직접 수정 문구';assert a.evaluate('state.signatureDesign.id')=='material-journal'
 assert not errors,errors;b.close();report={'settings_export_import_draft':'PASS','invalid_version_rejected':'PASS','previous_default_restore':'PASS','pinned_project_unaffected':'PASS','two_page_kit_ZIP_roundtrip':'PASS','whole_backup_restore':'PASS','owner_caption_reload':'PASS','original_bytes':'PASS','runtime_errors':errors};(out/'results.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
