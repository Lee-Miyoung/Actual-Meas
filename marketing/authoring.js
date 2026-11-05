"use strict";
const Writer = CheonginContent;
let writingReady = false,
  writingStarting = false,
  csvPending = [],
  pendingPublication = null;
function writingDefaults() {
  return {
    productKey: "",
    mode: "editorial",
    photoKind: "auto",
    site: "",
    memo: "",
    works: [],
    draft: null,
    approved: null,
    approvals: [],
    sequence: 0,
  };
}
function ensureWriting(s) {
  s.contentEngineVersion = 1;
  s.catalog ??= [];
  s.contentHistory ??= [];
  if (!s.authoring) {
    s.authoring = writingDefaults();
    s.authoring.site = s.region || s.title || "";
    s.authoring.memo = s.memo || "";
  }
  s.authoring.approvals ??= [];
  return s;
}
const baseNormaliseContent = normalise;
normalise = function (s) {
  baseNormaliseContent(s);
  if (writingReady) ensureWriting(s);
  return s;
};
const validateContentBase = validate;
validate = function (s) {
  validateContentBase(s);
  if (s.contentEngineVersion === undefined) return s;
  if (s.contentEngineVersion !== 1)
    throw Error("지원하지 않는 콘텐츠 엔진 버전입니다.");
  if (
    !Array.isArray(s.catalog) ||
    s.catalog.length > 1000 ||
    !Array.isArray(s.contentHistory) ||
    s.contentHistory.length > 10000
  )
    throw Error("제품/게시 이력 형식 오류");
  const ids = new Set();
  for (const p of s.catalog) {
    Writer.normalProduct(p);
    if (!p.id || ids.has(p.id))
      throw Error("제품 식별자가 누락되거나 중복되었습니다.");
    ids.add(p.id);
  }
  for (const h of s.contentHistory)
    if (
      typeof h.id !== "string" ||
      typeof h.title !== "string" ||
      typeof h.caption !== "string" ||
      typeof h.mode !== "string"
    )
      throw Error("콘텐츠 이력 형식 오류");
  const a = s.authoring;
  if (
    !a ||
    typeof a.productKey !== "string" ||
    !Object.hasOwn(Writer.MODES, a.mode) ||
    !Array.isArray(a.works) ||
    a.works.some((w) => !Writer.WORKS.includes(w)) ||
    typeof a.site !== "string" ||
    typeof a.memo !== "string" ||
    !Number.isSafeInteger(a.sequence) ||
    a.sequence < 0
  )
    throw Error("작성 설정 형식 오류");
  if (
    a.approvals !== undefined &&
    (!Array.isArray(a.approvals) || a.approvals.length > 1000)
  )
    throw Error("승인 보관함 형식 오류");
  for (const d of [a.draft, a.approved, ...(a.approvals || [])])
    if (d) {
      if (
        !Array.isArray(d.titles) ||
        d.titles.length !== 3 ||
        d.titles.some((t) => typeof t !== "string") ||
        !Array.isArray(d.carousel) ||
        d.carousel.length < 3 ||
        d.carousel.length > 6 ||
        d.carousel.some(
          (c) => typeof c.text !== "string" || typeof c.role !== "string",
        ) ||
        !Number.isInteger(d.selectedTitle) ||
        d.selectedTitle < 0 ||
        d.selectedTitle > 2 ||
        typeof d.inputSignature !== "string"
      )
        throw Error("콘텐츠 초안 형식 오류");
      for (const k of [
        "caption",
        "hook",
        "script",
        "story",
        "hashtags",
        "comment",
        "blog",
        "shorts",
        "kakao",
      ])
        if (typeof d[k] !== "string") throw Error("콘텐츠 문구 형식 오류");
      Writer.normalProduct(d.product);
    }
  return s;
};
const officeContentSync = syncOffice;
syncOffice = function () {
  officeContentSync();
  if (writingReady) {
    ensureWriting(state);
    syncWriting();
  } else startWriting();
};
async function startWriting() {
  if (writingReady || writingStarting || !officeReady) return;
  writingStarting = true;
  try {
    const stored = await dbGet("current");
    if (stored) validate(stored);
    const next = ensureWriting(structuredClone(state)),
      previousMigration = await dbGet("pre-content-engine-v1");
    if (!stored?.contentEngineVersion) {
      await new Promise((resolve, reject) => {
        const t = db.transaction("projects", "readwrite"),
          store = t.objectStore("projects");
        if (previousMigration)
          store.put(
            previousMigration,
            "pre-content-engine-history:" + Date.now(),
          );
        if (stored) store.put(stored, "pre-content-engine-v1");
        store.put(next, "current");
        t.oncomplete = resolve;
        t.onerror = () => reject(t.error);
      });
      state = next;
    } else ensureWriting(state);
    writingReady = true;
    syncWriting();
    toast("자동 작성 엔진을 준비했습니다. 기존 자료는 보존했습니다.");
  } catch (e) {
    toast("콘텐츠 엔진 초기화 실패: " + e.message);
    $("make-copy").disabled = true;
  } finally {
    writingStarting = false;
  }
}
function selectedProduct() {
  const key = state.authoring.productKey,
    p = Writer.resolveProduct(state.catalog, key);
  if (p) return structuredClone(p);
  if (key.startsWith("category:")) {
    const [, type, ...rest] = key.split(":");
    return Writer.normalProduct({
      id: key,
      type,
      category: rest.join(":"),
      verified: false,
    });
  }
  return null;
}
function contentInput() {
  return {
    product: selectedProduct(),
    mode: state.authoring.mode,
    works: state.authoring.works,
    site: state.authoring.site,
    region: "",
    memo: state.authoring.memo,
    count: state.slideCount,
    photoKind: state.authoring.photoKind,
    photoCount: state.photos.length,
    contact:
      state.settings.kakao ||
      state.settings.website ||
      state.settings.instagram ||
      "",
  };
}
window.currentWritingSignature = function () {
  if (!writingReady) return "";
  return JSON.stringify({
    ...contentInput(),
    photos: state.photos.map((p) => p.id),
  });
};
function fieldChanged() {
  state.authoring.approved = null;
  persist();
  renderProductFacts();
  renderModeSuggestion();
  renderApproval();
}
function chooseDefaultProduct() {
  const a = state.authoring;
  if (a.productKey) return;
  if (state.catalog.length === 1) a.productKey = state.catalog[0].id;
  else {
    const type = ["시그니월", "벽장재"].includes(state.product)
      ? "wall"
      : "floor";
    a.productKey = `category:${type}:${state.product === "대형마루" ? "광폭·대형마루" : state.product}`;
  }
}
function renderProductSelect() {
  const select = $("engine-product");
  select.replaceChildren();
  const empty = node("option", "제품을 확인하세요");
  empty.value = "";
  select.append(empty);
  for (const [type, label] of [
    ["floor", "등록 바닥재"],
    ["wall", "등록 벽장재"],
  ]) {
    const group = node("optgroup");
    group.label = label;
    for (const p of state.catalog.filter((p) => p.type === type)) {
      const o = node(
        "option",
        Writer.label(p) +
          [p.size, p.color]
            .filter(Boolean)
            .map((s) => " / " + s)
            .join(""),
      );
      o.value = p.id;
      group.append(o);
      for (const v of p.variants || []) {
        const child = node(
          "option",
          `${Writer.label(p)} · ${v.name}${v.size ? " / " + v.size : ""}`,
        );
        child.value = p.id + "::" + v.id;
        group.append(child);
      }
    }
    select.append(group);
  }
  for (const [type, categories] of Object.entries(Writer.TYPES)) {
    const g = node("optgroup");
    g.label = (type === "floor" ? "바닥재" : "벽장재") + " · 제품군만 선택";
    for (const category of categories) {
      const o = node("option", category + " · 모델 미등록");
      o.value = `category:${type}:${category}`;
      g.append(o);
    }
    select.append(g);
  }
  select.value = state.authoring.productKey;
  if (!select.value && state.authoring.productKey) {
    const p = node("option", "이전 제품을 찾지 못했습니다 · 다시 선택");
    p.value = state.authoring.productKey;
    select.append(p);
    select.value = p.value;
  }
}
function renderProductFacts() {
  const p = selectedProduct();
  $("engine-product-facts").textContent = p
    ? `${p.type === "wall" ? "벽장재" : "바닥재"} / ${Writer.label(p)}${Writer.facts(p).length ? "\n" + Writer.facts(p).join(" · ") : "\n모델·규격·특징을 추정하지 않습니다. 제품군만 사용합니다."}`
    : "제품을 선택하세요. 사진만으로 제품을 식별하지 않습니다.";
}
function observedPerformance() {
  return Writer.stats(state.posts, state.insights, state.leads);
}
function renderModeSuggestion() {
  const r = Writer.recommend(
    contentInput(),
    state.contentHistory,
    observedPerformance(),
  );
  $("mode-recommendation").textContent =
    `추천: ${Writer.MODES[r.mode]}\n${r.reason}`;
  $("apply-writing-mode").dataset.mode = r.mode;
}
function renderApproval() {
  const a = state.authoring,
    stale = a.draft && a.draft.inputSignature !== currentWritingSignature();
  $("writing-approval").textContent =
    a.approved && !stale
      ? "최종 승인본 저장됨"
      : stale
        ? "현장·제품 정보가 바뀌었습니다. 다시 작성해 주세요."
        : a.draft
          ? "초안 자동저장 · 최종 승인 전"
          : "제품 확인 후 한 번에 작성하세요.";
  $("writing-warning").textContent = a.draft
    ? (a.draft.warnings || []).join(" ")
    : "";
}
function syncWriting() {
  chooseDefaultProduct();
  const a = state.authoring;
  renderProductSelect();
  $("writing-site").value = a.site;
  $("writing-memo").value = a.memo;
  $("writing-mode").value = a.mode;
  $("photo-kind").value = a.photoKind;
  $("writing-count").value = state.slideCount;
  $("writing-photo-status").textContent =
    `현재 현장 사진 ${state.photos.length}장 · 자동 제품 인식은 하지 않습니다.`;
  for (const input of $("work-options").querySelectorAll("input"))
    input.checked = a.works.includes(input.value);
  const strip = $("writing-photo-strip");
  strip.replaceChildren();
  state.photos.forEach((p, i) => {
    const b = node("button"),
      img = node("img");
    img.src = p.src;
    img.alt = `현장 사진 ${i + 1}`;
    img.loading = "lazy";
    b.title = "사진 보정 화면에서 확인";
    b.append(img);
    b.onclick = () => {
      selected = i;
      thumbnails();
      preview();
      document.querySelector('[data-tab="studio"]').click();
    };
    strip.append(b);
  });
  renderProductFacts();
  renderModeSuggestion();
  renderCatalog();
  renderContentHistory();
  renderContentPerformance();
  renderApproval();
  if (a.draft) renderDraft();
  renderLegacyCopy();
  renderApprovalArchive();
}
for (const work of Writer.WORKS) {
  const label = node("label", undefined, "checkline"),
    input = node("input");
  input.type = "checkbox";
  input.value = work;
  input.onchange = () => {
    state.authoring.works = [
      ...$("work-options").querySelectorAll("input:checked"),
    ].map((n) => n.value);
    fieldChanged();
  };
  label.append(input, document.createTextNode(work));
  $("work-options").append(label);
}
$("engine-product").onchange = () => {
  state.authoring.productKey = $("engine-product").value;
  const p = selectedProduct();
  if (p) {
    state.product = p.category === "광폭·대형마루" ? "대형마루" : p.category;
    if (![...$("product").options].some((o) => o.value === state.product))
      $("product").add(new Option(state.product, state.product));
    $("product").value = state.product;
    state.materialBrand = p.brand;
    if (![...$("material-brand").options].some((o) => o.value === p.brand))
      $("material-brand").add(new Option(p.brand || "브랜드 미등록", p.brand));
    $("material-brand").value = p.brand;
  }
  fieldChanged();
};
for (const [id, key] of [
  ["writing-site", "site"],
  ["writing-memo", "memo"],
  ["writing-mode", "mode"],
  ["photo-kind", "photoKind"],
])
  $(id).oninput = () => {
    state.authoring[key] = $(id).value;
    fieldChanged();
  };
