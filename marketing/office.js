"use strict";
// Additive v1-compatible state: the existing DB and its original data stay intact.
let officeReady = false,
  maskReady = false,
  aiCandidate = null;
const officeDefaults = () => ({
  officeVersion: 2,
  projectId: crypto.randomUUID(),
  region: "",
  materialBrand: "동화",
  goal: "discovery",
  slideCount: 5,
  posts: [],
  insights: [],
  leads: [],
  questions: [],
  copyDrafts: {},
  settings: { kakao: "", instagram: "", website: "", aiUrl: "" },
  target: { baseline: 1500, month: localDate().slice(0, 7), monthly: 100 },
});
function localDate() {
  return new Date().toLocaleDateString("sv-SE");
}
function normalise(s) {
  const d = officeDefaults();
  for (const k of Object.keys(d)) if (s[k] === undefined) s[k] = d[k];
  return s;
}
function dbGet(key) {
  return new Promise((resolve, reject) => {
    const r = db.transaction("projects").objectStore("projects").get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
function dbPut(key, value) {
  return new Promise((resolve, reject) => {
    const t = db.transaction("projects", "readwrite");
    t.objectStore("projects").put(structuredClone(value), key);
    t.oncomplete = resolve;
    t.onerror = () => reject(t.error);
  });
}
function node(tag, text, cls) {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (cls) el.className = cls;
  return el;
}
function number(id) {
  const n = Number($(id).value);
  if (!Number.isSafeInteger(n) || n < 0)
    throw Error("수치는 0 이상의 정수로 입력하세요.");
  return n;
}
function safeUrl(value) {
  if (!value) return "";
  const u = new URL(value);
  if (
    u.protocol !== "https:" &&
    !(u.protocol === "http:" && ["localhost", "127.0.0.1"].includes(u.hostname))
  )
    throw Error("HTTPS 주소를 입력하세요.");
  if (u.username || u.password)
    throw Error("주소에 비밀번호를 넣을 수 없습니다.");
  return u.href.replace(/\/$/, "");
}
const originalValidate = validate;
validate = function (s) {
  originalValidate(s);
  if (
    s.copyDrafts !== undefined &&
    (!s.copyDrafts ||
      typeof s.copyDrafts !== "object" ||
      Array.isArray(s.copyDrafts) ||
      Object.values(s.copyDrafts).some(
        (v) => !v || typeof v.source !== "string" || typeof v.text !== "string",
      ))
  )
    throw Error("콘텐츠 초안 형식 오류");
  for (const p of s.photos) {
    if (
      p.originalSrc &&
      !/^data:image\/(jpeg|png|webp);base64,/.test(p.originalSrc)
    )
      throw Error("AI 원본 이미지 형식 오류");
    if (
      p.aiHistory &&
      (!Array.isArray(p.aiHistory) ||
        p.aiHistory.some(
          (v) => !/^data:image\/(jpeg|png|webp);base64,/.test(v.src),
        ))
    )
      throw Error("편집 이력 형식 오류");
  }
  if (s.officeVersion !== undefined && s.officeVersion !== 2)
    throw Error("지원하지 않는 오피스 버전입니다.");
  if (s.officeVersion === 2) {
    for (const k of ["posts", "insights", "leads", "questions"])
      if (!Array.isArray(s[k]) || s[k].length > 10000)
        throw Error("운영 데이터 형식이 올바르지 않습니다.");
    if (
      !s.settings ||
      !s.target ||
      !Number.isInteger(s.slideCount) ||
      s.slideCount < 3 ||
      s.slideCount > 6
    )
      throw Error("설정값을 확인하세요.");
    for (const v of Object.values(s.settings))
      if (typeof v !== "string") throw Error("연결 주소 형식 오류");
    for (const k of ["kakao", "instagram", "website", "aiUrl"])
      safeUrl(s.settings[k]);
    for (const p of s.posts)
      if (
        typeof p.id !== "string" ||
        typeof p.title !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(p.date) ||
        typeof p.channel !== "string" ||
        typeof p.status !== "string"
      )
        throw Error("게시 일정 형식 오류");
    for (const q of s.questions)
      if (typeof q.text !== "string") throw Error("질문 소재함 형식 오류");
    for (const k of ["projectId", "region", "materialBrand", "goal"])
      if (typeof s[k] !== "string") throw Error("현장 정보 형식 오류");
    for (const i of s.insights)
      if (
        typeof i.postId !== "string" ||
        ["followers", "reach", "views", "saves", "shares", "visits"].some(
          (k) => !Number.isSafeInteger(i[k]) || i[k] < 0,
        )
      )
        throw Error("성과 데이터 형식 오류");
    for (const l of s.leads)
      if (
        typeof l.id !== "string" ||
        typeof l.alias !== "string" ||
        typeof l.source !== "string" ||
        typeof l.date !== "string" ||
        typeof l.postId !== "string" ||
        !["상담", "실측", "견적", "계약"].includes(l.stage)
      )
        throw Error("상담 데이터 형식 오류");
    if (
      !Number.isSafeInteger(s.target.baseline) ||
      s.target.baseline < 0 ||
      !Number.isSafeInteger(s.target.monthly) ||
      s.target.monthly < 1 ||
      !/^\d{4}-\d{2}$/.test(s.target.month)
    )
      throw Error("목표 설정 형식 오류");
  }
  return s;
};
const oldSync = sync;
sync = function () {
  oldSync();
  if (officeReady) {
    normalise(state);
    syncOffice();
  } else startOffice();
};
async function startOffice() {
  if (officeReady || !db) return;
  try {
    const current = await dbGet("current");
    if (current) validate(current);
    if (current && !current.officeVersion) {
      const snapshot = structuredClone(current);
      const next = normalise(structuredClone(current));
      await new Promise((resolve, reject) => {
        const t = db.transaction("projects", "readwrite"),
          store = t.objectStore("projects");
        store.put(snapshot, "pre-office-v2");
        store.put(next, "current");
        t.oncomplete = resolve;
        t.onerror = () => reject(t.error);
      });
      state = next;
      toast(
        "기존 자료를 DB에 백업한 뒤 업그레이드했습니다. 보관함에서 내려받을 수 있습니다.",
      );
    } else normalise(state);
    officeReady = true;
    syncOffice();
    await renderProjects();
  } catch (e) {
    toast("업그레이드 실패: 기존 자료를 보존했습니다. " + e.message);
    $("generate").disabled = true;
  }
}
function syncOffice() {
  for (const [id, k] of [
    ["region", "region"],
    ["material-brand", "materialBrand"],
    ["goal", "goal"],
    ["slide-count", "slideCount"],
  ])
    $(id).value = state[k];
  $("baseline").value = state.target.baseline;
  $("target-month").value = state.target.month;
  $("monthly-target").value = state.target.monthly;
  for (const [id, key] of [
    ["kakao-url", "kakao"],
    ["instagram-url", "instagram"],
    ["website-url", "website"],
    ["ai-url", "aiUrl"],
  ])
    $(id).value = state.settings[key] || "";
  renderOperations();
  renderAnalysis();
  renderContact();
  resetMask();
}
for (const [id, k] of [
  ["region", "region"],
  ["material-brand", "materialBrand"],
  ["goal", "goal"],
  ["slide-count", "slideCount"],
])
  $(id).oninput = () => {
    state[k] = id === "slide-count" ? Number($(id).value) : $(id).value;
    invalidate();
  };
// Automatic recommendations are deterministic local image analysis, not a cloud AI claim.
async function analysePhoto(p) {
  const im = await photoImage(p),
    c = document.createElement("canvas");
  c.width = 160;
  c.height = Math.max(80, Math.round((160 * im.height) / im.width));
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(im, 0, 0, c.width, c.height);
  const { data: a } = ctx.getImageData(0, 0, c.width, c.height),
    w = c.width,
    h = c.height,
    gray = new Float32Array(w * h);
  let sum = 0,
    clipped = 0,
    n = 0,
    nr = 0,
    nb = 0,
    neutral = 0,
    edge = 0;
  const regions = Array(9).fill(0),
    angles = Array(17).fill(0);
  for (let i = 0; i < gray.length; i++) {
    const r = a[i * 4],
      g = a[i * 4 + 1],
      b = a[i * 4 + 2],
      v = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    gray[i] = v;
    sum += v;
    n++;
    if (v < 8 || v > 247) clipped++;
    if (v > 65 && v < 225 && Math.max(r, g, b) - Math.min(r, g, b) < 20) {
      nr += r;
      nb += b;
      neutral++;
    }
  }
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x,
        gx = gray[i + 1] - gray[i - 1],
        gy = gray[i + w] - gray[i - w],
        energy = Math.hypot(gx, gy);
      edge += energy;
      regions[
        Math.min(2, Math.floor((y / h) * 3)) * 3 +
          Math.min(2, Math.floor((x / w) * 3))
      ] += energy;
      if (energy > 50) {
        let deg = (Math.atan2(gy, gx) * 180) / Math.PI;
        while (deg > 45) deg -= 90;
        while (deg < -45) deg += 90;
        if (Math.abs(deg) <= 4) angles[Math.round(deg * 2) + 8] += energy;
      }
    }
  const best = angles.indexOf(Math.max(...angles)),
    confidence = angles[best] / (angles.reduce((a, b) => a + b, 0) || 1),
    rotation =
      confidence > 0.22 ? Math.max(-2, Math.min(2, -(best - 8) / 2)) : 0;
  const hash = [];
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 8; x++) {
      const yy = Math.floor(((y + 0.5) * h) / 8),
        xx = Math.floor((x * w) / 9);
      hash.push(
        gray[yy * w + xx] >
          gray[yy * w + Math.min(w - 1, xx + Math.floor(w / 9))]
          ? 1
          : 0,
      );
    }
  const focalIndex = regions.indexOf(Math.max(...regions));
  p.analysis = {
    mean: sum / n,
    clipping: clipped / n,
    sharpness: edge / ((w - 2) * (h - 2)),
    resolution: (p.sourceWidth || im.width) * (p.sourceHeight || im.height),
    hash: hash.join(""),
    neutralFraction: neutral / n,
    recommended: {
      exposure: Math.max(
        -0.35,
        Math.min(0.35, Math.log2(135 / (sum / n || 1))),
      ),
      warmth:
        neutral > n * 0.08
          ? Math.max(-7, Math.min(7, (nb - nr) / neutral / 2))
          : 0,
      rotation,
    },
    focus: {
      x: ((focalIndex % 3) + 0.5) / 3,
      y: (Math.floor(focalIndex / 3) + 0.5) / 3,
    },
    score: Math.round(
      Math.max(
        0,
        Math.min(
          100,
          70 +
            Math.min(20, edge / n) -
            (clipped / n) * 70 -
            (im.width < 1080 ? 15 : 0),
        ),
      ),
    ),
  };
  return p.analysis;
}
function duplicates() {
  for (const p of state.photos) {
    if (!p.analysis) continue;
    p.analysis.duplicateOf = null;
    for (const q of state.photos) {
      if (q === p) break;
      if (!q.analysis) continue;
      const distance = [...p.analysis.hash].reduce(
        (n, v, i) => n + (v !== q.analysis.hash[i]),
        0,
      );
      if (distance < 6) {
        p.analysis.duplicateOf = q.id;
        break;
      }
    }
  }
}
function photoOrder() {
  return [...state.photos].sort(
    (a, b) =>
      !!a.analysis?.duplicateOf - !!b.analysis?.duplicateOf ||
      (b.analysis?.score || 0) - (a.analysis?.score || 0),
  );
}
function renderAnalysis() {
  const p = state.photos[selected],
    host = $("photo-analysis");
  host.replaceChildren();
  if (!p) return;
  const a = p.analysis;
  if (!a) {
    host.append(
      node(
        "p",
        "사진을 분석하면 노출·중복·구도 추천을 확인할 수 있습니다.",
        "hint",
      ),
    );
    return;
  }
  const issues = [];
  if (a.clipping > 0.08) issues.push("명암 손실 주의");
  if (a.sharpness < 6) issues.push("흐림 가능성");
  if (a.resolution < 1080 * 1080) issues.push("출력 해상도 주의");
  if (a.duplicateOf) issues.push("유사 사진 있음");
  host.append(
    node(
      "p",
      `품질 참고 ${a.score}/100 · ${issues.join(" · ") || "구도와 소재 색을 직접 확인하세요."}`,
    ),
  );
  host.append(
    node(
      "p",
      `추천 노출 ${a.recommended.exposure.toFixed(2)}EV / 색온도 ${a.recommended.warmth.toFixed(1)} / 수평 ${a.recommended.rotation.toFixed(1)}° · ${p.autoPrepared ? "자동 보정 적용" : p.approved ? "보정 확정" : "수동 편집 중"}`,
      "hint",
    ),
  );
  host.append(
    node(
      "p",
      "중복·수평은 로컬 픽셀 분석에 따른 참고값입니다. 자동 원근 교정은 추정하지 않으며 수동 원근을 사용하세요.",
      "hint",
    ),
  );
  const ranked = photoOrder();
  host.append(
    node(
      "p",
      `추천 대표: ${ranked[0]?.name || ""} · 추천 순서: ${ranked.map((x) => state.photos.indexOf(x) + 1).join(" → ")}`,
      "hint",
    ),
  );
}
const oldPreview = preview;
preview = async function () {
  await oldPreview();
  renderAnalysis();
  resetMask();
};
const oldTransform = transformed;
transformed = function (img, p, max) {
  const c = oldTransform(img, p, max);
  const ph = state.photos.find((x) => x.adjust === p);
  c.focus = ph?.focus || { x: 0.5, y: 0.5 };
  return c;
};
cover = function (ctx, img, x, y, w, h) {
  const s = Math.max(w / img.width, h / img.height),
    f = img.focus || { x: 0.5, y: 0.5 },
    dx = Math.min(0, Math.max(w - img.width * s, w / 2 - img.width * s * f.x)),
    dy = Math.min(
      0,
      Math.max(h - img.height * s, h / 2 - img.height * s * f.y),
    );
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, x + dx, y + dy, img.width * s, img.height * s);
  ctx.restore();
};
$("analyze-all").onclick = async () => {
  if (!state.photos.length) return toast("사진을 먼저 등록하세요.");
  $("analyze-all").disabled = true;
  try {
    for (const p of state.photos) await analysePhoto(p);
    duplicates();
    renderAnalysis();
    persist();
    toast("분석 완료. 보정 추천을 적용한 뒤 원본과 비교하세요.");
  } catch (e) {
    toast(e.message);
  } finally {
    $("analyze-all").disabled = false;
  }
};
function applySuggestion(p) {
  if (!p.analysis) return;
  p.adjust = { ...p.adjust, ...p.analysis.recommended };
  p.focus = p.analysis.focus;
  p.approved = false;
}
$("apply-recommendation").onclick = () => {
  const p = state.photos[selected];
  if (!p?.analysis) return toast("먼저 전체 사진을 분석하세요.");
  applySuggestion(p);
  original = false;
  preview();
  invalidate();
};
$("auto").textContent = "사진 분석·노출/WB 추천";
$("auto").onclick = async () => {
  const p = state.photos[selected];
  if (!p) return toast("사진을 등록하세요.");
  await analysePhoto(p);
  duplicates();
  renderAnalysis();
  persist();
  toast("추천을 만들었습니다. 추천 적용 후 원본과 비교해 주세요.");
};
$("approve-photo").onclick = () => {
  const p = state.photos[selected];
  if (!p) return;
  p.approved = true;
  persist();
  renderAnalysis();
  toast("보정을 확정했습니다. 원본은 유지됩니다.");
};
const oldInvalidate = invalidate;
invalidate = function () {
  if (state.photos[selected]) state.photos[selected].approved = false;
  oldInvalidate();
};
const oldPhotoChange = $("photos").onchange;
$("photos").onchange = async (e) => {
  await oldPhotoChange(e);
  if (state.photos.length) await $("analyze-all").onclick();
};
$("quick-prepare").onclick = async () => {
  if (!state.photos.length) return toast("사진을 등록하세요.");
  await $("analyze-all").onclick();
  state.photos.forEach(applySuggestion);
  selected = state.photos.indexOf(photoOrder()[0]);
  original = false;
  await preview();
  persist();
  toast(
    "전체 보정 추천을 적용했습니다. 각 사진을 비교·확정한 뒤 디자인을 생성하세요.",
  );
};
const oldGenerate = generate;
generate = async function () {
  if (state.photos.some((p) => !p.approved))
    return toast("각 사진의 원본과 보정본을 확인하고 보정 확정을 눌러 주세요.");
  await oldGenerate();
};
$("generate").onclick = () => generate();
// Channel-specific copy uses only entered facts; no invented testimonials or claims.
function titles() {
  const place = state.region || "우리 집";
  return [
    `${place}, 바닥이 바꾸는 공간의 인상`,
    `${state.product} 선택 전 확인할 시공 디테일 3가지`,
    `${state.title || "오늘의 현장"}: 가까이서 보는 소재의 결`,
  ];
}
function cta() {
  const s = state.settings;
  return s.kakao
    ? `상담: ${s.kakao}`
    : s.website
      ? `상담: ${s.website}`
      : s.instagram
        ? `시공 상담 DM: ${s.instagram}`
        : "시공 지역·현장 사진·원하는 소재를 준비해 청인마루로 문의해 주세요.";
}
renderCopy = function () {
  const h = titles(),
    facts = `현장: ${state.title || "현장명 입력 필요"}\n지역: ${state.region || "미입력"}\n제품: ${state.materialBrand} / ${state.product}\n현장 메모: ${state.memo || "추가 메모 없음"}`,
    purpose = {
      discovery:
        "저장해 두고 소재를 비교해 보세요. 다음 시공 기록도 함께 보실 수 있습니다.",
      trust: "사진에서 보이는 접합부·공간 연결·시공 방향을 함께 확인해 보세요.",
      consultation:
        "상담 시 현장 사진과 원하는 자재를 함께 알려주시면 확인에 도움이 됩니다.",
    }[state.goal];
  const entries = [
    ["소비자 관심 제목 3종", h.join("\n")],
    ["Instagram 설명글", `${h[0]}\n\n${facts}\n\n${purpose}\n${cta()}`],
    [
      "해시태그",
      `#청인마루 #${state.product} #마루시공 #시공기록${state.region ? " #" + state.region.replace(/\s/g, "") + "인테리어" : ""}`,
    ],
    [
      "고정댓글",
      `${cta()}\n현장별 바탕면과 시공 범위가 달라 사진과 도면을 함께 확인합니다.`,
    ],
    [
      "릴스 시작 문장·자막",
      `${h[1]}\n0–3초: ${state.title || "오늘의 현장"}\n3–6초: ${state.product}, 공간 전체의 인상\n6–9초: 가까이에서 만나는 소재의 질감\n9–12초: 현장의 시공 디테일\n12–15초: ${purpose}\n\n음악 검색 키워드: minimal piano / warm acoustic / ambient interior\n사용 전 플랫폼의 상업적 음악 이용 조건을 확인하세요.`,
    ],
    [
      "네이버 블로그 검색형 초안",
      `${state.region || "지역"} ${state.product} 시공 기록 | ${state.title || "청인마루 현장"}\n\n1. 현장과 자재\n${facts}\n\n2. 사진으로 살펴보는 디테일\n전체 공간, 소재 근접, 연결부 순서로 사진을 배치하고 실제 확인한 내용을 덧붙여 주세요.\n\n3. 시공 상담 전 준비할 내용\n현장 지역, 면적, 기존 바닥 상태, 희망 일정과 자재를 정리하면 상담에 도움이 됩니다.\n\n${cta()}\n\n※ 제품 성능·가격·기간은 제조사 자료와 현장 확인 후 작성하세요.`,
    ],
    [
      "YouTube Shorts 제목·설명",
      `${h[2]} #Shorts\n\n${state.region || ""} 현장 ${state.product} 시공 기록.\n${state.memo}\n${cta()}`,
    ],
    [
      "카카오채널 소개 문구",
      `${state.title || "새로운 현장 기록"}을 소개합니다.\n${state.product}의 공간감과 소재 디테일을 사진으로 확인해 보세요.\n${cta()}`,
    ],
  ];
  $("copy-content").replaceChildren();
  for (const [heading, text] of entries) {
    const l = node("label", heading),
      t = node("textarea");
    const savedDraft = state.copyDrafts?.[heading];
    t.value = savedDraft?.source === text ? savedDraft.text : text;
    t.readOnly = false;
    t.oninput = () => {
      state.copyDrafts ||= {};
      state.copyDrafts[heading] = { source: text, text: t.value };
      persist();
    };
    const b = node("button", "문구 복사");
    b.onclick = async () => {
      try {
        await navigator.clipboard.writeText(t.value);
        toast("복사했습니다.");
      } catch {
        t.select();
        toast("선택된 문구를 복사해 주세요.");
      }
    };
    l.append(t, b);
    $("copy-content").append(l);
  }
};
$("make-copy").onclick = () => {
  renderCopy();
  toast("입력한 사실을 채널별 템플릿으로 구성했습니다.");
};
$("reel-cover").onclick = async () => {
  if (state.photos.length < 1) return toast("사진을 등록하세요.");
  const format = state.format;
  state.format = "story";
  try {
    exportCanvas(await card(state.theme, 0), "청인마루_릴스표지.png");
  } finally {
    state.format = format;
  }
};
$("export-stories").onclick = async () => {
  state.format = "story";
  $("format").value = "story";
  await generate();
  document.querySelector('[data-tab="studio"]').click();
};
let videoBusy = false;
$("export-reel").onclick = async () => {
  if (videoBusy) return;
  if (state.photos.length < 1 || state.photos.some((p) => !p.approved))
    return toast("사진을 등록하면 자동으로 보정 후 출력합니다.");
  const mime = ["video/mp4;codecs=avc1.42001E", "video/mp4"].find(
    (x) => window.MediaRecorder && MediaRecorder.isTypeSupported(x),
  );
  if (!mime)
    return toast(
      "이 브라우저는 MP4 녹화를 지원하지 않습니다. 최신 Chrome 또는 Safari에서 시도하세요.",
    );
  videoBusy = true;
  $("export-reel").disabled = true;
  $("video-progress").hidden = false;
  const format = state.format,
    theme = state.theme;
  let stream, rec;
  try {
    state.format = "story";
    const frames = [];
    for (let i = 0; i < 5; i++)
      frames.push(await card(theme, i % state.slideCount));
    state.format = format;
    const c = node("canvas");
    c.width = 1080;
    c.height = 1920;
    const ctx = c.getContext("2d");
    ctx.drawImage(frames[0], 0, 0);
    stream = c.captureStream(30);
    rec = new MediaRecorder(stream, {
      mimeType: mime,
      videoBitsPerSecond: 8000000,
    });
    const chunks = [];
    const done = new Promise((resolve, reject) => {
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      rec.onstop = () => resolve(new Blob(chunks, { type: "video/mp4" }));
      rec.onerror = () => reject(Error("영상 녹화 실패"));
    });
    rec.start(300);
    const started = performance.now(),
      duration = 15000;
    await new Promise((resolve, reject) => {
      const tick = () => {
        if (document.hidden) {
          reject(Error("출력 중에는 이 탭을 열어 두세요."));
          return;
        }
        const elapsed = performance.now() - started,
          idx = Math.min(4, Math.floor(elapsed / 3000)),
          progress = (elapsed % 3000) / 3000;
        ctx.fillStyle = "#eee";
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.save();
        const zoom = 1 + progress * 0.025;
        ctx.translate(540, 960);
        ctx.scale(zoom, zoom);
        ctx.drawImage(frames[idx], -540, -960);
        ctx.restore();
        $("video-progress").value = Math.min(100, (elapsed / duration) * 100);
        $("video-status").textContent =
          `MP4 영상 만드는 중 · ${Math.min(100, Math.round((elapsed / duration) * 100))}%`;
        if (elapsed >= duration) resolve();
        else requestAnimationFrame(tick);
      };
      tick();
    });
    rec.stop();
    const blob = await done;
    if (blob.size < 1000) throw Error("영상 데이터가 부족합니다.");
    download(blob, "청인마루_릴스_1080x1920.mp4");
    $("video-status").textContent =
      "15초 · 1080×1920 MP4 저장 완료 (음악 없음)";
  } catch (e) {
    if (rec && rec.state !== "inactive") rec.stop();
    toast("영상 출력 실패: " + e.message);
    $("video-status").textContent = "영상 저장 실패";
  } finally {
    state.format = format;
    stream?.getTracks().forEach((t) => t.stop());
    videoBusy = false;
    $("export-reel").disabled = false;
  }
};
// Operations and analytics: metrics are entered per post and upserted, never summed twice.
let monthOffset = 0;
function postSelect(id, includeUnknown = false) {
  const sel = $(id),
    value = sel.value;
  sel.replaceChildren();
  if (includeUnknown) sel.add(new Option("미확인 / 직접 유입", ""));
  for (const p of state.posts) sel.add(new Option(p.title, p.id));
  if ([...sel.options].some((o) => o.value === value)) sel.value = value;
}
function renderCalendar() {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() + monthOffset);
  const month = date.toLocaleDateString("sv-SE").slice(0, 7);
  $("calendar-month").textContent = month;
  $("calendar").replaceChildren();
  for (const d of ["일", "월", "화", "수", "목", "금", "토"])
    $("calendar").append(node("div", d, "weekday"));
  for (let i = 0; i < date.getDay(); i++)
    $("calendar").append(node("div", "", "blank"));
  const days = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  for (let n = 1; n <= days; n++) {
    const key = `${month}-${String(n).padStart(2, "0")}`,
      cell = node("div", String(n), "calendar-day");
    for (const p of state.posts.filter((x) => x.date === key)) {
      const b = node("button", p.title);
      b.title = p.status;
      b.onclick = () => {
        for (const [id, k] of [
          ["post-title", "title"],
          ["post-date", "date"],
          ["post-channel", "channel"],
          ["post-status", "status"],
        ])
          $(id).value = p[k];
        $("schedule-form").dataset.edit = p.id;
      };
      cell.append(b);
    }
    $("calendar").append(cell);
  }
}
$("prev-month").onclick = () => {
  monthOffset--;
  renderCalendar();
};
$("next-month").onclick = () => {
  monthOffset++;
  renderCalendar();
};
function renderOperations() {
  renderCalendar();
  $("post-list").replaceChildren();
  for (const p of [...state.posts].sort((a, b) =>
    a.date.localeCompare(b.date),
  )) {
    const row = node("div", undefined, "record-row");
    row.append(node("span", `${p.date} · ${p.channel} · ${p.title}`));
    const sel = node("select");
    for (const status of ["아이디어", "제작 중", "게시 준비", "게시 완료"])
      sel.add(new Option(status, status));
    sel.value = p.status;
    sel.onchange = () => {
      p.status = sel.value;
      persist();
      renderCalendar();
    };
    row.append(sel);
    $("post-list").append(row);
  }
  postSelect("insight-post");
  postSelect("lead-post", true);
  renderGrowth();
  renderPipeline();
}
$("post-date").value = localDate();
$("schedule-form").onsubmit = (e) => {
  e.preventDefault();
  const form = $("schedule-form"),
    record = {
      ...state.posts.find((p) => p.id === form.dataset.edit),
      id: form.dataset.edit || crypto.randomUUID(),
      title: $("post-title").value,
      date: $("post-date").value,
      channel: $("post-channel").value,
      status: $("post-status").value,
      projectId: state.projectId,
      goal: state.goal,
    };
  const i = state.posts.findIndex((p) => p.id === record.id);
  if (i < 0) state.posts.push(record);
  else state.posts[i] = record;
  delete form.dataset.edit;
  persist();
  renderOperations();
  toast("게시 일정을 저장했습니다.");
};
$("save-post").onclick = () => {
  $("post-title").value = state.title || titles()[0];
  $("post-date").value = localDate();
  $("post-status").value = "게시 준비";
  document.querySelector('[data-tab="records"]').click();
  toast("게시 예정일을 확인하고 저장하세요.");
};
function metric(host, label, value) {
  const el = node("article");
  el.append(node("small", label), node("strong", String(value)));
  host.append(el);
}
function renderGrowth() {
  const month = state.target.month,
    posts = state.posts.filter((p) => p.date.startsWith(month)),
    ids = new Set(posts.map((p) => p.id)),
    ins = state.insights.filter((i) => ids.has(i.postId)),
    gained = ins.reduce((n, i) => n + i.followers, 0),
    leads = state.leads.filter((l) => (l.date || "").startsWith(month)),
    host = $("growth-metrics");
  host.replaceChildren();
  metric(host, "콘텐츠 귀속 신규 팔로워", gained);
  metric(
    host,
    "월 목표 달성",
    Math.round((gained / state.target.monthly) * 100) + "%",
  );
  metric(host, "기록한 상담", leads.length);
  metric(
    host,
    "현재 계약 단계",
    leads.filter((l) => l.stage === "계약").length,
  );
  const chart = $("growth-chart");
  chart.replaceChildren();
  const label = node(
      "p",
      `${month} 목표 ${state.target.monthly}명 / 콘텐츠 귀속 증가 ${gained}명 · 계정 순증가와 다를 수 있습니다.`,
    ),
    progress = node("progress");
  progress.max = state.target.monthly;
  progress.value = gained;
  chart.append(label, progress);
  $("insight-list").replaceChildren();
  const ranking = state.insights
    .map((i) => {
      const p = state.posts.find((p) => p.id === i.postId),
        ls = state.leads.filter((l) => l.postId === i.postId);
      return {
        i,
        p,
        leads: ls.length,
        contracts: ls.filter((l) => l.stage === "계약").length,
        score:
          i.followers +
          ls.length * 3 +
          ls.filter((l) => l.stage === "계약").length * 10,
      };
    })
    .sort((a, b) => b.score - a.score);
  for (const { i, p, leads, contracts } of ranking) {
    const row = node("div", undefined, "record-row");
    row.append(
      node(
        "span",
        `${p?.title || "게시물 미확인"} · 신규 ${i.followers} · 도달 ${i.reach} · 저장 ${i.saves} · 공유 ${i.shares} · 방문 ${i.visits} · 상담 ${leads} · 계약 ${contracts}`,
      ),
    );
    const edit = node("button", "수정");
    edit.onclick = () => {
      $("insight-post").value = i.postId;
      for (const [id, k] of [
        ["new-followers", "followers"],
        ["reach", "reach"],
        ["views", "views"],
        ["saves", "saves"],
        ["shares", "shares"],
        ["visits", "visits"],
      ])
        $(id).value = i[k];
      $("content-type").value = i.type || "시공 사례";
    };
    row.append(edit);
    $("insight-list").append(row);
  }
  const recommendations = $("recommendations");
  recommendations.replaceChildren();
  if (!ranking.length)
    recommendations.append(
      node(
        "p",
        `${state.region || "주 시공 지역"}의 ${state.product} 선택 질문을 15초 릴스로 소개하고, 신규 팔로워와 상담 유입을 기록하세요. 데이터가 쌓이기 전에는 성과를 예측하지 않습니다.`,
      ),
    );
  else {
    const top = ranking[0];
    recommendations.append(
      node(
        "p",
        `다음 기획: ${top.i.type || "시공 사례"}를 ${state.region || "주 시공 지역"} 현장으로 확장해 보세요. 가장 높은 참고 점수의 게시물은 “${top.p?.title || "미확인"}”입니다. 점수 = 신규 팔로워 + 상담×3 + 계약×10.`,
      ),
    );
    for (const { i, p, leads } of ranking.slice(0, 5)) {
      const rate = i.reach ? (i.followers / i.reach) * 100 : 0;
      recommendations.append(
        node(
          "p",
          `${p?.title || ""}: 도달 대비 팔로워 ${rate.toFixed(2)}%. ${i.visits > 0 && leads === 0 ? "프로필 방문이 있으나 상담 기록이 없습니다. 상담 링크와 준비 사항 안내를 점검하세요." : i.saves > i.followers ? "저장 반응을 후속 소재 비교 콘텐츠로 이어가세요." : "시작 문장과 첫 3초의 공간 컷을 바꿔 비교하세요."}`,
        ),
      );
    }
  }
  $("question-list").replaceChildren();
  for (const q of state.questions) {
    const item = node(
      "p",
      q.text + " → 추천 기획: 실제 현장 사진과 함께 질문에 답하는 짧은 설명",
    );
    $("question-list").append(item);
  }
}
$("target-form").onsubmit = (e) => {
  e.preventDefault();
  try {
    const monthly = number("monthly-target");
    if (monthly < 1) throw Error("목표는 1명 이상 입력하세요.");
    state.target = {
      baseline: number("baseline"),
      month: $("target-month").value,
      monthly,
    };
    persist();
    renderGrowth();
  } catch (e) {
    toast(e.message);
  }
};
$("insight-form").onsubmit = (e) => {
  e.preventDefault();
  if (!$("insight-post").value) return toast("먼저 게시 일정을 등록하세요.");
  try {
    const i = {
      postId: $("insight-post").value,
      type: $("content-type").value,
      updated: localDate(),
    };
    for (const [id, k] of [
      ["new-followers", "followers"],
      ["reach", "reach"],
      ["views", "views"],
      ["saves", "saves"],
      ["shares", "shares"],
      ["visits", "visits"],
    ])
      i[k] = number(id);
    state.insights = state.insights.filter((x) => x.postId !== i.postId);
    state.insights.push(i);
    persist();
    renderGrowth();
  } catch (e) {
    toast(e.message);
  }
};
$("question-form").onsubmit = (e) => {
  e.preventDefault();
  state.questions.push({
    id: crypto.randomUUID(),
    text: $("customer-question").value,
    date: localDate(),
  });
  $("customer-question").value = "";
  persist();
  renderGrowth();
};
function renderPipeline() {
  const host = $("funnel");
  host.replaceChildren();
  for (const stage of ["상담", "실측", "견적", "계약"])
    metric(
      host,
      stage + " 단계",
      state.leads.filter((l) => l.stage === stage).length,
    );
  $("lead-list").replaceChildren();
  for (const l of state.leads) {
    const row = node("div", undefined, "record-row");
    row.append(
      node(
        "span",
        `${l.alias} · ${l.source} · ${l.date} · 참조 ${l.quoteRef || "없음"}`,
      ),
    );
    const sel = node("select");
    for (const stage of ["상담", "실측", "견적", "계약"])
      sel.add(new Option(stage, stage));
    sel.value = l.stage;
    sel.onchange = () => {
      l.stage = sel.value;
      l.history = l.history || [];
      l.history.push({ stage: l.stage, date: localDate() });
      persist();
      renderPipeline();
      renderGrowth();
    };
    row.append(sel);
    $("lead-list").append(row);
  }
  $("attribution").replaceChildren();
  for (const p of state.posts) {
    const ls = state.leads.filter((l) => l.postId === p.id);
    $("attribution").append(
      node(
        "p",
        `${p.title}: 상담 유입 ${ls.length}건 / 현재 계약 ${ls.filter((l) => l.stage === "계약").length}건`,
      ),
    );
  }
}
$("lead-form").onsubmit = (e) => {
  e.preventDefault();
  const stage = $("lead-stage").value;
  state.leads.push({
    id: crypto.randomUUID(),
    alias: $("lead-alias").value,
    postId: $("lead-post").value,
    source: $("lead-source").value,
    stage,
    quoteRef: $("quote-ref").value,
    date: localDate(),
    history: [{ stage, date: localDate() }],
  });
  persist();
  renderPipeline();
  renderGrowth();
  toast("상담을 저장했습니다. 개인정보는 입력하지 마세요.");
};
$("export-crm").onclick = () =>
  download(
    new Blob(
      [
        JSON.stringify({
          schema: "cheonginmaru.lead-export.v1",
          exportedAt: new Date().toISOString(),
          leads: state.leads,
          posts: state.posts,
        }),
      ],
      { type: "application/json" },
    ),
    "청인마루_상담연동.json",
  );
