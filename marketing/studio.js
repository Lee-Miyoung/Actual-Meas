"use strict";
const $ = (id) => document.getElementById(id),
  defaults = () => ({
    exposure: 0,
    warmth: 0,
    contrast: 0,
    rotation: 0,
    zoom: 1,
    vertical: 0,
    horizontal: 0,
    x: 0,
    y: 0,
  });
let state = {
    version: 1,
    title: "",
    product: "강마루",
    memo: "",
    mascot: "none",
    theme: "editorial",
    format: "carousel",
    photos: [],
    records: [],
  },
  selected = 0,
  original = false,
  db,
  saveTimer,
  saving = Promise.resolve();
const images = new Map(),
  assets = {};
const controls = [
  ["exposure", "노출", -0.7, 0.7, 0.01],
  ["warmth", "색온도 (미세 조정)", -12, 12, 1],
  ["contrast", "대비", -15, 15, 1],
  ["rotation", "수평 회전 °", -8, 8, 0.1],
  ["zoom", "확대 / 구도", 1, 1.5, 0.01],
  ["vertical", "수직 원근", -0.15, 0.15, 0.005],
  ["horizontal", "수평 원근", -0.15, 0.15, 0.005],
  ["x", "좌우 구도", -0.2, 0.2, 0.005],
  ["y", "상하 구도", -0.2, 0.2, 0.005],
];
function toast(message) {
  $("toast").textContent = message;
  $("toast").hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => ($("toast").hidden = true), 5000);
}
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(Error("이미지를 읽을 수 없습니다."));
    i.src = src;
  });
}
// Keep only two decoded working images. Originals remain unchanged in IndexedDB.
const photoLoads = new Map();
let photoDecodeQueue = Promise.resolve();
async function photoImage(p) {
  const pending = photoLoads.get(p.id);
  if (pending?.src === p.src) return pending.promise;
  const promise = photoDecodeQueue.catch(()=>{}).then(()=>decodeWorkingPhoto(p));
  photoLoads.set(p.id,{src:p.src,promise});
  photoDecodeQueue=promise.then(()=>{},()=>{});
  try { return await promise; } finally { if(photoLoads.get(p.id)?.promise===promise)photoLoads.delete(p.id); }
}
async function decodeWorkingPhoto(p) {
  if (images.has(p.id)) {
    const cached = images.get(p.id); images.delete(p.id); images.set(p.id, cached);
    return cached;
  }
  const source = await loadImage(p.src);
  if(source.width*source.height>48000000||Math.max(source.width,source.height)>12000){source.src="";throw Error('사진 크기를 4800만 화소 이하로 줄여 주세요.');}
  p.sourceWidth = source.width; p.sourceHeight = source.height;
  const scale = Math.min(1, 1800 / Math.max(source.width, source.height));
  const working = document.createElement("canvas");
  working.width = Math.max(1, Math.round(source.width * scale));
  working.height = Math.max(1, Math.round(source.height * scale));
  working.getContext("2d").drawImage(source, 0, 0, working.width, working.height);
  source.src = "";
  if (!p.thumbnail) {
    const thumb = document.createElement("canvas"), ratio = Math.min(1, 240 / Math.max(working.width, working.height));
    thumb.width = Math.max(1, Math.round(working.width * ratio)); thumb.height = Math.max(1, Math.round(working.height * ratio));
    thumb.getContext("2d").drawImage(working, 0, 0, thumb.width, thumb.height);
    p.thumbnail = thumb.toDataURL("image/jpeg", .75); thumb.width = thumb.height = 1;
  }
  images.set(p.id, working);
  // Evicted canvases may still be in use by a concurrent render. Let GC release them.
  while (images.size > 2) images.delete(images.keys().next().value);
  return working;
}