$("writing-count").onchange = () => {
  state.slideCount = Number($("writing-count").value);
  $("slide-count").value = state.slideCount;
  fieldChanged();
};
$("apply-writing-mode").onclick = () => {
  state.authoring.mode = $("apply-writing-mode").dataset.mode;
  $("writing-mode").value = state.authoring.mode;
  fieldChanged();
};
$("go-catalog").onclick = () =>
  document.querySelector('[data-tab="products"]').click();
$("go-photo-editor").onclick = () =>
  document.querySelector('[data-tab="studio"]').click();
$("writing-photos").onchange = async (e) => {
  await $("photos").onchange(e);
  syncWriting();
};
function titleSelected(index) {
  const d = state.authoring.draft,
    old = d.titles[d.selectedTitle];
  d.selectedTitle = index;
  if (d.caption.startsWith(old))
    d.caption = d.titles[index] + d.caption.slice(old.length);
  d.carousel[0].text = d.titles[index];
  state.authoring.approved = null;
  persist();
  renderDraft();
}
function updateDraft() {
  state.authoring.approved = null;
  persist();
  renderApproval();
  renderInstagram();
}
function renderInstagram() {
  const d = state.authoring.draft,
    host = $("instagram-preview");
  host.replaceChildren();
  if (!d) return;
  host.append(
    node("p", "청인마루 / 게시글 미리보기", "eyebrow"),
    node("h3", d.titles[d.selectedTitle]),
    node(
      "p",
      d.caption.startsWith(d.titles[d.selectedTitle])
        ? d.caption.slice(d.titles[d.selectedTitle].length).trimStart()
        : d.caption,
    ),
    node("p", d.hashtags, "hint"),
  );
}
function editable(host, labelText, value, onchange, id) {
  const l = node("label", labelText),
    t = node("textarea");
  t.value = value;
  if (id) t.id = id;
  t.oninput = () => {
    onchange(t.value);
    updateDraft();
  };
  const b = node("button", "복사");
  b.type = "button";
  b.onclick = () => copyWriting(t.value, t);
  l.append(t, b);
  host.append(l);
  return t;
}
function renderDraft() {
  const a = state.authoring,
    d = a.draft;
  if (!d) return;
  const choices = $("title-choices");
  choices.replaceChildren();
  choices.append(node("h3", "제목 3안 · 선택 후 바로 수정"));
  d.titles.forEach((title, i) => {
    const l = node("label", undefined, "title-option"),
      r = node("input");
    r.type = "radio";
    r.name = "writing-title";
    r.checked = d.selectedTitle === i;
    r.onchange = () => titleSelected(i);
    const t = node("input");
    t.type = "text";
    t.value = title;
    t.maxLength = 180;
    t.oninput = () => {
      const old = d.titles[i];
      d.titles[i] = t.value;
      if (i === d.selectedTitle) {
        if (d.caption.startsWith(old))
          d.caption = t.value + d.caption.slice(old.length);
        d.carousel[0].text = t.value;
        if ($("engine-caption")) $("engine-caption").value = d.caption;
        const firstCard = document.querySelector(".card-copy-editor textarea");
        if (firstCard) firstCard.value = t.value;
      }
      updateDraft();
    };
    l.append(r, t);
    choices.append(l);
  });
  const host = $("copy-content");
  host.replaceChildren();
  editable(
    host,
    "인스타그램 게시글 완성본",
    d.caption,
    (v) => (d.caption = v),
    "engine-caption",
  );
  const cards = node("div", undefined, "card-copy-editor");
  cards.append(node("h3", `캐러셀 ${d.carousel.length}장 구성 · 카드 문구`));
  d.carousel.forEach((c, i) => {
    const l = node("label", `${i + 1}. ${c.role} / 추천 사진 ${c.photo}`),
      t = node("textarea");
    t.value = c.text;
    t.oninput = () => {
      c.text = t.value;
      updateDraft();
    };
    l.append(t);
    cards.append(l);
  });
  host.append(cards);
  for (const [key, title] of [
    ["hook", "릴스 첫 3초 후킹 문구"],
    ["script", "릴스 대본"],
    ["story", "스토리 소개 문구"],
    ["hashtags", "해시태그"],
    ["comment", "고정댓글"],
    ["blog", "네이버 블로그 긴 글 초안"],
    ["shorts", "YouTube Shorts"],
    ["kakao", "카카오채널"],
  ])
    editable(host, title, d[key], (v) => (d[key] = v));
  renderInstagram();
  renderApproval();
}
async function copyWriting(text, field) {
  try {
    await navigator.clipboard.writeText(text);
    toast("복사했습니다.");
  } catch {
    field?.select();
    toast("복사 권한을 확인하거나 선택된 문구를 직접 복사하세요.");
  }
}
async function generateWriting(force = false) {
  if (!writingReady) return toast("저장소를 준비하고 있습니다.");
  if (state.photos.length < 1 || state.photos.length > 10)
    return toast("현장 사진을 먼저 등록하세요.");
  if (!selectedProduct())
    return toast("제품을 선택하거나 제품 도감에 등록하세요.");
  if (
    force &&
    state.authoring.draft &&
    !confirm(
      "현재 수정한 초안을 새 문구로 교체할까요? 승인본과 게시 이력은 보존됩니다.",
    )
  )
    return;
  const a = state.authoring;
  if (
    !force &&
    a.draft &&
    a.draft.inputSignature === currentWritingSignature()
  ) {
    renderDraft();
    return;
  }
  a.sequence++;
  a.draft = Writer.create(contentInput(), state.contentHistory, a.sequence);
  a.draft.inputSignature = currentWritingSignature();
  a.approved = null;
  persist();
  renderDraft();
  toast("제품 정보와 선택한 작업으로 문구를 작성했습니다.");
}
renderCopy = function () {
  return generateWriting(false);
};
$("make-copy").onclick = () => generateWriting(true);
$("approve-writing").onclick = () => {
  const a = state.authoring;
  if (!a.draft) return toast("먼저 콘텐츠를 작성하세요.");
  if (a.draft.inputSignature !== currentWritingSignature())
    return toast("제품·현장 정보가 바뀌었습니다. 다시 작성해 주세요.");
  if (!a.draft.titles[a.draft.selectedTitle].trim() || !a.draft.caption.trim())
    return toast("제목과 게시글을 확인하세요.");
  a.approved = {
    ...structuredClone(a.draft),
    id: crypto.randomUUID(),
    approvedAt: new Date().toISOString(),
  };
  a.approvals.push(structuredClone(a.approved));
  persist();
  renderApproval();
  renderApprovalArchive();
  toast("최종 승인본을 프로젝트와 함께 저장했습니다.");
};
$("copy-caption").onclick = () => {
  const d = state.authoring.draft;
  if (!d) return toast("먼저 작성하세요.");
  copyWriting(d.caption + "\n\n" + d.hashtags, $("engine-caption"));
};
function renderLegacyCopy() {
  const host = $("legacy-copy");
  host.replaceChildren();
  for (const [key, value] of Object.entries(state.copyDrafts || {})) {
    const l = node("label", key),
      t = node("textarea");
    t.value = value.text;
    t.readOnly = true;
    l.append(t);
    host.append(l);
  }
}
function renderCatalog() {
  const host = $("catalog-list");
  host.replaceChildren();
  for (const p of state.catalog) {
    const row = node("article", undefined, "catalog-row");
    row.append(
      node("h3", Writer.label(p)),
      node(
        "p",
        `${p.type === "wall" ? "벽장재" : "바닥재"} · ${[p.size, p.color, p.material].filter(Boolean).join(" / ") || "세부 정보 미등록"}`,
      ),
      node(
        "p",
        p.features
          ? (p.verified ? "확인 특징: " : "문구에서 제외되는 미확인 특징: ") +
              p.features
          : "특징 미등록",
        "hint",
      ),
    );
    const b = node("button", "제품 수정");
    b.onclick = () => {
      for (const k of [
        "type",
        "category",
        "brand",
        "model",
        "size",
        "color",
        "material",
        "pack",
        "coverage",
        "colorOptions",
        "features",
        "source",
      ])
        $("catalog-" + k).value = p[k] || "";
      $("catalog-verified").checked = p.verified;
      $("catalog-form").dataset.edit = p.id;
      $("catalog-form").scrollIntoView({ behavior: "smooth" });
    };
    row.append(b);
    host.append(row);
  }
}
function resetCatalogForm() {
  $("catalog-form").reset();
  delete $("catalog-form").dataset.edit;
}
$("catalog-cancel").onclick = resetCatalogForm;
$("catalog-form").onsubmit = (e) => {
  e.preventDefault();
  try {
    const raw = {
      ...state.catalog.find((p) => p.id === $("catalog-form").dataset.edit),
      id: $("catalog-form").dataset.edit || crypto.randomUUID(),
    };
    for (const k of [
      "type",
      "category",
      "brand",
      "model",
      "size",
      "color",
      "material",
      "pack",
      "coverage",
      "colorOptions",
      "features",
      "source",
    ])
      raw[k] = $("catalog-" + k).value;
    raw.verified = $("catalog-verified").checked;
    const p = Writer.normalProduct(raw);
    if (
      state.catalog.some(
        (x) => x.id !== p.id && Writer.identity(x) === Writer.identity(p),
      )
    )
      throw Error("동일한 제품 정보가 이미 있습니다.");
    const i = state.catalog.findIndex((x) => x.id === p.id);
    if (i < 0) state.catalog.push(p);
    else state.catalog[i] = p;
    if (i < 0 || !state.authoring.productKey || state.catalog.length === 1)
      state.authoring.productKey = p.id;
    if (state.authoring.productKey === p.id) state.authoring.approved = null;
    persist();
    resetCatalogForm();
    renderCatalog();
    renderProductSelect();
    renderProductFacts();
    renderApproval();
    toast("제품을 저장했습니다.");
  } catch (err) {
    toast(err.message);
  }
};
$("csv-template").onclick = () =>
  download(
    new Blob([Writer.csvTemplate()], { type: "text/csv;charset=utf-8" }),
    "청인마루_제품양식.csv",
  );