// Project archive holds complete snapshots; migration backup is never overwritten.
async function renderProjects() {
  const keys = await new Promise((resolve, reject) => {
    const r = db.transaction("projects").objectStore("projects").getAllKeys();
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
  $("project-list").replaceChildren();
  for (const key of keys.filter((k) => String(k).startsWith("project:"))) {
    const s = await dbGet(key),
      row = node("div", undefined, "record-row");
    row.append(
      node("span", `${s.title || "이름 없는 현장"} · ${s.photos.length}장`),
    );
    const b = node("button", "불러오기");
    b.onclick = async () => {
      if (!confirm("현재 현장을 보관한 뒤 선택한 현장을 불러올까요?")) return;
      await dbPut("project:" + state.projectId, state);
      const active = {
        posts: state.posts,
        insights: state.insights,
        leads: state.leads,
        questions: state.questions,
        records: state.records,
        settings: state.settings,
        target: state.target,
        providedCatalogueVersion: state.providedCatalogueVersion,
        catalog: state.catalog,
        contentHistory: state.contentHistory,
      };
      state = { ...normalise(validate(await dbGet(key))), ...active };
      selected = 0;
      images.clear();
      sync();
      persist();
    };
    row.append(b);
    $("project-list").append(row);
  }
}
$("archive-project").onclick = async () => {
  try {
    await dbPut("project:" + state.projectId, state);
    await renderProjects();
    toast("현재 현장을 보관했습니다.");
  } catch (e) {
    toast("현장 보관 실패: " + e.message);
  }
};
$("new-project").onclick = async () => {
  if (!confirm("현재 현장을 보관하고 새 현장을 시작할까요?")) return;
  try {
    await dbPut("project:" + state.projectId, state);
    const keep = {
      posts: state.posts,
      insights: state.insights,
      leads: state.leads,
      questions: state.questions,
      records: state.records,
      settings: state.settings,
      target: state.target,
      providedCatalogueVersion: state.providedCatalogueVersion,
      catalog: state.catalog,
      contentHistory: state.contentHistory,
    };
    state = {
      version: 1,
      title: "",
      product: "강마루",
      memo: "",
      mascot: "none",
      theme: "editorial",
      format: "carousel",
      photos: [],
      ...officeDefaults(),
      ...keep,
    };
    if (window.CheonginContent) ensureWriting(state);
    selected = 0;
    images.clear();
    sync();
    persist();
    await renderProjects();
  } catch (e) {
    toast(e.message);
  }
};
$("migration-backup").onclick = async () => {
  const saved = await dbGet("pre-office-v2");
  if (!saved)
    return toast("업그레이드 전 데이터가 없습니다. 전체 백업을 사용하세요.");
  download(
    new Blob([JSON.stringify(saved)], { type: "application/json" }),
    "청인마루_업그레이드전_v1.json",
  );
};
const oldBackup = backup;
backup = async function () {
  try {
    const keys = await new Promise((resolve, reject) => {
      const r = db.transaction("projects").objectStore("projects").getAllKeys();
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const projects = [];
    for (const key of keys.filter((k) => String(k).startsWith("project:")))
      projects.push({ key, state: await dbGet(key) });
    const data = {
      bundleVersion: 1,
      current: state,
      projects,
      preUpgrade: await dbGet("pre-office-v2"),
      contentUpgradeBackup: await dbGet("pre-content-engine-v1"),
    };
    download(
      new Blob([JSON.stringify(data)], { type: "application/json" }),
      `청인마루_전체백업_${localDate()}.json`,
    );
  } catch (e) {
    toast("전체 백업 실패: " + e.message);
  }
};
$("backup").onclick = () => backup();
$("restore").onchange = async (e) => {
  try {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 500 * 1024 * 1024)
      throw Error("500MB 이하의 백업을 사용하세요.");
    const raw = JSON.parse(await f.text()),
      bundle = raw.bundleVersion === 1 ? raw : { current: raw, projects: [] };
    validate(bundle.current);
    if (bundle.preUpgrade) validate(bundle.preUpgrade);
    if (bundle.contentUpgradeBackup) validate(bundle.contentUpgradeBackup);
    if (!Array.isArray(bundle.projects) || bundle.projects.length > 100)
      throw Error("현장 보관함 형식 오류");
    for (const item of bundle.projects) {
      if (typeof item.key !== "string" || !item.key.startsWith("project:"))
        throw Error("보관함 키 형식 오류");
      validate(item.state);
    }
    for (const s of [bundle.current, ...bundle.projects.map((x) => x.state)])
      await Promise.all(s.photos.map((p) => loadImage(p.src)));
    await backup();
    if (!confirm("현재 전체 백업을 내려받았습니다. 선택한 자료를 복원할까요?"))
      return;
    const next = normalise(bundle.current);
    await new Promise((resolve, reject) => {
      const t = db.transaction("projects", "readwrite"),
        store = t.objectStore("projects");
      store.put(structuredClone(state), "pre-restore:" + Date.now());
      store.put(next, "current");
      if (bundle.contentUpgradeBackup)
        store.put(
          bundle.contentUpgradeBackup,
          "imported-pre-content-engine:" + Date.now(),
        );
      for (const item of bundle.projects) store.put(item.state, item.key);
      if (bundle.preUpgrade)
        store.put(
          validate(bundle.preUpgrade),
          "imported-pre-upgrade:" + Date.now(),
        );
      t.oncomplete = resolve;
      t.onerror = () => reject(t.error);
    });
    state = next;
    selected = 0;
    images.clear();
    sync();
    await renderProjects();
    toast("전체 자료를 복원했습니다. 기존 현장 보관함은 삭제하지 않았습니다.");
  } catch (err) {
    toast("복원 실패: " + err.message);
  } finally {
    e.target.value = "";
  }
};
$("settings-form").onsubmit = (e) => {
  e.preventDefault();
  try {
    state.settings = {
      kakao: safeUrl($("kakao-url").value),
      instagram: safeUrl($("instagram-url").value),
      website: safeUrl($("website-url").value),
      aiUrl: safeUrl($("ai-url").value),
    };
    persist();
    renderContact();
    toast("주소를 저장했습니다. 접속 토큰은 저장되지 않습니다.");
  } catch (e) {
    toast(e.message);
  }
};
function renderContact() {
  const host = $("contact-links");
  host.replaceChildren();
  for (const [k, label] of [
    ["kakao", "카카오 상담"],
    ["instagram", "Instagram DM"],
    ["website", "홈페이지 상담"],
  ]) {
    if (!state.settings[k]) continue;
    const a = node("a", label);
    a.href = safeUrl(state.settings[k]);
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    host.append(a);
  }
  $("ai-status").textContent = "미연결 · 연결 확인 필요";
  $("run-ai").disabled = true;
}
// Mask has source-aligned pixels. Token stays only in this page's password input.
let maskLayer = null,
  painting = false;
function resetMask() {
  const p = state.photos[selected];
  if (!p) return;
  const c = $("mask-canvas"),
    preview = $("photo-preview");
  if (c.dataset.photo === p.id && c.width === preview.width) {
    drawMask();
    return;
  }
  c.width = preview.width;
  c.height = preview.height;
  c.dataset.photo = p.id;
  maskLayer = node("canvas");
  maskLayer.width = c.width;
  maskLayer.height = c.height;
  maskReady = false;
  drawMask();
}
function drawMask() {
  const c = $("mask-canvas"),
    ctx = c.getContext("2d");
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.drawImage($("photo-preview"), 0, 0, c.width, c.height);
  if (maskLayer) ctx.drawImage(maskLayer, 0, 0);
}
$("mask-canvas").onpointerdown = (e) => {
  if (!maskLayer) return;
  painting = true;
  e.target.setPointerCapture(e.pointerId);
  paint(e);
};
$("mask-canvas").onpointermove = (e) => {
  if (painting) paint(e);
};
$("mask-canvas").onpointerup = () => (painting = false);
$("mask-canvas").onpointercancel = () => (painting = false);
function paint(e) {
  const c = $("mask-canvas"),
    r = c.getBoundingClientRect(),
    ctx = maskLayer.getContext("2d");
  ctx.fillStyle = "rgba(185,90,45,0.7)";
  ctx.beginPath();
  ctx.arc(
    ((e.clientX - r.left) * c.width) / r.width,
    ((e.clientY - r.top) * c.height) / r.height,
    (Number($("brush").value) * c.width) / r.width / 2,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  maskReady = true;
  drawMask();
}
$("clear-mask").onclick = () => {
  maskLayer
    ?.getContext("2d")
    .clearRect(0, 0, maskLayer.width, maskLayer.height);
  maskReady = false;
  drawMask();
};
async function aiFetch(path, body) {
  const url = safeUrl(state.settings.aiUrl),
    token = $("ai-token").value;
  if (!url || !token)
    throw Error("보관함에서 AI 서버 주소와 접속 토큰을 설정하세요.");
  const res = await fetch(url + path, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization: "Bearer " + token,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await res.json();
  if (!res.ok) throw Error(data.error || "AI 서버 요청 실패");
  return data;
}
$("check-ai").onclick = async () => {
  try {
    const d = await aiFetch("/health");
    $("ai-status").textContent = d.configured
      ? "연결됨 · 요청별 전송 동의 필요"
      : "서버 연결됨 · AI 키 미설정";
    toast(
      `서버 상태: ${d.configured ? "사용 가능" : "AI 키 미설정"} / 일일 한도 ${d.dailyLimit}`,
    );
  } catch (e) {
    $("ai-status").textContent = "미연결";
    toast(e.message);
  }
};
$("run-ai").onclick = async () => {
  const p = state.photos[selected];
  if (!p || !maskReady) return toast("제거할 영역을 칠하세요.");
  if (!$("ai-consent").checked) return toast("외부 전송 동의가 필요합니다.");
  $("run-ai").disabled = true;
  try {
    const img = node("canvas"),
      activeMask = node("canvas"),
      mask = node("canvas");
    img.width = $("photo-preview").width;
    img.height = $("photo-preview").height;
    img.getContext("2d").drawImage($("photo-preview"), 0, 0);
    activeMask.width = maskLayer.width;
    activeMask.height = maskLayer.height;
    activeMask.getContext("2d").drawImage(maskLayer, 0, 0);
    mask.width = img.width;
    mask.height = img.height;
    const ctx = mask.getContext("2d");
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, mask.width, mask.height);
    const pixels = activeMask
      .getContext("2d")
      .getImageData(0, 0, mask.width, mask.height);
    const data = ctx.getImageData(0, 0, mask.width, mask.height);
    for (let i = 0; i < data.data.length; i += 4)
      if (pixels.data[i + 3]) data.data[i + 3] = 0;
    ctx.putImageData(data, 0, 0);
    const result = await aiFetch("/edit", {
      image: img.toDataURL("image/png"),
      mask: mask.toDataURL("image/png"),
      consent: true,
    });
    const remote = await loadImage(result.image),
      composite = node("canvas");
    composite.width = img.width;
    composite.height = img.height;
    const compositeCtx = composite.getContext("2d");
    compositeCtx.drawImage(img, 0, 0);
    const patch = node("canvas");
    patch.width = img.width;
    patch.height = img.height;
    const patchCtx = patch.getContext("2d");
    patchCtx.drawImage(remote, 0, 0, img.width, img.height);
    const solid = node("canvas");
    solid.width = img.width;
    solid.height = img.height;
    const solidCtx = solid.getContext("2d"),
      solidData = activeMask
        .getContext("2d")
        .getImageData(0, 0, img.width, img.height);
    for (let i = 3; i < solidData.data.length; i += 4)
      solidData.data[i] = solidData.data[i] ? 255 : 0;
    solidCtx.putImageData(solidData, 0, 0);
    patchCtx.globalCompositeOperation = "destination-in";
    patchCtx.drawImage(solid, 0, 0);
    compositeCtx.drawImage(patch, 0, 0);
    const candidate = composite;
    aiCandidate = {
      photoId: p.id,
      src: composite.toDataURL("image/png"),
      before: img.toDataURL("image/png"),
    };
    const position = state.photos.findIndex((photo) => photo.id === p.id);
    if (position < 0) {
      aiCandidate = null;
      throw Error("현장 사진이 바뀌어 AI 결과를 적용하지 않았습니다.");
    }
    selected = position;
    thumbnails();
    const c = $("photo-preview");
    c.width = candidate.width;
    c.height = candidate.height;
    c.getContext("2d").drawImage(candidate, 0, 0);
    $("accept-ai").hidden = false;
    $("reject-ai").hidden = false;
    $("ai-message").textContent =
      "AI 결과 미확정: 바닥 무늬·자재 색·시공 방향을 원본과 비교하세요.";
  } catch (e) {
    toast(e.message);
  } finally {
    $("run-ai").disabled = false;
    $("ai-consent").checked = false;
  }
};
$("accept-ai").onclick = async () => {
  if (!aiCandidate) return;
  const p = state.photos.find((p) => p.id === aiCandidate.photoId);
  if (!p) return;
  p.originalSrc = p.originalSrc || p.src;
  p.aiHistory = p.aiHistory || [];
  p.aiHistory.push({ src: p.src, adjust: structuredClone(p.adjust) });
  p.src = aiCandidate.src;
  p.adjust = defaults();
  p.approved = false;
  images.delete(p.id);
  aiCandidate = null;
  $("accept-ai").hidden = true;
  $("reject-ai").hidden = true;
  await preview();
  persist();
  toast("AI 결과를 적용했습니다. 원본은 보존했습니다.");
};
$("reject-ai").onclick = () => {
  aiCandidate = null;
  $("accept-ai").hidden = true;
  $("reject-ai").hidden = true;
  preview();
};
const oldCompare = $("compare").onclick;
$("compare").onclick = async () => {
  const p = state.photos[selected];
  if (aiCandidate && aiCandidate.photoId === p?.id) {
    const src =
      $("compare").getAttribute("aria-pressed") === "true"
        ? aiCandidate.src
        : aiCandidate.before;
    const im = await loadImage(src),
      c = $("photo-preview");
    c.width = im.width;
    c.height = im.height;
    c.getContext("2d").drawImage(im, 0, 0);
    $("compare").setAttribute(
      "aria-pressed",
      String(src === aiCandidate.before),
    );
    return;
  }
  if (p?.originalSrc) {
    original = !original;
    const im = await loadImage(original ? p.originalSrc : p.src),
      c = $("photo-preview");
    const out = original ? im : transformed(im, p.adjust, 1200);
    c.width = out.width;
    c.height = out.height;
    c.getContext("2d").drawImage(out, 0, 0);
    $("compare").setAttribute("aria-pressed", String(original));
    return;
  }
  oldCompare();
};
const resetOriginal = node("button", "AI 편집 전 원본 복원");
resetOriginal.onclick = () => {
  const p = state.photos[selected];
  if (!p?.originalSrc) return toast("이 사진에 AI 편집 원본이 없습니다.");
  p.src = p.originalSrc;
  delete p.originalSrc;
  p.adjust = defaults();
  p.approved = false;
  images.delete(p.id);
  preview();
  persist();
};
document.querySelector(".toolbar").append(resetOriginal);
// Existing brand assets remain unmodified; no fabricated product specifications.
const brands = node(
  "p",
  "취급 브랜드: 동화 · 한솔 · 네스트 · 구정 · 노바. 실제 모델과 성능·가격은 제조사 자료와 현장 확인이 필요합니다.",
  "brand-reference",
);
$("product-cards").before(brands);
$("run-ai").disabled = true;
const healthCheck = $("check-ai").onclick;
$("check-ai").onclick = async () => {
  await healthCheck();
  $("run-ai").disabled = !$("ai-status").textContent.startsWith("연결됨");
};
if (
  db &&
  ["이 기기 자동 저장", "이 기기에 저장됨"].includes(
    $("save-status").textContent,
  )
)
  startOffice();
// Three distinct editorial systems; recommended order and crop adapt to this set.
card = async function (theme, slide) {
  await Promise.all([
    document.fonts.load('400 56px "Studio Serif"'),
    document.fonts.load('400 26px "Studio Sans"'),
  ]);
  const c = node("canvas");
  c.width = 1080;
  c.height = state.format === "story" ? 1920 : 1350;
  const ctx = c.getContext("2d"),
    w = 1080,
    h = c.height,
    n = state.slideCount || 5,
    ordered = photoOrder(),
    index =
      theme === "gallery"
        ? (slide + 1) % ordered.length
        : theme === "journal"
          ? (ordered.length - 1 - slide + ordered.length) % ordered.length
          : slide % ordered.length,
    p = ordered[index],
    was = original;
  original = false;
  let img;
  try {
    img = transformed(await photoImage(p), p.adjust, 2400);
  } finally {
    original = was;
  }
  const first = slide === 0,
    last = slide === n - 1,
    goal = state.goal || "discovery";
  const headings = {
    discovery: [
      "공간의 인상이 달라지는 순간",
      "빛을 따라, 소재를 만나다",
      "가까이에서 발견한 결",
      "다음 공간을 위한 영감",
      "기록해 두고 싶은 디테일",
      "다음 현장도 함께해요",
    ],
    trust: [
      "완성도를 만드는 작은 차이",
      "공간과 공간이 만나는 자리",
      "소재를 대하는 태도",
      "시공의 결을 가까이에서",
      "현장에서 확인하는 디테일",
      "당신의 공간을 함께 살핍니다",
    ],
    consultation: [
      "우리 집에는 어떤 마루가 어울릴까",
      "공간 전체의 인상부터",
      "원하는 소재의 질감은",
      "시공 전, 현장을 함께 확인",
      "사진으로 시작하는 상담",
      "좋은 공간의 시작, 청인마루",
    ],
  };
  let title = first
    ? state.title || headings[goal][0]
    : last
      ? headings[goal][5]
      : headings[goal][slide];
  if (
    state.authoring?.draft?.carousel?.[slide] &&
    state.authoring.draft.inputSignature === window.currentWritingSignature?.()
  )
    title = state.authoring.draft.carousel[slide].text;
  const serif = '"Studio Serif", "Noto Serif CJK KR", serif',
    sans = '"Studio Sans", sans-serif';
  const colors = {
    editorial: ["#f5f1e8", "#36332d"],
    gallery: ["#242522", "#fffaf0"],
    journal: ["#e8e2d6", "#50483c"],
  }[theme];
  ctx.fillStyle = colors[0];
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = colors[1];
  ctx.font = "18px " + sans;
  ctx.fillText("CHEONGINMARU", 60, 64);
  ctx.fillText(
    String(slide + 1).padStart(2, "0") + " — " + String(n).padStart(2, "0"),
    920,
    64,
  );
  const writingProduct =
    window.CheonginContent && window.currentWritingSignature?.()
      ? selectedProduct()
      : null;
  const tag = (
    writingProduct
      ? [
          state.authoring.site,
          writingProduct.brand,
          writingProduct.model || writingProduct.category,
        ]
      : [state.region, state.materialBrand, state.product]
  )
    .filter(Boolean)
    .join(" / ");
  let foot = last
    ? goal === "discovery"
      ? "더 많은 공간 기록은 청인마루에서"
      : goal === "trust"
        ? "현장 사진으로 시공 디테일을 확인하세요"
        : "시공 지역 · 현장 사진 · 원하는 소재로 상담을 시작하세요"
    : tag;
  if (
    writingProduct &&
    state.authoring?.draft?.carousel?.[slide]?.role === "제품"
  )
    foot = [
      writingProduct.size,
      writingProduct.pack && "구성 " + writingProduct.pack,
      writingProduct.coverage && "박스 면적 " + writingProduct.coverage,
    ]
      .filter(Boolean)
      .join(" / ");
  if (theme === "editorial") {
    const y = first ? 340 : 140,
      bottom = last ? 320 : 250;
    ctx.font = (first ? "60" : "42") + "px " + serif;
    if (first) lines(ctx, title, 62, 170, 940, 85, 2);
    cover(ctx, img, 60, y, 960, h - y - bottom);
    ctx.fillStyle = colors[1];
    if (!first) lines(ctx, title, 62, h - 180, 940, 60, 2);
    ctx.font = "22px " + sans;
    lines(ctx, foot, 62, h - 65, 940, 34, 2);
    if (first) {
      ctx.font = "20px " + sans;
      ctx.fillText(
        "SPACE ARCHIVE / " + String(slide + 1).padStart(2, "0"),
        62,
        h - 155,
      );
    }
  } else if (theme === "gallery") {
    cover(ctx, img, 0, 100, w, h - 100);
    const grad = ctx.createLinearGradient(0, h * 0.55, 0, h);
    grad.addColorStop(0, "#161c1700");
    grad.addColorStop(1, "#161c17ee");
    ctx.fillStyle = grad;
    ctx.fillRect(0, h * 0.55, w, h * 0.45);
    ctx.fillStyle = "#fffaf0";
    ctx.font = "54px " + sans;
    lines(ctx, title, 65, h - 270, 940, 78, 2);
    ctx.font = "21px " + sans;
    lines(ctx, foot, 65, h - 95, 920, 34, 2);
  } else {
    if (slide % 2 === 0) {
      cover(ctx, img, 0, 105, 780, h - 400);
      ctx.save();
      ctx.translate(925, 155);
      ctx.rotate(Math.PI / 2);
      ctx.font = "18px " + sans;
      ctx.fillText("MATERIAL / SPACE / DETAIL", 0, 0);
      ctx.restore();
      ctx.fillStyle = colors[1];
      ctx.font = "55px " + serif;
      lines(ctx, title, 65, h - 205, 940, 78, 2);
    } else {
      ctx.font = "50px " + serif;
      lines(ctx, title, 65, 180, 900, 75, 2);
      cover(ctx, img, 180, 350, 840, h - 565);
      ctx.fillStyle = colors[1];
      ctx.font = "20px " + sans;
      ctx.fillText(
        (writingProduct ? state.authoring.memo : state.memo).slice(0, 36) ||
          "소재의 표정을 기록합니다.",
        65,
        h - 160,
      );
    }
    ctx.font = "20px " + sans;
    lines(ctx, foot, 65, h - 55, 900, 32, 2);
  }
  if (last && state.mascot !== "none" && assets[state.mascot]) {
    const asset = assets[state.mascot],
      s = Math.min(105 / asset.width, 105 / asset.height);
    ctx.drawImage(asset, 920, h - 205, asset.width * s, asset.height * s);
  }
  return c;
};
// Never replace unreadable legacy data after a failed initialization.
const basePersist = persist;
persist = function () {
  if (!officeReady) {
    toast("저장소 초기화가 완료되지 않아 변경을 저장하지 않았습니다.");
    return;
  }
  return basePersist();
};