// One IndexedDB structured clone per write; coalesce edits while a write is pending.
let saveDirty=false,saveRunning=false;
function flushPendingSave(){
  clearTimeout(saveTimer);
  if(!db||!saveDirty||saveRunning)return saving;
  saveRunning=true;
  saving=(async()=>{
    try{
      while(saveDirty){
        saveDirty=false;
        await new Promise((resolve,reject)=>{
          const tx=db.transaction("projects","readwrite");
          tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error("저장 중단"));
          tx.objectStore("projects").put(state,"current");
        });
      }
      $("save-status").textContent="이 기기에 저장됨";
    }catch(e){saveDirty=true;$("save-status").textContent="저장 실패 · 백업 필요";toast("저장 용량 또는 브라우저 권한을 확인하고 JSON 백업을 보관하세요.");}
    finally{saveRunning=false;}
  })();
  return saving;
}
function persist(){
  saveDirty=true;clearTimeout(saveTimer);$("save-status").textContent="저장 대기";
  saveTimer=setTimeout(flushPendingSave,250);
}
document.addEventListener('visibilitychange',()=>{if(document.hidden)flushPendingSave();});
window.addEventListener('pagehide',flushPendingSave);
function download(blob, name) {
  const url = URL.createObjectURL(blob),
    a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
function exportCanvas(c,name){
  return new Promise(resolve=>{try{c.toBlob(b=>{c.width=c.height=1;if(b)download(b,name);else toast("이미지 생성에 실패했습니다.");resolve();},"image/png");}catch(e){c.width=c.height=1;toast(e.message);resolve();}});
}
function correctedCanvas(img, p, max = 1800) {
  const scale = Math.min(1, max / Math.max(img.width, img.height)),
    c = document.createElement("canvas");
  c.width = Math.round(img.width * scale);
  c.height = Math.round(img.height * scale);
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, c.width, c.height);
  if (original || (!p.exposure && !p.warmth && !p.contrast)) return c;
  const d = ctx.getImageData(0, 0, c.width, c.height),
    gain = 2 ** p.exposure,
    contrast = 1 + p.contrast / 100;
  for (let i = 0; i < d.data.length; i += 4) {
    for (let j = 0; j < 3; j++) {
      const shift = j === 0 ? p.warmth : j === 2 ? -p.warmth : 0;
      d.data[i + j] = Math.max(
        0,
        Math.min(255, (d.data[i + j] * gain + shift - 128) * contrast + 128),
      );
    }
  }
  ctx.putImageData(d, 0, 0);
  return c;
}
function transformed(img, p, max = 1800) {
  const source = correctedCanvas(img, p, max);
  if (original || (!p.rotation && (!p.zoom || p.zoom === 1) && !p.vertical && !p.horizontal && !p.x && !p.y)) return source;
  const c = document.createElement("canvas");
  c.width = source.width;
  c.height = source.height;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#e6e7df";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.translate(c.width / 2 + p.x * c.width, c.height / 2 + p.y * c.height);
  ctx.rotate((p.rotation * Math.PI) / 180);
  const angle = (p.rotation * Math.PI) / 180;
  const fit =
    (Math.max(
      (Math.abs(Math.cos(angle)) * c.width +
        Math.abs(Math.sin(angle)) * c.height) /
        c.width,
      (Math.abs(Math.sin(angle)) * c.width +
        Math.abs(Math.cos(angle)) * c.height) /
        c.height,
    ) /
      (1 - Math.abs(p.vertical) - Math.abs(p.horizontal))) *
    (1 + 2 * Math.max(Math.abs(p.x), Math.abs(p.y)));
  ctx.scale(p.zoom * fit, p.zoom * fit);
  const w = source.width,
    h = source.height;
  // Perspective strips preserve image content; no generative material replacement.
  for (let sy = 0; sy < h; sy += 2) {
    const sh = Math.min(2, h - sy),
      v = (sy / h - 0.5) * 2,
      factor = 1 + p.vertical * v,
      shift = (p.horizontal * v * w) / 2;
    ctx.drawImage(
      source,
      0,
      sy,
      w,
      sh,
      (-w * factor) / 2 + shift,
      sy - h / 2,
      w * factor,
      sh + 0.6,
    );
  }
  source.width = source.height = 1;
  return c;
}
let editorPreviewRevision=0;
async function preview() {
  const revision=++editorPreviewRevision;
  const c = $("photo-preview"),
    ctx = c.getContext("2d");
  ctx.clearRect(0, 0, c.width, c.height);
  $("empty").hidden = !!state.photos.length;
  if (!state.photos.length) return;
  const p = state.photos[selected];
  if (!p) return;
  const img = await photoImage(p);
  if(revision!==editorPreviewRevision)return;
  const out = transformed(img, p.adjust, 1200);
  try{
    if(revision!==editorPreviewRevision)return;
    c.width = out.width;
    c.height = out.height;
    ctx.drawImage(out, 0, 0);
  }finally{out.width=out.height=1;}
  for (const [key] of controls) {
    $(key).value = p.adjust[key];
    $(`${key}-value`).textContent = p.adjust[key];
  }
}
function thumbnails() {
  const host = $("thumbnails");
  host.replaceChildren();
  state.photos.forEach((p, i) => {
    const b = document.createElement("button");
    b.className = "thumb" + (i === selected ? " selected" : "");
    b.title = `사진 ${i + 1}: ${p.name}`;
    const im = document.createElement("img");
    im.src = p.thumbnail || p.src;
    im.alt = p.name;
    b.append(im);
    b.onclick = () => {
      selected = i;
      thumbnails();
      preview();
    };
    host.append(b);
  });
}
function invalidate() {
  $("designs").replaceChildren();
  $("copy-content").replaceChildren();
  persist();
}
for (const [key, label, min, max, step] of controls) {
  const l = document.createElement("label");
  l.innerHTML = `<span class="control-head">${label}<output id="${key}-value">${defaults()[key]}</output></span><input id="${key}" type="range" min="${min}" max="${max}" step="${step}" value="${defaults()[key]}">`;
  $("controls").append(l);
  $(key).oninput = () => {
    if (!state.photos.length) return;
    state.photos[selected].adjust[key] = Number($(key).value);
    preview();
    invalidate();
  };
}
$("photos").onchange = async (e) => {
  try {
    const files = [...e.target.files];
    if (!files.length) return;
    if (files.length < 1 || files.length > 10)
      throw Error("사진을 1–10장 선택하세요.");
    if (
      files.some(
        (f) =>
          f.size > 20 * 1024 * 1024 ||
          !/\.(jpe?g|png|webp|heic|heif)$/i.test(f.name),
      )
    )
      throw Error("지원 형식과 장당 20MB 제한을 확인하세요.");
    if (
      state.photos.length &&
      !confirm(
        "현재 사진을 새 사진으로 교체할까요? 먼저 필요한 백업을 저장하세요.",
      )
    )
      return;
    const photos = [];
    for (const f of files) {
      const src = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = reject;
        r.readAsDataURL(f);
      });
      const decoded = await loadImage(src);
      if (
        decoded.width * decoded.height > 48000000 ||
        Math.max(decoded.width, decoded.height) > 12000
      )
        throw Error("사진은 4800만 화소, 한 변 12000px 이하로 줄여 주세요.");
      const sourceWidth = decoded.width, sourceHeight = decoded.height;
      decoded.src = "";
      photos.push({
        id: crypto.randomUUID(),
        name: f.name,
        src,
        adjust: defaults(),
        sourceWidth,
        sourceHeight,
      });
    }
    state.photos = photos;
    images.clear();
    for (const photo of photos) await photoImage(photo);
    selected = 0;
    original = false;
    $("compare").setAttribute("aria-pressed", "false");
    thumbnails();
    await preview();
    invalidate();
    toast("사진을 불러왔습니다. 한 장씩 원본과 비교해 보정하세요.");
  } catch (err) {
    toast(err.message);
    if(typeof easyStatus === "function") easyStatus("사진을 불러오지 못했습니다: "+err.message,true);
  } finally {
    e.target.value = "";
  }
};
$("auto").onclick = async () => {
  if (!state.photos.length) return toast("먼저 사진을 불러오세요.");
  const p = state.photos[selected],
    img = await photoImage(p),
    c = document.createElement("canvas");
  c.width = 100;
  c.height = 100;
  const ctx = c.getContext("2d");
  ctx.drawImage(img, 0, 0, 100, 100);
  const a = ctx.getImageData(0, 0, 100, 100).data;
  let sum = 0,
    n = 0;
  for (let i = 0; i < a.length; i += 4) {
    const l = 0.2126 * a[i] + 0.7152 * a[i + 1] + 0.0722 * a[i + 2];
    if (l > 10 && l < 245) {
      sum += l;
      n++;
    }
  }
  p.adjust.exposure = n
    ? Math.max(-0.35, Math.min(0.35, Math.log2(132 / (sum / n))))
    : 0;
  preview();
  invalidate();
  toast("노출만 완만하게 조정했습니다. 원본과 비교해 주세요.");
};
$("compare").onclick = () => {
  original = !original;
  $("compare").setAttribute("aria-pressed", String(original));
  $("compare").textContent = original ? "보정본 보기" : "원본 비교";
  preview();
};
$("reset").onclick = () => {
  if (!state.photos.length) return;
  state.photos[selected].adjust = defaults();
  preview();
  invalidate();
};
$("export-photo").onclick = async () => {
  if (!state.photos.length) return toast("사진을 먼저 불러오세요.");
  const p = state.photos[selected],
    was = original;
  original = false;
  try {
    exportCanvas(
      transformed(await photoImage(p), p.adjust, 4096),
      `청인마루_보정_${selected + 1}.png`,
    );
  } finally {
    original = was;
  }
};
for (const key of ["title", "product", "memo", "mascot", "format"])
  $(key).oninput = () => {
    state[key] = $(key).value;
    invalidate();
  };
