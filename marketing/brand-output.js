/* Shared brand rendering for previews, channel downloads and vertical video. */
"use strict";
const OUTPUT_PRESETS = Object.freeze({
  carousel: { label: "인스타 피드", width: 1080, height: 1350, note: "4:5 · 여러 장을 같은 비율로 저장" },
  naver: { label: "네이버 블로그 본문", width: 1600, natural: true, note: "긴 변 최대 1600px · 원본 비율 유지" },
  naverCover: { label: "네이버 블로그 대표", width: 1200, height: 1200, note: "1:1 · 대표사진용 앱 기본값" },
  kakao: { label: "카카오채널 캐러셀", width: 800, height: 800, note: "1:1 · 800 × 800" },
  kakaoWide: { label: "카카오채널 기본 메시지", width: 800, height: 600, note: "4:3 · 800 × 600" },
  youtube: { label: "유튜브 게시물", width: 1080, height: 1080, note: "1:1 · 1080 × 1080" },
  youtubeCover: { label: "유튜브 영상 썸네일", width: 1280, height: 720, note: "16:9 · 1280 × 720" },
  story: { label: "인스타 스토리", width: 1080, height: 1920, vertical: true, note: "9:16 · 1080 × 1920" },
  reels: { label: "인스타 릴스", width: 1080, height: 1920, vertical: true, note: "9:16 · 표지 PNG / 영상 MP4" },
  shorts: { label: "유튜브 쇼츠", width: 1080, height: 1920, vertical: true, note: "9:16 · 표지 PNG / 영상 MP4" },
});
const BRAND_DEFAULTS = Object.freeze({ logoWidth: 18, opacity: 15, position: "top", tone: "dark", fit: "contain", titles: "", caption: "", product: "", size: "" });
function brandSettings() {
  const raw = state.brandOutput || {};
  const number = (key, min, max) => Number.isFinite(Number(raw[key])) ? Math.max(min, Math.min(max, Number(raw[key]))) : BRAND_DEFAULTS[key];
  return {
    ...BRAND_DEFAULTS,
    logoWidth: number("logoWidth", 10, 30), opacity: number("opacity", 5, 30),
    position: ["top", "left", "right", "none"].includes(raw.position) ? raw.position : "top",
    tone: raw.tone === "light" ? "light" : "dark", fit: raw.fit === "cover" ? "cover" : "contain",
    ...Object.fromEntries(["titles", "caption", "product", "size"].map(key => [key, typeof raw[key] === "string" ? raw[key].slice(0, 10000) : ""])),
  };
}
function platformCaption(format = state.format) {
  return state.brandCaptions?.[format] ?? brandSettings().caption;
}
const brandPanel = document.createElement("section");
brandPanel.className = "brand-output-panel";
brandPanel.innerHTML = `
  <h3>청인마루 공통 디자인</h3>
  <p>보정한 사진을 넣고 문구를 붙여넣으세요. 명조체와 중앙 로고를 모든 출력에 같은 비율로 적용합니다.</p>
  <label class="checkline"><input id="brand-prepared" type="checkbox" checked>보정 완료 사진 · 업로드 시 자동 색보정 생략</label>
  <details class="brand-handoff"><summary>ChatGPT와 제작 설정 주고받기</summary>
    <p>요청문을 복사해 ChatGPT에 사진과 함께 보내세요. 보정 사진은 사진 불러오기로, 제작 설정 JSON은 아래 칸으로 가져옵니다.</p>
    <button id="brand-request" type="button">ChatGPT 작업 요청문 복사</button>
    <label>제작 설정 JSON<textarea id="brand-import" rows="7" maxlength="50000" placeholder="ChatGPT가 준 JSON을 붙여넣으세요."></textarea></label>
    <button id="brand-apply" type="button">문구·규격·플랫폼 적용</button>
    <button id="brand-save-kit" type="button">현재 제작 설정 JSON 저장</button>
    <p id="brand-import-status" role="status"></p>
  </details>
  <div class="brand-controls">
    <label>사진 구성<select id="brand-fit"><option value="contain">전체 사진 보존</option><option value="cover">화면 가득 채우기 · 가장자리 크롭</option></select></label>
    <label>문구 위치<select id="brand-position"><option value="top">사진 위 여백</option><option value="left">사진 위쪽 왼편</option><option value="right">사진 위쪽 오른편</option><option value="none">사진과 로고만</option></select></label>
    <label>글자색<select id="brand-tone"><option value="dark">짙은 갈색</option><option value="light">아이보리</option></select></label>
    <label>로고 너비 (%)<input id="brand-logoWidth" type="number" min="10" max="30" step="1"></label>
    <label>로고 불투명도 (%)<input id="brand-opacity" type="number" min="5" max="30" step="1"></label>
    <label>제품명 (직접 입력 우선)<input id="brand-product" maxlength="150" placeholder="구정마루 · 블론테 본오크"></label>
    <label>확인된 제품 규격<input id="brand-size" maxlength="200" placeholder="폭 230 × 길이 2,420 × 두께 8.7mm"></label>
  </div>
  <label>사진별 문구 · 한 줄에 한 장씩<textarea id="brand-titles" rows="6" maxlength="3000" placeholder="빛이 머무는 거실&#10;햇살에 드러나는 나뭇결&#10;거실에서 복도까지"></textarea></label>
  <button id="brand-example" type="button">이번 시공사례 문구 6개 불러오기</button>
  <label>캡션 · 설명글 붙여넣기<textarea id="brand-caption" rows="6" maxlength="10000" placeholder="ChatGPT에서 받은 설명글을 여기에 붙여넣으세요. ZIP에 설명글.txt로 함께 저장합니다."></textarea></label>
  <div class="toolbar"><button id="brand-copy-caption" type="button">설명글 복사</button><button id="brand-export-all" type="button">주요 플랫폼 사진 한 번에 저장 (ZIP)</button><button id="brand-video" type="button">릴스·쇼츠 MP4 만들기</button></div>
  <p id="brand-preset-note" class="hint" role="status"></p>`;
