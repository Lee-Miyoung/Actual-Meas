"use strict";
let easyReady = false,
  easyBusy = false,
  easyTimer,
  renderKey = "",
  pendingPhotoSave = false;
const savedDownloads = [];
const statusBox = node(
  "div",
  "사진을 올리면 기본 보정·문구·디자인 3안을 자동으로 준비합니다.",
  "easy-status",
);
statusBox.id = "easy-status";
statusBox.setAttribute("role", "status");
document.querySelector("#studio .section-head").after(statusBox);
const downloadBox = node("section", undefined, "download-box");
downloadBox.id = "download-box";
downloadBox.hidden = true;
downloadBox.append(node("h3", "저장 파일"));
$("designs").before(downloadBox);
const actions = node("div", undefined, "toolbar easy-actions");
const saveDesign = node("button", "선택한 시안 5장 한 번에 저장 (ZIP)"),
  savePhotos = node("button", "보정 사진 모두 저장 (ZIP)");
saveDesign.id = "save-design-zip";
savePhotos.id = "save-photos-zip";
actions.append(saveDesign, savePhotos);
$("designs").before(actions);
function easyStatus(text, error = false) {
  statusBox.textContent = text;
  statusBox.classList.toggle("error", error);
}
function downloadLink(blob, name) {
  const url = URL.createObjectURL(blob),
    row = node("div", undefined, "download-row"),
    a = node("a", name + " · 다시 저장");
  a.href = url;
  a.download = name;
  row.append(a);
  if (blob.type.startsWith("image/")) {
    const open = node("a", "이미지 열기");
    open.href = url;
    open.target = "_blank";
    open.rel = "noopener";
    row.append(open);
  }
  if (navigator.canShare) {
    const share = node("button", "공유 / 사진에 저장");
    share.onclick = async () => {
      try {
        const file = new File([blob], name, { type: blob.type });
        if (!navigator.canShare({ files: [file] }))
          throw Error(
            "이 기기는 파일 공유를 지원하지 않습니다. 다시 저장 링크를 사용하세요.",
          );
        await navigator.share({ files: [file], title: "청인마루 콘텐츠" });
      } catch (e) {
        if (e.name !== "AbortError") toast(e.message);
      }
    };
    row.append(share);
  }
  downloadBox.hidden = false;
  downloadBox.append(row);
  savedDownloads.push({ url, row, size: blob.size });
  while (savedDownloads.length > 3 || (savedDownloads.length > 1 && savedDownloads.reduce((n,x)=>n+x.size,0)>40*1024*1024)) {
    const old = savedDownloads.shift();
    URL.revokeObjectURL(old.url);
    old.row.remove();
  }
  return a;
}
// A visible, real link remains if browser download policy blocks the automatic click.
download = function (blob, name) {
  if (!(blob instanceof Blob) || !blob.size) {
    easyStatus("저장할 파일이 없습니다. 사진을 다시 선택하세요.", true);
    return;
  }
  const a = downloadLink(blob, name);
  a.click();
  easyStatus(
    `저장 파일 준비됨: ${name}. 다운로드되지 않으면 ‘저장 파일’의 ‘다시 저장’ 또는 ‘이미지 열기’를 사용하세요.`,
  );
};
function canvasBlob(c) {
  return new Promise((resolve, reject) => {
    try {
      c.toBlob(
        (b) => (b ? resolve(b) : reject(Error("PNG 변환에 실패했습니다."))),
        "image/png",
      );
    } catch (e) {
      reject(e);
    }
  });
}
exportCanvas = async function (c, name) {
  try {
    download(await canvasBlob(c), name);
  } catch (e) {
    easyStatus("사진 저장 실패: " + e.message, true);
    toast(e.message);
  }
};
// Minimal standards-compliant stored ZIP: no external library or network request.
const crcTable = Uint32Array.from({ length: 256 }, (_, i) => {
  let c = i;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
async function storedZip(files) {
  const entries = [],
    parts = [];
  let offset = 0;
  for (const f of files) {
    const bytes = new Uint8Array(await f.blob.arrayBuffer()),
      name = new TextEncoder().encode(f.name),
      header = new Uint8Array(30 + name.length),
      v = new DataView(header.buffer),
      crc = crc32(bytes);
    v.setUint32(0, 0x04034b50, true);
    v.setUint16(4, 20, true);
    v.setUint16(6, 0x800, true);
    v.setUint16(12, 33, true);
    v.setUint32(14, crc, true);
    v.setUint32(18, bytes.length, true);
    v.setUint32(22, bytes.length, true);
    v.setUint16(26, name.length, true);
    header.set(name, 30);
    parts.push(header, bytes);
    entries.push({ name, crc, size: bytes.length, offset });
    offset += header.length + bytes.length;
  }
  const centralStart = offset;
  for (const e of entries) {
    const b = new Uint8Array(46 + e.name.length),
      v = new DataView(b.buffer);
    v.setUint32(0, 0x02014b50, true);
    v.setUint16(4, 20, true);
    v.setUint16(6, 20, true);
    v.setUint16(8, 0x800, true);
    v.setUint16(14, 33, true);
    v.setUint32(16, e.crc, true);
    v.setUint32(20, e.size, true);
    v.setUint32(24, e.size, true);
    v.setUint16(28, e.name.length, true);
    v.setUint32(42, e.offset, true);
    b.set(e.name, 46);
    parts.push(b);
    offset += b.length;
  }
  const end = new Uint8Array(22),
    v = new DataView(end.buffer);
  v.setUint32(0, 0x06054b50, true);
  v.setUint16(8, entries.length, true);
  v.setUint16(10, entries.length, true);
  v.setUint32(12, offset - centralStart, true);
  v.setUint32(16, centralStart, true);
  parts.push(end);
  return new Blob(parts, { type: "application/zip" });
}
function generationKey() {
  return JSON.stringify({
    project: state.projectId,
    photos: state.photos.map((p) => [p.id, p.src.length, p.adjust]),
    format: state.format,
    count: state.slideCount,
    product: selectedProduct(),
    title: state.title,
    memo: state.memo,
    region: state.region,
    mascot: state.mascot,
    draft: state.authoring?.draft,
  });
}
async function preparePhotos() {
  for (let i = 0; i < state.photos.length; i++) {
    const p = state.photos[i];
    easyStatus(`사진 ${i + 1}/${state.photos.length} 기본 보정 중…`);
    if (!p.analysis) await analysePhoto(p);
    const untouched = Object.entries(defaults()).every(
      ([key, value]) => p.adjust[key] === value,
    );
    if (!state.signatureDesign?.archiveVersion && !p.autoPrepared && !p.approved && untouched) {
      const r = p.analysis.recommended;
      p.adjust.exposure = Math.max(-0.25, Math.min(0.25, r.exposure));
      p.adjust.warmth = Math.max(-3, Math.min(3, r.warmth));
      p.adjust.rotation = Math.abs(r.rotation) <= 1 ? r.rotation : 0;
      p.focus ??= { x: 0.5, y: 0.5 };
    }
    p.autoPrepared = true;
    p.approved = true;
    await new Promise((r) => setTimeout(r, 0));
  }
  duplicates();
  await preview();
}
async function easyGenerate(force = false) {
  if (window.renderProductionWorkspace) return window.renderProductionWorkspace();
  if (!easyReady || !writingReady) {
    easyStatus(
      "저장된 현장과 제품 도감을 불러오는 중입니다. 잠시 후 자동으로 진행합니다.",
    );
    return;
  }
  if (!state.photos.length) {
    easyStatus(
      "먼저 사진을 선택하세요. 사진을 올리면 디자인 3안이 자동으로 생성됩니다.",
    );
    $("photos").click();
    return;
  }
  if (easyBusy) {
    clearTimeout(easyTimer);
    easyTimer = setTimeout(() => easyGenerate(force), 250);
    return;
  }
  easyBusy = true;
  try {
    await preparePhotos();
    await generateWriting(false);
    const key = generationKey(),
      expected = (state.slideCount || 5) * 3;
    if (
      force ||
      key !== renderKey ||
      document.querySelectorAll("#designs canvas").length !== expected
    ) {
      easyStatus("사진으로 디자인 3안을 만드는 중…");
      await oldGenerate();
      if (document.querySelectorAll("#designs canvas").length !== expected)
        throw Error(
          "디자인을 완성하지 못했습니다. 사진 크기 또는 저장 공간을 확인하세요.",
        );
      renderKey = generationKey();
    }
    document
      .querySelectorAll("#designs article")
      .forEach((a, i) =>
        a.classList.toggle(
          "chosen",
          ["editorial", "gallery", "journal"][i] === state.theme,
        ),
      );
    saveDesign.textContent = `선택한 시안 ${state.slideCount || 5}장 한 번에 저장 (ZIP)`;
    persist();
    easyStatus(
      `사진 ${state.photos.length}장 · 기본 보정과 디자인 3안 준비 완료. 원하는 시안을 골라 한 번에 저장하세요.`,
    );
    window.dispatchEvent(
      new CustomEvent("marketing:ready", {
        detail: { projectId: state.projectId },
      }),
    );
    if (pendingPhotoSave) {
      pendingPhotoSave = false;
      await saveCurrentPhoto(true);
    }
  } catch (e) {
    easyStatus("자동 준비 실패: " + e.message, true);
    toast(e.message);
  } finally {
    easyBusy = false;
  }
}
generate = () => easyGenerate(false);
$("generate").onclick = () => easyGenerate(false);
$("quick-prepare").onclick = () => easyGenerate(true);
$("generate").textContent = "디자인 3안 자동 준비 / 다시 보기";
$("quick-prepare").textContent = "사진 자동 보정 후 3안 만들기";
const oldEasyInvalidate = invalidate;
invalidate = function () {
  oldEasyInvalidate();
  clearTimeout(easyTimer);
  if (easyReady && state.photos.length)
    easyTimer = setTimeout(() => easyGenerate(false), 500);
};
const photoChangeEasy = $("photos").onchange;
$("photos").onchange = async (e) => {
  const ids = state.photos.map((p) => p.id).join();
  await photoChangeEasy(e);
  if (state.photos.map((p) => p.id).join() !== ids) {
    renderKey = "";
    await easyGenerate(true);
  }
};
async function saveCurrentPhoto(skipBusy = false) {
  if (easyBusy && !skipBusy) {
    pendingPhotoSave = true;
    easyStatus("자동 보정 완료 후 사진 파일을 저장합니다.");
    return;
  }
  if (!state.photos.length) {
    pendingPhotoSave = true;
    easyStatus(
      "저장할 사진을 선택하세요. 선택 후 자동 보정하고 PNG 파일을 준비합니다.",
    );
    $("photos").click();
    return;
  }
  const p = state.photos[selected] || state.photos[0],
    was = original;
  original = false;
  try {
    easyStatus("고해상도 PNG 파일을 준비하는 중… (긴 변 최대 4096px)");
    const source = await loadImage(p.src);
    await exportCanvas(
      transformed(source, p.adjust, 4096),
      `청인마루_보정사진_${selected + 1}.png`,
    );
  } finally {
    original = was;
  }
}
$("export-photo").onclick = () =>
  saveCurrentPhoto().catch((e) =>
    easyStatus("사진 저장 실패: " + e.message, true),
  );
async function waitEasyReady() {
  const until = Date.now() + 120000;
  while (easyBusy) {
    if (Date.now() > until)
      throw Error(
        "사진 처리 시간이 길어지고 있습니다. 잠시 후 다시 시도하세요.",
      );
    await new Promise((r) => setTimeout(r, 50));
  }
}
saveDesign.onclick = async () => {
  if (!state.photos.length) return easyGenerate();
  saveDesign.disabled = true;
  try {
    await waitEasyReady();
    await easyGenerate(false);
    const canvases = [...document.querySelectorAll("#designs article")][
      ["editorial", "gallery", "journal"].indexOf(state.theme)
    ]?.querySelectorAll("canvas");
    if (!canvases?.length)
      throw Error(
        "디자인이 아직 준비되지 않았습니다. 잠시 후 다시 눌러 주세요.",
      );
    const files = [];
    for (let i = 0; i < canvases.length; i++) {
      easyStatus(`${i + 1}/${canvases.length}장 저장 파일 준비 중…`);
      files.push({
        name: `청인마루_${state.theme}_${i + 1}.png`,
        blob: await canvasBlob(canvases[i]),
      });
    }
    download(
      await storedZip(files),
      `청인마루_${state.theme}_${files.length}장.zip`,
    );
  } catch (e) {
    easyStatus("일괄 저장 실패: " + e.message, true);
  } finally {
    saveDesign.disabled = false;
  }
};
savePhotos.onclick = async () => {
  if (!state.photos.length) return easyGenerate();
  savePhotos.disabled = true;
  try {
    await waitEasyReady();
    await preparePhotos();
    const files = [],
      was = original;
    original = false;
    try {
      for (let i = 0; i < state.photos.length; i++) {
        const p = state.photos[i];
        easyStatus(`보정 사진 ${i + 1}/${state.photos.length} 준비 중…`);
        files.push({
          name: `청인마루_보정사진_${i + 1}.png`,
          blob: await canvasBlob(
            transformed(await loadImage(p.src), p.adjust, 4096),
          ),
        });
      }
    } finally {
      original = was;
    }
    download(await storedZip(files), "청인마루_보정사진_전체.zip");
  } catch (e) {
    easyStatus("사진 일괄 저장 실패: " + e.message, true);
  } finally {
    savePhotos.disabled = false;
  }
};
async function seedProvidedProducts() {
  if (state.providedCatalogueVersion === (window.PROVIDED_CATALOG_VERSION || 1))
    return;
  clearTimeout(saveTimer);
  await saving.catch(() => {});
  const before = structuredClone(state),
    catalog = structuredClone(state.catalog);
  for (const raw of window.PROVIDED_PRODUCTS || []) {
    const p = Writer.normalProduct(raw);
    const existing = catalog.find(
      (x) => x.id === p.id || Writer.identity(x) === Writer.identity(p),
    );
    if (!existing) catalog.push(p);
    else if (
      existing.id === p.id &&
      existing.model === p.model &&
      existing.brand === p.brand
    ) {
      existing.variants ??= [];
      for (const v of p.variants)
        if (!existing.variants.some((x) => x.id === v.id))
          existing.variants.push(v);
      for (const field of ["size", "pack", "coverage"])
        if (!existing[field] && p[field]) existing[field] = p[field];
      if (existing.colorOptions?.includes("색상명 미기재"))
        existing.colorOptions = p.colorOptions;
    }
  }
  const next = {
    ...structuredClone(state),
    catalog,
    providedCatalogueVersion: window.PROVIDED_CATALOG_VERSION || 1,
  };
  await new Promise((resolve, reject) => {
    const tx = db.transaction("projects", "readwrite"),
      store = tx.objectStore("projects");
    store.put(before, "pre-provided-product-table:" + Date.now());
    store.put(next, "current");
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  state.catalog = catalog;
  state.providedCatalogueVersion = window.PROVIDED_CATALOG_VERSION || 1;
  syncWriting();
  persist();
}
function filterProducts() {
  const term = ($("product-search")?.value || "")
      .replace(/\s/g, "")
      .toLowerCase(),
    historic = $("show-historic-products")?.checked;
  for (const option of $("engine-product").querySelectorAll("option")) {
    const p = Writer.resolveProduct(state.catalog, option.value),
      unavailable = p && /단종|출시 전|재고 없음/.test(p.status);
    const matches =
      !term ||
      [option.textContent, p?.size, p?.brand, p?.model]
        .join("")
        .replace(/\s/g, "")
        .toLowerCase()
        .includes(term);
    option.hidden =
      !matches ||
      !!(
        unavailable &&
        !historic &&
        option.value !== state.authoring.productKey
      );
    if (p)
      option.textContent = `${Writer.label(p)}${p.size ? " / " + p.size : ""}${p.status && p.status !== "표 기재" ? " · " + p.status : ""}`;
  }
}
const productSelectEasy = renderProductSelect;
renderProductSelect = function () {
  productSelectEasy();
  filterProducts();
};
$("product-search").oninput = filterProducts;
$("show-historic-products").onchange = filterProducts;
$("product-search").onkeydown = (e) => {
  if (e.key !== "Enter") return;
  e.preventDefault();
  const options = [...$("engine-product").options].filter(
    (o) => o.value && !o.hidden,
  );
  const exact = state.catalog.filter(
    (p) =>
      p.model.replace(/\s/g, "").toLowerCase() ===
      $("product-search").value.replace(/\s/g, "").toLowerCase(),
  );
  if (options.length === 1 || exact.length === 1) {
    $("engine-product").value =
      exact.length === 1 ? exact[0].id : options[0].value;
    $("engine-product").onchange();
  }
};
const factsEasy = renderProductFacts;
renderProductFacts = function () {
  factsEasy();
  const p = selectedProduct();
  if (p?.status || p?.note)
    $("engine-product-facts").textContent +=
      "\n" + [p.status, p.note].filter(Boolean).join(" · ");
};
const catalogEasy = renderCatalog;
renderCatalog = function () {
  catalogEasy();
  [...$("catalog-list").children].forEach((row, i) => {
    const p = state.catalog[i];
    row.append(
      node(
        "p",
        [
          p.pack && "구성 " + p.pack,
          p.coverage && "박스 면적 " + p.coverage,
          p.colorOptions,
          p.status,
        ]
          .filter(Boolean)
          .join(" · "),
        "hint",
      ),
    );
  });
};
const productChangeEasy = $("engine-product").onchange;
$("engine-product").onchange = () => {
  productChangeEasy();
  clearTimeout(easyTimer);
  if (easyReady && state.photos.length)
    easyTimer = setTimeout(() => easyGenerate(true), 300);
};
const variantCatalogueBase = renderCatalog;
renderCatalog = function () {
  variantCatalogueBase();
  [...$("catalog-list").children].forEach((row, i) => {
    const p = state.catalog[i];
    if (!p.variants?.length) return;
    const chips = node("div", undefined, "variant-chips");
    for (const v of p.variants) {
      const b = node("button", v.name + (v.status ? " · " + v.status : ""));
      b.type = "button";
      b.onclick = () => {
        const key = p.id + "::" + v.id;
        $("engine-product").value = key;
        $("engine-product").onchange();
        document.querySelector('[data-tab="studio"]').click();
      };
      chips.append(b);
    }
    row.append(chips);
  });
};
const bootEasy = setInterval(async () => {
  if (!writingReady || easyReady) return;
  clearInterval(bootEasy);
  try {
    await seedProvidedProducts();
    easyReady = true;
    renderProductSelect();
    renderCatalog();
    if (state.photos.length) await easyGenerate(true);
    else
      easyStatus(
        "사진을 올리면 자동 보정·문구·디자인 3안을 준비합니다. 제품표 91개가 도감에 들어 있습니다.",
      );
  } catch (e) {
    easyStatus("제품 도감 준비 실패: " + e.message, true);
  }
}, 100);
// Keep everyday actions visible; detailed corrections remain available on demand.
const advanced = node("details", undefined, "advanced-edit"),
  summary = node("summary", "세밀 보정 · 수동 설정 (필요할 때만)");
advanced.id = "advanced-edit";
advanced.append(summary);
const manualActions = node("div", undefined, "toolbar");
for (const id of [
  "auto",
  "reset",
  "analyze-all",
  "apply-recommendation",
  "approve-photo",
])
  manualActions.append($(id));
advanced.append(manualActions, $("photo-analysis"), $("controls"));
document.querySelector(".editor .canvas-wrap").parentElement.append(advanced);
const quickLabel = node("label", "사용 제품 · 모델명 선택"),
  quickSearch = node("input"),
  quickSelect = node("select");
quickSearch.id = "quick-product-search";
quickSearch.type = "search";
quickSearch.placeholder = "모델명·규격 검색";
quickSelect.id = "quick-product";
quickLabel.append(quickSearch, quickSelect);
document.querySelector(".project .eyebrow").after(quickLabel);
const productDetails = node("details"),
  productSummary = node("summary", "직접 제품군·브랜드 입력 (선택)");
productDetails.append(
  productSummary,
  $("product").closest("label"),
  $("material-brand").closest("label"),
);
quickLabel.after(productDetails);
function filterQuickProducts() {
  const term = quickSearch.value.replace(/\s/g, "").toLowerCase();
  for (const o of quickSelect.options) {
    const p = Writer.resolveProduct(state.catalog, o.value);
    o.hidden = !!(
      (term &&
        !o.textContent.replace(/\s/g, "").toLowerCase().includes(term)) ||
      (p &&
        /단종|출시 전|재고 없음/.test(p.status) &&
        p.id !== state.authoring.productKey)
    );
  }
}
function mirrorQuickProducts() {
  quickSelect.replaceChildren(
    ...[...$("engine-product").children].map((n) => n.cloneNode(true)),
  );
  quickSelect.value = state.authoring.productKey;
  filterQuickProducts();
}
const selectMirrorBase = renderProductSelect;
renderProductSelect = function () {
  selectMirrorBase();
  mirrorQuickProducts();
};
quickSelect.onchange = () => {
  $("engine-product").value = quickSelect.value;
  $("engine-product").onchange();
};
quickSearch.oninput = filterQuickProducts;
quickSearch.onkeydown = (e) => {
  if (e.key !== "Enter") return;
  e.preventDefault();
  const options = [...quickSelect.options].filter((o) => o.value && !o.hidden);
  const exact = state.catalog.filter(
    (p) =>
      p.model.replace(/\s/g, "").toLowerCase() ===
      quickSearch.value.replace(/\s/g, "").toLowerCase(),
  );
  if (options.length === 1 || exact.length === 1) {
    quickSelect.value = exact.length === 1 ? exact[0].id : options[0].value;
    quickSelect.onchange();
  }
};
const syncQuickProduct = $("engine-product").onchange;
$("engine-product").onchange = () => {
  syncQuickProduct();
  quickSelect.value = state.authoring.productKey;
};
for (const id of ["title", "region", "memo"]) {
  const handler = $(id).oninput;
  $(id).oninput = (e) => {
    handler?.(e);
    if (writingReady) {
      if (id === "memo") {
        state.authoring.memo = state.memo;
        $("writing-memo").value = state.memo;
      } else {
        state.authoring.site = state.region || state.title;
        $("writing-site").value = state.authoring.site;
      }
      state.authoring.approved = null;
      clearTimeout(easyTimer);
      if (easyReady && state.photos.length)
        easyTimer = setTimeout(() => easyGenerate(true), 500);
    }
  };
}