$("catalog-csv").onchange = async (e) => {
  csvPending = [];
  $("confirm-csv").disabled = true;
  const host = $("csv-preview");
  host.replaceChildren();
  try {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) throw Error("CSV는 2MB 이하로 준비하세요.");
    const result = Writer.parseCSV(await f.text());
    csvPending = result.products;
    host.append(
      node(
        "p",
        `유효 제품 ${result.products.length}개 / 오류 ${result.errors.length}개. 오류가 있으면 전체 가져오기를 중단합니다.`,
      ),
    );
    for (const err of result.errors)
      host.append(node("p", err, "validation-error"));
    for (const p of csvPending.slice(0, 20))
      host.append(
        node(
          "p",
          `${p.type === "wall" ? "벽장재" : "바닥재"} / ${Writer.label(p)} / ${p.size || "규격 미등록"} / ${p.color || "색상 미등록"}${p.features && !p.verified ? " · 미확인 특징은 글에서 제외" : ""}`,
        ),
      );
    $("confirm-csv").disabled = !!result.errors.length || !csvPending.length;
  } catch (err) {
    host.append(node("p", err.message, "validation-error"));
  } finally {
    e.target.value = "";
  }
};
$("confirm-csv").onclick = () => {
  try {
    const next = structuredClone(state.catalog);
    let added = 0,
      skipped = 0;
    for (const product of csvPending) {
      if (next.some((p) => Writer.identity(p) === Writer.identity(product))) {
        skipped++;
        continue;
      }
      if (product.id && next.some((p) => p.id === product.id))
        throw Error(
          "다른 제품과 ID가 겹칩니다. 기존 제품을 덮어쓰지 않았습니다.",
        );
      next.push({ ...product, id: product.id || crypto.randomUUID() });
      added++;
    }
    if (next.length > 1000)
      throw Error("제품은 1000개까지 등록할 수 있습니다.");
    state.catalog = next;
    csvPending = [];
    $("confirm-csv").disabled = true;
    persist();
    renderCatalog();
    renderProductSelect();
    toast(
      `${added}개 추가 / 동일 정보 ${skipped}개 유지. 기존 제품은 덮어쓰지 않았습니다.`,
    );
  } catch (e) {
    toast(e.message);
  }
};
// Approved snapshots attach to a scheduled post only through the explicit preparation action.
$("save-post").onclick = () => {
  const a = state.authoring;
  if (!a.approved || a.approved.inputSignature !== currentWritingSignature())
    return toast("현재 문구를 최종 승인한 뒤 게시 일정으로 보내세요.");
  pendingPublication = structuredClone(a.approved);
  delete $("schedule-form").dataset.edit;
  $("post-title").value = a.approved.titles[a.approved.selectedTitle];
  $("post-date").value = localDate();
  $("post-status").value = "게시 준비";
  document.querySelector('[data-tab="records"]').click();
  toast(
    "게시 날짜를 확인하고 저장하세요. 게시 완료로 바꾸면 표현 이력에 기록합니다.",
  );
};
const scheduleContentBase = $("schedule-form").onsubmit;
$("schedule-form").onsubmit = (e) => {
  const editing = $("schedule-form").dataset.edit;
  scheduleContentBase(e);
  if (pendingPublication && !editing) {
    const p = state.posts.at(-1),
      d = pendingPublication;
    p.contentMode = d.mode;
    p.productSnapshot = structuredClone(d.product);
    p.productId = d.product.id;
    p.contentSnapshot = {
      ...d,
      titles: d.titles.map((t, i) => (i === d.selectedTitle ? p.title : t)),
    };
    p.topic = state.authoring.site || d.product.category;
    pendingPublication = null;
    persist();
    renderContentHistory();
  }
  pendingPublication = null;
  renderContentPerformance();
};
function syncPublishedHistory() {
  if (!writingReady) return;
  for (const p of state.posts.filter((p) => p.status === "게시 완료")) {
    const d = p.contentSnapshot,
      h = {
        id: p.id,
        title: p.title,
        caption: d?.caption || "",
        mode: p.contentMode || "",
        productId: p.productId || "",
        productSnapshot: p.productSnapshot || null,
        date: p.date,
        projectId: p.projectId || "",
      };
    const i = state.contentHistory.findIndex((x) => x.id === p.id);
    if (i < 0) state.contentHistory.push(h);
    else state.contentHistory[i] = h;
  }
}
const persistContentBase = persist;
persist = function () {
  if (writingReady) syncPublishedHistory();
  return persistContentBase();
};
function renderContentHistory() {
  syncPublishedHistory();
  const host = $("content-history");
  host.replaceChildren();
  for (const h of state.contentHistory.slice(-12).reverse())
    host.append(
      node(
        "p",
        `${h.date || "날짜 미입력"} · ${Writer.MODES[h.mode] || "이전 게시물"} · ${h.title}`,
      ),
    );
  if (!state.contentHistory.length)
    host.append(
      node(
        "p",
        "아직 게시 완료 이력이 없습니다. 승인만으로 게시 이력을 만들지 않습니다.",
        "hint",
      ),
    );
  renderModeSuggestion();
}
function renderContentPerformance() {
  if (!writingReady) return;
  const result = observedPerformance(),
    host = $("content-performance");
  host.replaceChildren();
  host.append(node("h3", "콘텐츠 유형별 실제 기록"));
  for (const r of result.rows)
    host.append(
      node(
        "p",
        `${Writer.MODES[r.mode]} ${r.count}건 · 신규 팔로워 ${r.followers} · 저장 ${r.saves} · 공유 ${r.shares} · 상담 ${r.leads}`,
      ),
    );
  const note = result.sufficient
    ? Writer.recommend(contentInput(), state.contentHistory, result).reason
    : `성과가 기록된 게시 완료 콘텐츠 ${result.measured}건입니다. 3건 이상·2가지 유형 이상의 기록 전에는 성과 기반 유형 순위를 제시하지 않습니다.`;
  host.append(node("p", note, "hint"));
  const recommendations = $("recommendations");
  recommendations.replaceChildren();
  recommendations.append(node("p", note));
}
const growthContentBase = renderGrowth;
renderGrowth = function () {
  growthContentBase();
  if (writingReady) renderContentPerformance();
};
const writePhotoBase = $("photos").onchange;
$("photos").onchange = async (e) => {
  await writePhotoBase(e);
  if (writingReady) {
    state.authoring.approved = null;
    syncWriting();
  }
};
// Provide the original project fields as optional starting context, not asserted product identity.
const startContentPoll = setInterval(() => {
  if (officeReady && !writingReady && !writingStarting) startWriting();
  if (writingReady) clearInterval(startContentPoll);
}, 100);

function renderApprovalArchive() {
  const host = $("approval-archive");
  host.replaceChildren();
  for (const d of (state.authoring.approvals || []).slice(-10).reverse()) {
    const detail = node("details"),
      summary = node(
        "summary",
        `${d.approvedAt?.slice(0, 10) || ""} · ${d.titles[d.selectedTitle]}`,
      ),
      text = node("textarea");
    text.value = d.caption + "\n\n" + d.hashtags;
    text.readOnly = true;
    detail.append(summary, text);
    host.append(detail);
  }
}

$("content-migration-backup").onclick = async () => {
  const saved = await dbGet("pre-content-engine-v1");
  if (!saved) return toast("기존 자료가 없어 이전 사본이 없습니다.");
  download(
    new Blob([JSON.stringify(saved)], { type: "application/json" }),
    "청인마루_자동작성엔진_업데이트전.json",
  );
};