$("designs").before(brandPanel);
const formatSelect = $("format");
formatSelect.replaceChildren(...Object.entries(OUTPUT_PRESETS).map(([key, preset]) => new Option(preset.label + " · " + (preset.natural ? "원본 비율" : `${preset.width} × ${preset.height}`), key)));
function syncBrandControls() {
  const settings = brandSettings();
  for (const key of Object.keys(BRAND_DEFAULTS)) $("brand-" + key).value = key === "caption" ? platformCaption() : settings[key];
  $("brand-prepared").checked = state.usePreparedPhotos !== false;
  formatSelect.value = OUTPUT_PRESETS[state.format] ? state.format : "carousel";
  $("brand-preset-note").textContent = OUTPUT_PRESETS[formatSelect.value].note;
}
function brandChanged() {
  renderKey = "";
  persist();
  if (state.photos.length) generate();
}
for (const key of Object.keys(BRAND_DEFAULTS)) {
  $("brand-" + key).addEventListener("change", event => {
    state.brandOutput = { ...brandSettings(), [key]: event.target.value };
    if (key === "caption") state.brandCaptions = { ...state.brandCaptions, [state.format]: event.target.value };
    syncBrandControls();
    brandChanged();
  });
}
formatSelect.onchange = () => { state.format = formatSelect.value; syncBrandControls(); brandChanged(); };
$("brand-example").onclick = () => {
  state.brandOutput = { ...brandSettings(), titles: "빛이 머무는 거실\n햇살에 드러나는 나뭇결\n거실에서 복도까지\n걸음마다 이어지는 온기\n같은 공간, 새로운 온기\n바닥에서 시작된 변화" };
  state.slideCount = 6;
  if ($("slide-count")) $("slide-count").value = "6";
  syncBrandControls(); brandChanged();
};
$("brand-copy-caption").onclick = async () => {
  try { await navigator.clipboard.writeText(platformCaption()); toast("설명글을 복사했습니다."); }
  catch { $("brand-caption").focus(); $("brand-caption").select(); toast("선택된 설명글을 복사해 주세요."); }
};
const syncBeforeBrand = sync;
sync = function () { syncBeforeBrand(); syncBrandControls(); };
const generationKeyBeforeBrand = generationKey;
generationKey = function () { return generationKeyBeforeBrand() + JSON.stringify(brandSettings()); };
// Use the original path geometry, excluding the slogan, with a tightly fitted viewBox.
const brandMark = loadImage("brand/watermark-white.svg");
function brandText(ctx, text, x, y, width, size, rows) {
  ctx.font = `400 ${size}px "Studio Serif", serif`;
  lines(ctx, text, x, y, width, size * 1.5, rows);
}
async function renderBrandPhoto(image, text, product, size, format, settings = brandSettings()) {
  const preset = OUTPUT_PRESETS[format] || OUTPUT_PRESETS.carousel;
  await document.fonts.load('400 52px "Studio Serif"', text + product + size);
  const canvas = document.createElement("canvas");
  [canvas.width, canvas.height] = CheonginBrandKit.dimensions(preset, image.width, image.height);
  const ctx = canvas.getContext("2d"), w = canvas.width, h = canvas.height;
  const unit = Math.min(w, h), margin = unit * 0.055;
  const hasText = settings.position !== "none" && !!(text || product || size);
  const header = hasText && settings.position === "top" ? Math.round(unit * (preset.vertical ? 0.46 : 0.27)) : 0;
  ctx.fillStyle = settings.tone === "light" ? "#35312c" : "#f4f0e8";
  ctx.fillRect(0, 0, w, h);
  if (settings.fit === "cover" && !preset.natural) cover(ctx, image, 0, header, w, h - header);
  else {
    const ratio = Math.min(w / image.width, (h - header) / image.height);
    ctx.drawImage(image, (w - image.width * ratio) / 2, header + (h - header - image.height * ratio) / 2, image.width * ratio, image.height * ratio);
  }
  if (hasText) {
    const safeTop = preset.vertical ? 220 : margin;
    const y = preset.vertical ? safeTop : margin;
    const width = settings.position === "right" ? w * 0.58 : w - margin * 2 - (settings.mascot ? unit * 0.15 : 0);
    const x = settings.position === "right" ? w - margin - width : margin;
    ctx.fillStyle = settings.tone === "light" ? "#fff9ef" : "#3f352e";
    if (!header) { ctx.shadowColor = settings.tone === "light" ? "#0009" : "#fff9"; ctx.shadowBlur = unit * 0.006; }
    ctx.textBaseline = "top";
    brandText(ctx, text, x, y, width, unit * 0.042, 2);
    brandText(ctx, product, x, y + unit * 0.14, width, unit * 0.022, 1);
    brandText(ctx, size, x, y + unit * 0.19, width, unit * 0.019, 1);
    ctx.shadowBlur = 0;
  }
  if (settings.mascot && assets[settings.mascot]) {
    const mascot = assets[settings.mascot], side = unit * 0.1;
    const ratio = Math.min(side / mascot.width, side / mascot.height);
    ctx.drawImage(mascot, w - margin - mascot.width * ratio, preset.vertical ? 220 : margin, mascot.width * ratio, mascot.height * ratio);
  }
  const logo = await brandMark, logoWidth = w * settings.logoWidth / 100;
  ctx.save(); ctx.globalAlpha = settings.opacity / 100;
  ctx.drawImage(logo, (w - logoWidth) / 2, h / 2 - logoWidth * logo.height / logo.width / 2, logoWidth, logoWidth * logo.height / logo.width);
  ctx.restore();
  canvas.dataset.platform = format;
  return canvas;
}
card = async function (theme, slide, format = state.format) {
  const requested = state.brandSlides?.[slide]?.photo;
  const photo = state.photos.find(photo => requested && photo.name === requested) || state.photos[slide % state.photos.length];
  if (!photo) throw Error("사진을 먼저 등록하세요.");
  const was = original;
  let image;
  original = false;
  try { image = transformed(await photoImage(photo), photo.adjust, 2400); } finally { original = was; }
  const settings = brandSettings(), product = selectedProduct();
  const custom = settings.titles.split(/\r?\n/).filter(line => line.trim());
  const draft = state.authoring?.draft;
  const validDraft = draft?.inputSignature === window.currentWritingSignature?.();
  const title = custom[slide] || (validDraft && draft?.carousel?.[slide]?.text) || state.title;
  // Three variants retain the same type and logo rules; only copy placement changes.
  const position = theme === "journal" ? "none" : theme === "gallery" && settings.position === "top" ? "left" : settings.position;
  return renderBrandPhoto(image, title || "", settings.product || (product ? Writer.label(product) : state.product), settings.size || product?.size || "", format, { ...settings, position, mascot: slide === (state.slideCount || 5) - 1 && state.mascot !== "none" ? state.mascot : null });
};
workflowCard = async function (content, index, format) {
  const ref = content.photoRefs[index % content.photoRefs.length];
  const image = await workflowImage(ref, 2200);
  const settings = content.brandOutput || brandSettings();
  return renderBrandPhoto(image, content.carousel?.[index]?.text || content.title, settings.product || Writer.label(content.product), settings.size || content.product?.size || "", format || "carousel", settings);
};
$("brand-video").onclick = () => $("export-reel").click();
$("brand-export-all").onclick = async () => {
  const button = $("brand-export-all");
  if (!state.photos.length) return toast("사진을 먼저 등록하세요.");
  button.disabled = true;
  try {
    await waitEasyReady();
    const files = [];
    for (const target of ["naver", "naverCover", "carousel", "kakao", "kakaoWide", "youtube", "youtubeCover", "reels", "shorts"]) {
      for (let i = 0; i < (state.slideCount || 5); i++) {
        const canvas = await card(state.theme, i, target);
        files.push({ name: `${target}/scene-${i + 1}-${canvas.width}x${canvas.height}.png`, blob: await canvasBlob(canvas) });
      }
      $("brand-preset-note").textContent = OUTPUT_PRESETS[target].label + " 준비 완료";
    }
    for (const target of ["naver", "carousel", "kakao", "youtube", "reels", "shorts"]) {
      files.push({ name: `${target}/설명글.txt`, blob: new Blob([platformCaption(target) || state.authoring?.draft?.caption || ""], { type: "text/plain;charset=utf-8" }) });
    }
    download(await storedZip(files), "cheonginmaru-platforms.zip");
  } catch (error) { toast("플랫폼 파일 생성 실패: " + error.message); }
  finally { button.disabled = false; syncBrandControls(); }
};
syncBrandControls();