document.querySelectorAll("[data-tab]").forEach(
  (b) =>
    (b.onclick = () => {
      document
        .querySelectorAll(".panel")
        .forEach((p) => (p.hidden = p.id !== b.dataset.tab));
      document
        .querySelectorAll("[data-tab]")
        .forEach((n) => n.classList.toggle("active", n === b));
    }),
);
document.querySelectorAll("[data-theme]").forEach(
  (b) =>
    (b.onclick = () => {
      state.theme = b.dataset.theme;
      document
        .querySelectorAll("[data-theme]")
        .forEach((n) => n.classList.toggle("selected", n === b));
      persist();
      if (state.photos.length >= 4) generate();
    }),
);
function cover(ctx, img, x, y, w, h) {
  const s = Math.max(w / img.width, h / img.height);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(
    img,
    x + (w - img.width * s) / 2,
    y + (h - img.height * s) / 2,
    img.width * s,
    img.height * s,
  );
  ctx.restore();
}
function lines(ctx, text, x, y, maxWidth, lineHeight, maxLines = 3) {
  let line = "",
    row = 0;
  for (const ch of text) {
    if (ctx.measureText(line + ch).width > maxWidth) {
      ctx.fillText(line, x, y + row * lineHeight);
      row++;
      line = "";
      if (row >= maxLines) return;
    }
    line += ch;
  }
  if (line) ctx.fillText(line, x, y + row * lineHeight);
}
async function card(theme, slide) {
  const c = document.createElement("canvas");
  c.width = 1080;
  c.height = state.format === "story" ? 1920 : 1350;
  const ctx = c.getContext("2d"),
    w = c.width,
    h = c.height;
  const index =
    theme === "gallery"
      ? (slide + 1) % state.photos.length
      : theme === "journal"
        ? (state.photos.length - 1 - slide + state.photos.length) %
          state.photos.length
        : slide % state.photos.length;
  const p = state.photos[index],
    was = original;
  original = false;
  let img;
  try {
    img = transformed(await photoImage(p), p.adjust, 2400);
  } finally {
    original = was;
  }
  const title =
    slide === (state.slideCount || 5) - 1
      ? "당신의 공간에도, 좋은 결을."
      : slide === 0
        ? state.title || "공간의 결을 담다"
        : [
            "",
            "빛이 머무는 자리",
            "가까이에서 만나는 질감",
            "공간을 완성하는 디테일",
            "소재가 전하는 분위기",
          ][slide];
  ctx.fillStyle =
    theme === "gallery"
      ? "#202d28"
      : theme === "journal"
        ? "#e6e9df"
        : "#f6f3eb";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = theme === "gallery" ? "#fffdf4" : "#253c35";
  ctx.font = "18px sans-serif";
  ctx.fillText("CHEONGINMARU  /  SPACE ARCHIVE", 65, 65);
  ctx.fillText(
    String(slide + 1).padStart(2, "0") +
      " / " +
      String(state.slideCount || 5).padStart(2, "0"),
    920,
    65,
  );
  if (theme === "gallery") {
    cover(ctx, img, 0, 100, w, h - 100);
    const g = ctx.createLinearGradient(0, h * 0.55, 0, h);
    g.addColorStop(0, "transparent");
    g.addColorStop(1, "#15231de8");
    ctx.fillStyle = g;
    ctx.fillRect(0, h * 0.5, w, h * 0.5);
    ctx.fillStyle = "#fffdf4";
    ctx.font = "52px sans-serif";
    lines(ctx, title, 70, h - 235, 900, 75, 2);
    ctx.font = "23px sans-serif";
    ctx.fillText(state.product + "  ·  청인마루", 70, h - 65);
  } else if (theme === "journal") {
    ctx.font = '58px "Noto Serif CJK KR",serif';
    lines(ctx, title, 65, 180, 890, 80, 2);
    cover(ctx, img, 65, 350, 950, h - 650);
    ctx.fillStyle = "#253c35";
    ctx.font = "22px sans-serif";
    lines(
      ctx,
      state.memo || "소재의 본래 표정과 현장의 시공 디테일을 기록합니다.",
      65,
      h - 220,
      700,
      38,
      3,
    );
    ctx.fillText(state.product, 65, h - 60);
  } else {
    ctx.font = '60px "Noto Serif CJK KR",serif';
    lines(ctx, title, 65, 180, 950, 80, 2);
    cover(ctx, img, 65, 350, 950, h - 570);
    ctx.font = "23px sans-serif";
    ctx.fillText(state.product + "  /  시공 기록", 65, h - 140);
    ctx.font = '20px "Noto Serif CJK KR",serif';
    ctx.fillText("공간의 위로가 되다 · 청인마루", 65, h - 65);
  }
  if (
    slide === (state.slideCount || 5) - 1 &&
    state.mascot !== "none" &&
    assets[state.mascot]
  ) {
    const asset = assets[state.mascot],
      s = Math.min(130 / asset.width, 130 / asset.height);
    ctx.drawImage(asset, 890, h - 165, asset.width * s, asset.height * s);
  }
  return c;
}
let generating = false;
async function generate() {
  if (state.photos.length < 1) return toast("사진을 먼저 불러오세요.");
  if (generating) return;
  generating = true;
  $("generate").disabled = true;
  try {
    await document.fonts.ready;
    $("designs").replaceChildren();
    for (const [theme, name] of [
      ["editorial", "여백의 미학"],
      ["gallery", "공간 갤러리"],
      ["journal", "소재의 기록"],
    ]) {
      const col = document.createElement("article");
      col.className = theme === state.theme ? "chosen" : "";
      const h = document.createElement("h3");
      h.textContent = name;
      col.append(h);
      $("designs").append(col);
      for (let i = 0; i < (state.slideCount || 5); i++) {
        const slide = document.createElement("div");
        slide.className = "slide";
        const c = await card(theme, i),
          b = document.createElement("button");
        c.setAttribute("aria-label", `${name} ${i + 1}번 카드`);
        b.textContent = `${i + 1}번 PNG 저장 · ${c.width} × ${c.height}`;
        b.onclick = () => exportCanvas(c, `청인마루_${theme}_${i + 1}.png`);
        slide.append(c, b);
        col.append(slide);
      }
    }
    renderCopy();
    toast("3가지 시안과 콘텐츠 구성을 생성했습니다.");
  } catch (e) {
    toast("생성 실패: " + e.message);
  } finally {
    generating = false;
    $("generate").disabled = false;
  }
}
$("generate").onclick = generate;
function renderCopy() {
  const title = state.title || "청인마루 현장 기록",
    items = [
      [
        "설명글",
        `${title}\n\n${state.product} 시공 현장의 빛과 질감을 기록합니다.\n${state.memo}\n\n공간의 위로가 되다 · 청인마루.\n제품과 시공 상담은 청인마루로 문의해 주세요.`,
      ],
      [
        "해시태그",
        `#청인마루 #${state.product.replace(/\s/g, "")} #마루시공 #인테리어 #시공기록`,
      ],
      [
        "고정댓글",
        "제품 모델명과 시공 범위에 따라 안내가 달라질 수 있습니다. 상담 시 현장 사진과 원하는 소재를 함께 알려주세요.",
      ],
      [
        "릴스 구성안",
        "0–3초 · 현장 전체 컷 / 현장 이름\n3–7초 · 바닥 질감 근접 컷 / 제품군\n7–12초 · 시공 디테일 / 현장 메모 중 확인된 내용\n12–17초 · 공간 연결 컷 / 시공 방향\n17–20초 · 청인마루 / 상담 안내\n\n영상 파일 생성 기능은 제공하지 않습니다. 촬영과 편집을 위한 구성안입니다.",
      ],
    ];
  $("copy-content").replaceChildren();
  for (const [heading, text] of items) {
    const label = document.createElement("label");
    label.textContent = heading;
    const area = document.createElement("textarea");
    area.readOnly = true;
    area.value = text;
    label.append(area);
    $("copy-content").append(label);
  }
}
const products = {
  강마루:
    "표면과 코어 구성을 제품별로 확인하고, 난방·접착 시공 조건을 확인하세요.",
  합판마루: "합판 코어와 표면 소재, 제조사 권장 관리 방법을 확인하세요.",
  원목마루: "수종·도장·습도 조건에 따른 자연스러운 차이를 확인하세요.",
  대형마루: "폭과 길이, 바탕면 평활도 및 시공 조건을 함께 검토하세요.",
  SPC: "제품별 코어·조인트·난방 적합성과 바탕면 조건을 확인하세요.",
  미네랄마루: "제조사의 소재 구성과 시험성적서, 시공 지침을 확인하세요.",
  시그니월: "벽장재 모델과 규격, 접착·하부 시공 조건을 확인하세요.",
};
for (const [name, desc] of Object.entries(products)) {
  const a = document.createElement("article"),
    h = document.createElement("h3"),
    p = document.createElement("p");
  h.textContent = name;
  p.textContent = desc;
  a.append(h, p);
  $("product-cards").append(a);
}
function renderRecords() {
  const ordered = [...state.records].sort((a, b) =>
    a.date.localeCompare(b.date),
  );
  $("record-list").replaceChildren();
  for (const r of ordered) {
    const row = document.createElement("div");
    row.className = "record-row";
    const text = document.createElement("span");
    text.textContent = `${r.date} · ${r.note} / 팔로워 ${r.followers} · 상담 ${r.leads} · 계약 ${r.contracts}`;
    const b = document.createElement("button");
    b.textContent = "삭제";
    b.onclick = () => {
      if (!confirm("이 마케팅 기록을 삭제할까요?")) return;
      state.records = state.records.filter((x) => x.id !== r.id);
      persist();
      renderRecords();
    };
    row.append(text, b);
    $("record-list").append(row);
  }
  const total = ordered.reduce(
    (a, r) => ({
      leads: a.leads + r.leads,
      contracts: a.contracts + r.contracts,
    }),
    { leads: 0, contracts: 0 },
  );
  $("metrics").textContent = ordered.length
    ? `기록 ${ordered.length}건 · 팔로워 변화 ${ordered.at(-1).followers - ordered[0].followers}명 · 누적 상담 ${total.leads}건 · 계약 ${total.contracts}건`
    : "첫 게시 일정이나 상담 기록을 추가하세요.";
}
$("record-date").value = new Date().toLocaleDateString("sv-SE");
$("record-form").onsubmit = (e) => {
  e.preventDefault();
  const values = ["followers", "leads", "contracts"].map((k) =>
    Number($(k).value),
  );
  if (values.some((v) => !Number.isSafeInteger(v) || v < 0))
    return toast("건수와 팔로워 수는 0 이상의 정수로 입력하세요.");
  state.records.push({
    id: crypto.randomUUID(),
    date: $("record-date").value,
    note: $("record-note").value,
    followers: values[0],
    leads: values[1],
    contracts: values[2],
  });
  persist();
  renderRecords();
  toast("운영 기록을 저장했습니다.");
};
function backup() {
  download(
    new Blob([JSON.stringify(state)], { type: "application/json" }),
    `청인마루_마케팅_백업_${new Date().toISOString().slice(0, 10)}.json`,
  );
}
$("backup").onclick = backup;
function validate(s) {
  if (
    !s ||
    s.version !== 1 ||
    !Array.isArray(s.photos) ||
    s.photos.length > 10 ||
    !Array.isArray(s.records) ||
    s.records.length > 10000
  )
    throw Error("지원하는 백업 형식이 아닙니다.");
  for (const k of ["title", "product", "memo", "mascot", "theme", "format"])
    if (typeof s[k] !== "string") throw Error("필수 항목이 누락되었습니다.");
  if (
    !["editorial", "gallery", "journal"].includes(s.theme) ||
    !["carousel", "story", "naver", "naverCover", "kakao", "kakaoWide", "youtube", "youtubeCover", "reels", "shorts"].includes(s.format) ||
    !["none", "maruni", "ruru"].includes(s.mascot)
  )
    throw Error("설정값이 올바르지 않습니다.");
  for (const p of s.photos) {
    if (
      typeof p.id !== "string" ||
      typeof p.name !== "string" ||
      typeof p.src !== "string" ||
      !/^data:image\/(jpeg|png|webp);base64,/.test(p.src)
    )
      throw Error("사진 형식이 올바르지 않습니다.");
    for (const [key, , min, max] of controls)
      if (
        !Number.isFinite(p.adjust?.[key]) ||
        p.adjust[key] < min ||
        p.adjust[key] > max
      )
        throw Error("보정값이 올바르지 않습니다.");
  }
  for (const r of s.records)
    if (
      typeof r.id !== "string" ||
      typeof r.note !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(r.date) ||
      ["followers", "leads", "contracts"].some(
        (k) => !Number.isSafeInteger(r[k]) || r[k] < 0,
      )
    )
      throw Error("운영 기록이 올바르지 않습니다.");
  return s;
}
$("restore").onchange = async (e) => {
  try {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 300 * 1024 * 1024) throw Error("백업 파일이 너무 큽니다.");
    const next = validate(JSON.parse(await f.text()));
    await Promise.all(next.photos.map((p) => loadImage(p.src)));
    backup();
    if (
      !confirm(
        "현재 프로젝트 백업을 내려받았습니다. 선택한 백업으로 마케팅 프로젝트를 교체할까요?",
      )
    )
      return;
    state = next;
    selected = 0;
    original = false;
    images.clear();
    sync();
    persist();
    toast("사진·메모·운영 기록을 복원했습니다.");
  } catch (e) {
    toast("복원 실패: " + e.message);
  } finally {
    $("restore").value = "";
  }
};
function sync() {
  for (const k of ["title", "product", "memo", "mascot", "format"])
    $(k).value = state[k];
  document
    .querySelectorAll("[data-theme]")
    .forEach((b) =>
      b.classList.toggle("selected", b.dataset.theme === state.theme),
    );
  $("designs").replaceChildren();
  $("copy-content").replaceChildren();
  thumbnails();
  preview();
  renderRecords();
}
async function init() {
  try {
    db = await new Promise((resolve, reject) => {
      const r = indexedDB.open("cheonginmaru-marketing-v1", 1);
      r.onupgradeneeded = () => r.result.createObjectStore("projects");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const saved = await new Promise((resolve, reject) => {
      const r = db
        .transaction("projects")
        .objectStore("projects")
        .get("current");
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    if (saved) state = validate(saved);
    $("save-status").textContent = "이 기기 자동 저장";
    sync();
  } catch (e) {
    $("save-status").textContent = "저장소 오류 · 백업 필요";
    toast("저장된 자료를 읽지 못했습니다. 기존 자료는 덮어쓰지 않습니다.");
    document
      .querySelectorAll("input,textarea,select,#generate,#auto,#reset")
      .forEach((x) => (x.disabled = true));
  }
  await Promise.all(
    ["maruni", "ruru"].map(async (k) => {
      try {
        assets[k] = await loadImage(`../${k}.png`);
      } catch {
        toast(`${k} 자산을 불러오지 못했습니다.`);
      }
    }),
  );
}
init();