function currentBrandKit() {
  const settings = brandSettings(), photos = state.photos;
  const titles = settings.titles.split(/\r?\n/).filter(Boolean);
  return {
    schema: "cheonginmaru-production-v1", format: state.format,
    product: settings.product || state.product, size: settings.size,
    slides: Array.from({ length: state.slideCount || 5 }, (_, index) => ({ title: titles[index] || state.authoring?.draft?.carousel?.[index]?.text || state.title || "시공 기록", photo: state.brandSlides?.[index]?.photo || photos[index % Math.max(1, photos.length)]?.name || "" })),
    captions: { ...state.brandCaptions, [state.format]: platformCaption() },
  };
}
$("brand-save-kit").onclick = () => download(new Blob([JSON.stringify(currentBrandKit(), null, 2)], { type: "application/json" }), "cheonginmaru-production.json");
$("brand-request").onclick = async () => {
  const template = { ...currentBrandKit(), slides: Array.from({length: 6}, (_, i) => ({ title: "", photo: state.photos[i]?.name || "" })), captions: { naver: "", carousel: "", kakao: "", youtube: "", reels: "", shorts: "" } };
  const prompt = "청인마루 마케팅 앱용으로 첨부 사진을 보정하고 플랫폼별 설명글을 작성해줘. 보정 사진에는 글씨·로고를 넣지 말고 원본 파일명과 대응시켜줘. 제품 색과 나뭇결을 보존하고 잡물체 제거 부분만 복원해줘. 아래 JSON 형식으로 완성된 제작 설정도 줘. slides는 업로드 순서와 파일명에 맞춰 3~6개, 각 title은 짧은 한국어 문구. 규격은 확인된 것만 사용하고 불확실하면 비워줘. captions는 네이버 블로그 본문, 인스타 캡션, 카카오채널 소개, 유튜브 게시물, 릴스·쇼츠 설명글을 각각 작성해줘. 플랫폼별 문구 외에 검증되지 않은 현장 정보나 성능을 추가하지 말아줘.\n\n" + JSON.stringify(template, null, 2);
  try { await navigator.clipboard.writeText(prompt); toast("ChatGPT에 붙여넣을 작업 요청문을 복사했습니다."); }
  catch { $("brand-import").value = prompt; toast("요청문을 제작 설정 칸에 표시했습니다. 복사해서 사용하세요."); }
};
$("brand-apply").onclick = () => {
  try {
    const kit = CheonginBrandKit.parse($("brand-import").value);
    // Validate first, then apply the entire transfer atomically.
    state.brandOutput = { ...brandSettings(), titles: kit.slides.map(slide => slide.title).join("\n"), product: kit.product, size: kit.size, caption: kit.captions[kit.format] || "" };
    state.brandCaptions = kit.captions;
    state.brandSlides = kit.slides;
    state.format = kit.format;
    state.slideCount = kit.slides.length;
    $("slide-count").value = String(state.slideCount);
    syncBrandControls(); brandChanged();
    $("brand-import-status").textContent = `${kit.slides.length}장 문구와 ${Object.keys(kit.captions).length}개 플랫폼 설명글을 적용했습니다. 사진은 파일명 순서로 확인하세요.`;
  } catch (error) { $("brand-import-status").textContent = "적용 실패 · " + error.message; }
};

// External retouching is the normal workflow; avoid a second exposure/WB pass.
const prepareBeforeBrand = preparePhotos;
preparePhotos = async function () {
  if (state.usePreparedPhotos !== false) {
    for (const photo of state.photos) {
      if (!photo.autoPrepared && !photo.approved) {
        photo.autoPrepared = true;
        photo.approved = true;
      }
    }
  }
  return prepareBeforeBrand();
};
$("brand-prepared").onchange = event => {
  state.usePreparedPhotos = event.target.checked;
  persist();
};
