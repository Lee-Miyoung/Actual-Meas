"use strict";
const Flow = MarketingWorkflow;
let workflowReady = false,
  workflowFailed = false,
  workflowStarting = false,
  workflowBusy = false,
  workflowTimer,
  selectedChannelJob = "",
  currentSourceKey = "";
const sourceHashes = new WeakMap();
const wfDay = () =>
  new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
function ensureFlow(s) {
  s.workflowVersion = 1;
  s.channelJobs ??= [];
  s.projectIndex ??= [];
  s.projectNumber ??= Flow.projectNumber(s.projectId, wfDay());
  if (
    s.projectIndex.some(
      (p) => p.id !== s.projectId && p.number === s.projectNumber,
    )
  )
    s.projectNumber += "-" + s.projectId.replaceAll("-", "");
  s.space ??= "";
  s.consumerQuestion ??= "";
  return s;
}
const flowValidateBase = validate;
validate = function (s) {
  flowValidateBase(s);
  Flow.validate(s);
  return s;
};
const flowNormaliseBase = normalise;
normalise = function (s) {
  flowNormaliseBase(s);
  if (workflowReady) ensureFlow(s);
  return s;
};
function projectMeta() {
  return {
    id: state.projectId,
    number: state.projectNumber,
    title: state.title || state.authoring.site || state.projectNumber,
    region: state.region || "",
    space: state.space || "",
    memo: state.authoring.memo || "",
    product: Writer.label(selectedProduct() || { category: state.product }),
    photoCount: state.photos.length,
    theme: state.theme,
    updatedAt: new Date().toISOString(),
  };
}
function indexCurrent() {
  if (!workflowReady) return;
  const p = projectMeta(),
    i = state.projectIndex.findIndex((x) => x.id === p.id);
  if (i < 0) {
    if (state.photos.length || state.title) state.projectIndex.push(p);
  } else state.projectIndex[i] = { ...state.projectIndex[i], ...p };
}
function goTab(id) {
  document.querySelector(`[data-tab="${id}"]`).click();
}
function progress(text, error = false) {
  $("site-progress").textContent = text;
  $("site-progress").classList.toggle("validation-error", error);
}
async function digest(text) {
  return [
    ...new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)),
    ),
  ]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
async function storePhoto(src, name) {
  const key = "wf-photo:" + (await digest(src)),
    existing = await dbGet(key);
  if (!existing)
    await dbPut(key, { src, name, createdAt: new Date().toISOString() });
  return key;
}
async function assetRefs(photos) {
  const refs = [];
  for (let i = 0; i < photos.length; i++) {
    const p = photos[i];
    const cacheObject = p.cacheObject || p;
    let cache = sourceHashes.get(cacheObject);
    if (!cache || cache.src !== p.src) {
      progress(`현장 원본과 사진 자료 보관 중 ${i + 1}/${photos.length}…`);
      const key = await storePhoto(p.src, p.name),
        originalKey = p.originalSrc
          ? await storePhoto(p.originalSrc, p.name)
          : key;
      cache = { src: p.src, key, originalKey };
      sourceHashes.set(cacheObject, cache);
    }
    refs.push({
      key: cache.key,
      originalKey: cache.originalKey,
      adjust: structuredClone(p.adjust),
      focus: structuredClone(p.focus || { x: 0.5, y: 0.5 }),
    });
  }
  return refs;
}
async function prepareChannels() {
  if (!workflowReady || workflowBusy) return;
  if (!state.photos.length || !state.authoring.draft) return;
  const source = structuredClone(state.authoring.draft);
  if (source.inputSignature !== currentWritingSignature()) return;
  workflowBusy = true;
  const id = state.projectId,
    project = projectMeta(),
    photos = photoOrder().map((p) => ({
      ...p,
      cacheObject: p,
      adjust: structuredClone(p.adjust),
      focus: structuredClone(p.focus || { x: 0.5, y: 0.5 }),
    })),
    question = state.consumerQuestion || "";
  try {
    const refs = await assetRefs(photos);
    const comparable = JSON.stringify({
      project: { ...project, updatedAt: "" },
      source,
      refs,
      question,
    });
    const stableKey = await digest(comparable);
    if (
      currentSourceKey === stableKey &&
      state.channelJobs.filter((j) => j.projectId === id).length === 4
    )
      return;
    if (
      state.projectId !== id ||
      state.photos.length !== photos.length ||
      photos.some(p => {
        const current = state.photos.find(photo => photo.id === p.id);
        return !current || current.src !== p.src || JSON.stringify(current.adjust) !== JSON.stringify(p.adjust) || JSON.stringify(current.focus||{x:.5,y:.5}) !== JSON.stringify(p.focus);
      }) ||
      JSON.stringify(state.authoring.draft) !== JSON.stringify(source)
    ) {
      scheduleChannels();
      return;
    }
    const content = Flow.drafts(project, source, refs, question);
    for (const d of content) {
      let job = state.channelJobs.find(
        (j) => j.projectId === id && j.channel === d.channel,
      );
      if (!job) {
        job = {
          id: crypto.randomUUID(),
          projectId: id,
          projectNumber: project.number,
          channel: d.channel,
          status: "초안",
          draft: d,
          sourceKey: stableKey,
          versions: [],
          history: [{ status: "초안", at: new Date().toISOString() }],
          scheduledDate: "",
          publishedUrl: "",
          postId: "",
          revision: 1,
          pastPublications: [],
        };
        state.channelJobs.push(job);
      } else if (job.sourceKey !== stableKey) {
        if (job.status === "초안" && !job.manuallyEdited) {
          job.versions.push({
            id: crypto.randomUUID(),
            at: new Date().toISOString(),
            kind: "이전 생성 초안",
            content: structuredClone(job.draft),
          });
          job.draft = d;
          job.sourceKey = stableKey;
        } else {
          job.pendingDraft = d;
          job.pendingSourceKey = stableKey;
        }
      }
    }
    currentSourceKey = stableKey;
    indexCurrent();
    await dbPut("project:" + id, state);
    persist();
    renderWorkspace();
    if (
      selectedChannelJob &&
      !["channel-title", "channel-body"].includes(document.activeElement?.id)
    )
      openJob(selectedChannelJob);
    progress(
      `${project.number} · 4개 채널 초안을 준비했습니다. 원고를 검토하고 승인해 주세요.`,
    );
  } catch (e) {
    progress("채널 자료 준비 실패: " + e.message, true);
  } finally {
    workflowBusy = false;
  }
}
function scheduleChannels() {
  clearTimeout(workflowTimer);
  workflowTimer = setTimeout(() => prepareChannels(), 350);
}
window.addEventListener("marketing:ready", scheduleChannels);
const flowSyncBase = syncOffice;
syncOffice = function () {
  flowSyncBase();
  if (workflowReady) {
    ensureFlow(state);
    indexCurrent();
    renderWorkspace();
    currentSourceKey = "";
    if (state.photos.length)
      setTimeout(async () => {
        await easyGenerate(true);
        scheduleChannels();
      }, 100);
  }
};
const flowPersistBase = persist;
persist = function () {
  if (workflowReady) indexCurrent();
  const result = flowPersistBase();
  if (workflowReady) renderDashboard();
  return result;
};
function renderDashboard() {
  if (!workflowReady) return;
  const d = Flow.dashboard(state, wfDay()),
    host = $("today-metrics");
  host.replaceChildren();
  for (const [label, value] of [
    ["제작 초안", d.draft],
    ["승인 대기", d.review],
    ["게시 예정", d.scheduled],
    ["게시 완료", d.published],
    [
      "이번 달 팔로워 증감",
      d.followers
        ? (d.followers.delta > 0 ? "+" : "") + d.followers.delta
        : "미기록",
    ],
    ["이번 달 신규 상담", d.newLeads],
    ["현재 견적 단계", d.quotes],
    ["현재 계약 단계", d.contracts],
  ])
    metric(host, label, value);
  $("workspace-status").textContent = d.followers
    ? `이 기기 저장 · 클라우드 미연결 / 팔로워는 ${d.followers.from}–${d.followers.to} 수동 기록 구간 기준`
    : "이 기기 저장 · 클라우드 미연결 / 월 팔로워 증감은 비교 가능한 계정 기록을 입력하면 표시합니다.";
  const tasks = $("today-tasks");
  tasks.replaceChildren();
  const choices = [];
  if (d.review) choices.push([`승인 대기 ${d.review}건 검토`, "검토"]);
  if (d.approved) choices.push([`승인 완료 ${d.approved}건 게시 일정 정하기`, "승인"]);
  if (d.legacyDue?.length) {
    const legacy = node(
      "button",
      `기존 일정의 오늘/지난 게시 준비 ${d.legacyDue.length}건`,
    );
    legacy.onclick = () => goTab("records");
    tasks.append(legacy);
  }
  if (d.due.length)
    choices.push([`오늘/기한 지난 수동 게시 ${d.due.length}건`, "게시 예정"]);
  if (d.draft) choices.push([`초안 ${d.draft}건 검토 요청`, "초안"]);
  if (d.needsMetrics.length)
    choices.push([
      `게시 완료 ${d.needsMetrics.length}건 성과 입력`,
      "게시 완료",
    ]);
  if (!choices.length)
    tasks.append(
      node(
        "p",
        "사진과 제품으로 현장을 등록하면 채널별 할 일이 여기에 모입니다.",
        "hint",
      ),
    );
  for (const [text, filter] of choices) {
    const b = node("button", text);
    b.onclick = () => {
      $("channel-filter").value = filter;
      renderJobList();
      $("channel-job-list").scrollIntoView({ behavior: "smooth" });
    };
    tasks.append(b);
  }
}
function renderSiteProducts() {
  const select = $("site-product"),
    value = select.value || state.authoring.productKey;
  select.replaceChildren(
    ...[...$("engine-product").children].map((n) => n.cloneNode(true)),
  );
  select.value = value;
  filterSiteProducts();
}
function filterSiteProducts() {
  const term = $("site-product-search").value.replace(/\s/g, "").toLowerCase();
  for (const o of $("site-product").options) {
    const p = Writer.resolveProduct(state.catalog, o.value);
    o.hidden = !!(
      (term &&
        !o.textContent.replace(/\s/g, "").toLowerCase().includes(term)) ||
      (p && /단종|출시 전|재고 없음/.test(p.status))
    );
  }
}
$("site-product-search").oninput = filterSiteProducts;
for (const work of Writer.WORKS) {
  const l = node("label", undefined, "checkline"),
    i = node("input");
  i.type = "checkbox";
  i.value = work;
  l.append(i, document.createTextNode(work));
  $("site-works").append(l);
}
$("open-site-form").onclick = () => {
  $("site-registration").open = true;
  $("site-registration").scrollIntoView({ behavior: "smooth" });
};
$("site-form").onsubmit = async (e) => {
  e.preventDefault();
  const files = $("site-photos").files,
    key = $("site-product").value;
  if (files.length < 1 || files.length > 10)
    return progress("사진 1–10장을 선택하세요.", true);
  if (!key) return progress("제품 또는 제품군을 선택하세요.", true);
  const button = $("register-site");
  button.disabled = true;
  try {
    selectedChannelJob = "";
    $("channel-detail").hidden = true;
    const meta = {
      title: $("site-name").value.trim(),
      region: $("site-region").value.trim(),
      space: $("site-space").value.trim(),
      memo: $("site-memo").value.trim(),
      question: $("site-question").value.trim(),
      works: [...$("site-works").querySelectorAll("input:checked")].map(
        (i) => i.value,
      ),
    };
    progress("기존 현장을 보관하고 새 현장을 등록합니다…");
    if (state.photos.length || state.title)
      await dbPut("project:" + state.projectId, state);
    const keep = {};
    for (const k of [
      "posts",
      "insights",
      "leads",
      "questions",
      "records",
      "settings",
      "target",
      "providedCatalogueVersion",
      "catalog",
      "contentHistory",
      "channelJobs",
      "projectIndex",
    ])
      keep[k] = state[k];
    state = {
      version: 1,
      title: meta.title,
      region: meta.region,
      space: meta.space,
      consumerQuestion: meta.question,
      product: "강마루",
      memo: meta.memo,
      mascot: "none",
      theme: "editorial",
      format: "carousel",
      photos: [],
      ...officeDefaults(),
      ...keep,
    };
    state.region = meta.region;
    ensureWriting(state);
    ensureFlow(state);
    state.authoring.productKey = key;
    state.authoring.site = meta.region || meta.title;
    state.authoring.memo = meta.memo;
    state.authoring.works = meta.works;
    selected = 0;
    images.clear();
    sync();
    $("engine-product").value = key;
    $("engine-product").onchange();
    await $("photos").onchange({ target: $("site-photos") });
    if (!state.photos.length)
      throw Error(
        "사진을 불러오지 못했습니다. 이전 현장은 보관함에 유지됩니다.",
      );
    await easyGenerate(false);
    await prepareChannels();
    await dbPut("project:" + state.projectId, state);
    $("site-registration").open = false;
    renderWorkspace();
  } catch (err) {
    progress(err.message, true);
  } finally {
    button.disabled = false;
  }
};
async function openSite(id) {
  if (id === state.projectId) {
    goTab("studio");
    await easyGenerate(false);
    return;
  }
  try {
    if (state.photos.length || state.title)
      await dbPut("project:" + state.projectId, state);
    const target = await dbGet("project:" + id);
    if (!target) throw Error("현장 원본이 없습니다. 기존 일정은 유지됩니다.");
    const keep = {};
    for (const k of [
      "posts",
      "insights",
      "leads",
      "questions",
      "records",
      "settings",
      "target",
      "providedCatalogueVersion",
      "catalog",
      "contentHistory",
      "channelJobs",
      "projectIndex",
    ])
      keep[k] = state[k];
    state = { ...normalise(validate(target)), ...keep };
    ensureFlow(state);
    selected = 0;
    images.clear();
    sync();
    persist();
    goTab("studio");
    await easyGenerate(true);
  } catch (e) {
    progress(e.message, true);
  }
}
function renderProjectList() {
  const host = $("site-project-list");
  host.replaceChildren();
  for (const p of [...state.projectIndex].reverse()) {
    const row = node("article", undefined, "site-row"),
      jobs = state.channelJobs.filter((j) => j.projectId === p.id);
    row.append(
      node("small", p.number),
      node("h3", p.title),
      node(
        "p",
        [
          p.region,
          p.space,
          p.product,
          `사진 ${p.photoCount || 0}장`,
          `${jobs.length}개 채널`,
        ]
          .filter(Boolean)
          .join(" · "),
      ),
    );
    const open = node("button", "사진·디자인 열기");
    open.onclick = () => openSite(p.id);
    const jobsButton = node("button", "이 현장 채널 업무");
    jobsButton.onclick = () => {
      $("channel-filter").value = "";
      $("channel-job-list").dataset.project = p.id;
      renderJobList();
      $("channel-job-list").scrollIntoView({ behavior: "smooth" });
    };
    row.append(open, jobsButton);
    host.append(row);
  }
  if (!state.projectIndex.length)
    host.append(
      node(
        "p",
        "등록된 현장이 없습니다. 가상 현장이나 성과 수치는 표시하지 않습니다.",
        "hint",
      ),
    );
}
function renderJobList() {
  const host = $("channel-job-list"),
    filter = $("channel-filter").value,
    project = host.dataset.project;
  host.replaceChildren();
  if (project) {
    const all = node("button", "모든 현장 보기");
    all.onclick = () => {
      delete host.dataset.project;
      renderJobList();
    };
    host.append(all);
  }
  for (const j of state.channelJobs.filter(
    (j) =>
      (!filter || j.status === filter) && (!project || j.projectId === project),
  )) {
    const row = node("button", undefined, "channel-job-row");
    row.append(
      node("small", j.projectNumber + " · " + Flow.CHANNELS[j.channel]),
      node("strong", j.draft.title),
      node(
        "span",
        j.status +
          (j.scheduledDate ? " / " + j.scheduledDate : "") +
          (j.pendingDraft ? " · 새 현장 정보 있음" : ""),
      ),
    );
    row.onclick = () => openJob(j.id);
    host.append(row);
  }
}
$("channel-filter").onchange = renderJobList;
function jobContent(j) {
  return ["승인", "게시 예정", "게시 완료", "성과 분석"].includes(j.status) &&
    j.approved
    ? j.approved
    : j.draft;
}
function currentJob() {
  return state.channelJobs.find((j) => j.id === selectedChannelJob);
}
function syncLegacyPost(job) {
  const map = {
      instagram: "Instagram",
      naver: "네이버 블로그",
      website: "홈페이지",
      kakao: "카카오채널",
    },
    content = jobContent(job);
  let post = state.posts.find((p) => p.id === job.postId);
  if (!post) {
    post = { id: "workflow-" + job.id + "-r" + (job.revision || 1) };
    job.postId = post.id;
    state.posts.push(post);
  }
  Object.assign(post, {
    workflowJobId: job.id,
    projectId: job.projectId,
    channel: map[job.channel],
    title: content.title,
    date: job.publishedDate || job.scheduledDate || wfDay(),
    status: ["게시 완료", "성과 분석"].includes(job.status)
      ? "게시 완료"
      : "게시 준비",
    workflowStatus: job.status,
    workflowRevision: job.revision || 1,
    contentMode: content.mode,
    productId: content.product.id,
    productSnapshot: structuredClone(content.product),
    region: content.region,
    contentSnapshot: {
      ...content,
      caption: content.body,
      titles: [content.title, content.title, content.title],
      selectedTitle: 0,
    },
    topic: content.site,
  });
  return post;
}
function hasMetrics(job) {
  return (
    state.insights.some((i) => i.postId === job.postId) ||
    state.leads.some((l) => l.postId === job.postId)
  );
}
function transition(job, next) {
  if (!Flow.canTransition(job, next, hasMetrics(job)))
    throw Error(
      next === "성과 분석"
        ? "먼저 해당 게시물의 실제 성과 또는 상담 유입을 기록하세요."
        : "검토·승인·게시 예정일과 현재 단계를 확인하세요.",
    );
  if (next === "승인") {
    job.approved = structuredClone(job.draft);
    job.approvedAt = new Date().toISOString();
    job.versions.push({
      id: crypto.randomUUID(),
      at: job.approvedAt,
      kind: "로컬 승인본",
      content: structuredClone(job.draft),
    });
  }
  job.status = next;
  job.history.push({ status: next, at: new Date().toISOString() });
  if (["게시 예정", "게시 완료", "성과 분석"].includes(next))
    syncLegacyPost(job);
  persist();
  renderOperations();
  renderWorkspace();
  if (selectedChannelJob === job.id) openJob(job.id);
  progress(`${job.projectNumber} · ${Flow.CHANNELS[job.channel]}: ${next} 상태를 기록했습니다.`);
}
function openJob(id) {
  selectedChannelJob = id;
  const j = currentJob();
  if (!j) return;
  const detail = $("channel-detail");
  detail.hidden = false;
  $("channel-detail-title").textContent =
    Flow.CHANNELS[j.channel] + " · " + j.projectNumber;
  $("channel-detail-state").textContent =
    j.status +
    (j.pendingDraft
      ? " / 새 현장 정보가 있습니다. 현재 원고와 다음 초안을 구분해 검토하세요."
      : "") +
    " / 자동 게시 미연결 · 게시 완료는 직접 게시한 뒤 기록합니다.";
  $("channel-title").value = j.draft.title;
  $("channel-body").value = j.draft.body;
  const editable = j.status === "초안";
  $("channel-title").readOnly = !editable;
  $("channel-body").readOnly = !editable;
  $("channel-date").value = j.scheduledDate || wfDay();
  $("channel-url").value = j.publishedUrl || "";
  $("channel-published-date").value = j.publishedDate || wfDay();
  const extra = $("channel-extras");
  extra.replaceChildren();
  for (const [label, text] of [
    ["형식", j.draft.format],
    ["릴스 후킹", j.draft.hook],
    ["릴스 대본", j.draft.script],
    ["스토리", j.draft.story],
    ["마루니·루루", j.draft.mascotRecommendation],
  ])
    if (text) extra.append(node("p", label + "\n" + text));
  const actions = $("channel-actions");
  actions.replaceChildren();
  const index = Flow.STATES.indexOf(j.status),
    next = Flow.STATES[index + 1];
  if (next) {
    const labels = {
        검토: "검토 요청",
        승인: "검토한 원고 승인",
        "게시 예정": "예정일 저장 · 게시 예정으로",
        "게시 완료": "직접 게시한 뒤 완료 기록",
        "성과 분석": "실제 성과 분석 완료 기록",
      },
      b = node("button", labels[next]);
    b.onclick = () => {
      try {
        j.scheduledDate = $("channel-date").value;
        if (next === "게시 완료")
          j.publishedDate = $("channel-published-date").value || wfDay();
        j.publishedUrl = safeUrl($("channel-url").value);
        transition(j, next);
      } catch (e) {
        progress(e.message, true);
      }
    };
    actions.append(b);
  }
  if (j.status === "검토") {
    const b = node("button", "초안으로 돌려 수정");
    b.onclick = () => transition(j, "초안");
    actions.append(b);
  }
  if (j.pendingDraft) {
    const b = node("button", "새 정보로 다음 초안 만들기");
    b.onclick = () => {
      j.versions.push({
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        kind: "이전 원고",
        content: structuredClone(j.draft),
      });
      j.pastPublications ??= [];
      if (j.approved)
        j.pastPublications.push({
          revision: j.revision || 1,
          status: j.status,
          approved: structuredClone(j.approved),
          postId: j.postId,
          publishedUrl: j.publishedUrl,
          publishedDate: j.publishedDate || "",
          scheduledDate: j.scheduledDate,
        });
      const oldPost = state.posts.find((p) => p.id === j.postId);
      if (oldPost && oldPost.status !== "게시 완료") oldPost.status = "제작 중";
      j.revision = (j.revision || 1) + 1;
      j.postId = "";
      j.publishedUrl = "";
      j.publishedDate = "";
      j.scheduledDate = "";
      j.approved = null;
      j.manuallyEdited = false;
      j.draft = j.pendingDraft;
      j.sourceKey = j.pendingSourceKey;
      delete j.pendingDraft;
      delete j.pendingSourceKey;
      j.status = "초안";
      persist();
      renderWorkspace();
      openJob(j.id);
    };
    actions.append(b);
  }
  const copy = node("button", "원고 복사");
  copy.onclick = () =>
    copyWriting(
      jobContent(j).title + "\n\n" + jobContent(j).body,
      $("channel-body"),
    );
  const zip = node(
    "button",
    j.channel === "website"
      ? "승인된 홈페이지 파일 내보내기"
      : "원고·사진 ZIP 준비",
  );
  zip.onclick = () => exportJob(j).catch((e) => progress(e.message, true));
  actions.append(copy, zip);
  if (j.channel === "instagram") {
    const video = node("button", "릴스 MP4 출력");
    video.onclick = () =>
      exportJobVideo(j).catch((e) => progress(e.message, true));
    actions.append(video);
  }
  if (j.postId) {
    const b = node("button", "이 게시물 성과 입력");
    b.onclick = () => {
      goTab("growth");
      $("insight-post").value = j.postId;
    };
    actions.append(b);
  }
  const versions = $("channel-version-list");
  versions.replaceChildren();
  for (const v of j.versions.slice().reverse()) {
    const d = node("details"),
      s = node("summary", v.kind + " · " + v.at.slice(0, 10)),
      p = node("p", v.content.title + "\n\n" + v.content.body);
    d.append(s, p);
    versions.append(d);
  }
  for (const output of j.generatedVersions || []) {
    const d = node("details"),
      s = node(
        "summary",
        `생성 이미지 r${output.revision} · ${output.at.slice(0, 10)} · ${output.files.length}개`,
      );
    d.append(s);
    for (const file of output.files) {
      const b = node("button", file.name + " 다시 저장");
      b.onclick = async () => {
        try {
          const record = await dbGet(file.key);
          if (!record)
            throw Error("생성 이미지가 없습니다. 전체 백업을 복원하세요.");
          const blob = await (await fetch(record.src)).blob();
          download(blob, file.name);
        } catch (e) {
          progress(e.message, true);
        }
      };
      d.append(b);
    }
    versions.append(d);
  }
  detail.scrollIntoView({ behavior: "smooth", block: "start" });
}
for (const [id, key] of [
  ["channel-title", "title"],
  ["channel-body", "body"],
])
  $(id).oninput = () => {
    const j = currentJob();
    if (j?.status !== "초안") return;
    j.draft[key] = $(id).value;
    j.manuallyEdited = true;
    persist();
  };
$("review-project").onclick = () => {
  try {
    for (const j of state.channelJobs.filter(
      (j) => j.projectId === state.projectId && j.status === "초안",
    ))
      transition(j, "검토");
    progress(
      "현재 현장 채널 초안을 검토 상태로 보냈습니다. 각 원고를 확인한 뒤 승인하세요.",
    );
  } catch (e) {
    progress(e.message, true);
  }
};
$("approve-project").onclick = () => {
  try {
    const jobs = state.channelJobs.filter(
      (j) => j.projectId === state.projectId && j.status === "검토",
    );
    if (!jobs.length)
      throw Error("먼저 초안을 검토 상태로 보내고 내용을 확인하세요.");
    for (const j of jobs) transition(j, "승인");
    progress("검토 중인 원고를 승인했습니다. 외부에 자동 게시하지 않았습니다.");
  } catch (e) {
    progress(e.message, true);
  }
};
$("prepare-site-channels").onclick = async () => {
  try {
    await easyGenerate(false);
    await prepareChannels();
  } catch (e) {
    progress(e.message, true);
  }
};
function renderWorkspace() {
  renderDashboard();
  renderSiteProducts();
  renderProjectList();
  renderJobList();
  $("review-project").textContent =
    state.projectNumber + " 현장 모두 검토 요청";
  $("approve-project").textContent =
    state.projectNumber + " 현장 검토본 모두 승인";
}
async function startWorkflow() {
  if (workflowReady || workflowStarting || !easyReady || easyBusy) return;
  workflowStarting = true;
  try {
    const old = await dbGet("current");
    if (old) validate(old);
    const next = ensureFlow(structuredClone(state));
    if (!old?.workflowVersion) {
      await new Promise((resolve, reject) => {
        const t = db.transaction("projects", "readwrite"),
          s = t.objectStore("projects");
        if (old) s.put(old, "pre-workflow-v1:" + Date.now());
        s.put(next, "current");
        t.oncomplete = resolve;
        t.onerror = () => reject(t.error);
      });
      state = next;
    } else ensureFlow(state);
    workflowReady = true;
    indexCurrent();
    renderWorkspace();
    if (!state.projectIndex.length) $("site-registration").open = true;
    if (state.photos.length) await prepareChannels();
  } catch (e) {
    workflowFailed = true;
    $("register-site").disabled = true;
    progress(
      "업무 화면 초기화 실패: " +
        e.message +
        ". 기존 메뉴와 전체 백업은 유지합니다. 저장 공간과 백업을 확인한 뒤 새로고침해 주세요.",
      true,
    );
  } finally {
    workflowStarting = false;
  }
}
const workflowBoot = setInterval(() => {
  if (workflowReady || workflowFailed) {
    clearInterval(workflowBoot);
    return;
  }
  startWorkflow();
}, 100);
async function workflowImage(ref, max = 1800) {
  const record = await dbGet(ref.key);
  if (!record)
    throw Error("보관된 현장 사진을 찾지 못했습니다. 전체 백업을 복원하세요.");
  const image = await loadImage(record.src),
    was = original;
  original = false;
  try {
    const c = transformed(image, ref.adjust, max);
    c.focus = ref.focus || { x: 0.5, y: 0.5 };
    return c;
  } finally {
    original = was;
  }
}
async function workflowCard(content, index, format = "carousel") {
  await Promise.all([
    document.fonts.load('400 52px "Studio Serif"'),
    document.fonts.load('400 22px "Studio Sans"'),
  ]);
  const c = node("canvas");
  c.width = 1080;
  c.height = format === "story" ? 1920 : 1350;
  const ctx = c.getContext("2d"),
    refs = content.photoRefs,
    ref = refs[index % refs.length],
    image = await workflowImage(ref, 2200),
    title = content.carousel?.[index]?.text || content.title;
  if (content.theme === "gallery") {
    ctx.fillStyle = "#242522";
    ctx.fillRect(0, 0, c.width, c.height);
    cover(ctx, image, 0, 100, 1080, c.height - 100);
    const g = ctx.createLinearGradient(0, c.height * 0.5, 0, c.height);
    g.addColorStop(0, "#141b1700");
    g.addColorStop(1, "#141b17ed");
    ctx.fillStyle = g;
    ctx.fillRect(0, c.height * 0.5, 1080, c.height * 0.5);
    ctx.fillStyle = "#fffaf0";
    ctx.font = '18px "Studio Sans",sans-serif';
    ctx.fillText("CHEONGINMARU / SPACE ARCHIVE", 60, 64);
    ctx.font = '52px "Studio Serif",serif';
    lines(ctx, title, 60, c.height - 265, 950, 76, 2);
    ctx.font = '22px "Studio Sans",sans-serif';
    lines(
      ctx,
      [content.region, Writer.label(content.product)]
        .filter(Boolean)
        .join(" / "),
      60,
      c.height - 65,
      940,
      34,
      2,
    );
    return c;
  }
  if (content.theme === "journal") {
    ctx.fillStyle = "#e8e2d6";
    ctx.fillRect(0, 0, c.width, c.height);
    cover(ctx, image, 0, 110, 820, c.height - 420);
    ctx.fillStyle = "#50483c";
    ctx.font = '18px "Studio Sans",sans-serif';
    ctx.fillText("CHEONGINMARU / MATERIAL JOURNAL", 60, 64);
    ctx.font = '52px "Studio Serif",serif';
    lines(ctx, title, 60, c.height - 220, 950, 76, 2);
    ctx.font = '20px "Studio Sans",sans-serif';
    lines(
      ctx,
      index === 1
        ? [content.product.size, content.product.pack, content.product.coverage]
            .filter(Boolean)
            .join(" / ")
        : Writer.SLOGAN,
      60,
      c.height - 55,
      950,
      32,
      2,
    );
    return c;
  }
  ctx.fillStyle = "#f5f1e8";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = "#37342f";
  ctx.font = '18px "Studio Sans",sans-serif';
  ctx.fillText("CHEONGINMARU / SPACE ARCHIVE", 60, 64);
  ctx.fillText(String(index + 1).padStart(2, "0"), 960, 64);
  ctx.font = '52px "Studio Serif",serif';
  lines(ctx, title, 60, 170, 950, 74, 2);
  cover(ctx, image, 60, 340, 960, c.height - 570);
  ctx.fillStyle = "#37342f";
  ctx.font = '21px "Studio Sans",sans-serif';
  const footer =
    index === 1
      ? [content.product.size, content.product.pack, content.product.coverage]
          .filter(Boolean)
          .join(" / ")
      : [content.region, Writer.label(content.product)]
          .filter(Boolean)
          .join(" / ");
  lines(ctx, footer, 60, c.height - 125, 950, 34, 2);
  ctx.font = '20px "Studio Serif",serif';
  ctx.fillText(Writer.SLOGAN, 60, c.height - 48);
  return c;
}
function escapeHTML(v) {
  return String(v).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
async function cacheGeneratedImages(job, files, content, revision) {
  const images = [];
  for (const file of files.filter((f) => f.blob.type === "image/png")) {
    const src = await new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = reject;
      r.readAsDataURL(file.blob);
    });
    const key = await storePhoto(src, file.name);
    images.push({ key, name: file.name, size: file.blob.size });
  }
  if (images.length) {
    job.generatedVersions ??= [];
    job.generatedVersions.push({
      at: new Date().toISOString(),
      revision,
      content: structuredClone(content),
      renderer: "workflow-card-v1",
      files: images,
    });
    persist();
  }
}
async function exportJob(job) {
  const content = structuredClone(jobContent(job)),
    revision = job.revision || 1,
    project = state.projectIndex.find((p) => p.id === job.projectId);
  const publicRecord =
    job.channel === "website" ? Flow.publicCase(project, job) : null;
  progress("원고와 사진 파일을 준비합니다…");
  const files = [
    {
      name: "원고.txt",
      blob: new Blob([content.title + "\n\n" + content.body], {
        type: "text/plain;charset=utf-8",
      }),
    },
  ];
  if (job.channel === "instagram") {
    const count = content.carousel?.length || 5;
    for (let i = 0; i < count; i++)
      files.push({
        name: `carousel-${i + 1}.png`,
        blob: await canvasBlob(await workflowCard(content, i)),
      });
    files.push(
      {
        name: "story.png",
        blob: await canvasBlob(
          await workflowCard(
            {
              ...content,
              carousel: [{ text: content.story || content.title }],
            },
            0,
            "story",
          ),
        ),
      },
      {
        name: "reel-cover.png",
        blob: await canvasBlob(await workflowCard(content, 0, "story")),
      },
      {
        name: "릴스대본.txt",
        blob: new Blob([content.hook + "\n\n" + content.script], {
          type: "text/plain;charset=utf-8",
        }),
      },
    );
  } else {
    for (let i = 0; i < content.photoRefs.length; i++)
      files.push({
        name: `images/scene-${String(i + 1).padStart(2, "0")}.png`,
        blob: await canvasBlob(await workflowImage(content.photoRefs[i], 2200)),
      });
  }
  if (job.channel === "website") {
    const record = publicRecord;
    const related = state.channelJobs
      .filter(
        (j) =>
          j.channel === "website" &&
          j.projectId !== job.projectId &&
          j.approved &&
          j.approved.product.category === content.product.category &&
          j.publishedUrl &&
          ["게시 완료", "성과 분석"].includes(j.status),
      )
      .slice(0, 3);
    const html = `<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHTML(record.title)}</title><style>body{max-width:960px;margin:50px auto;padding:24px;background:#f6f3ed;color:#333;font:16px/1.9 system-ui}h1{font:36px/1.6 serif}img{width:100%;height:auto}p{white-space:pre-line}a{color:inherit}</style><main><p>청인마루 / ${escapeHTML(record.projectNumber)}</p><h1>${escapeHTML(record.title)}</h1><img src="images/scene-01.png" alt="승인된 현장 시공 사진"><p>${escapeHTML(record.body)}</p>${related.length ? "<h2>관련 시공 사례</h2>" + related.map((j) => '<p><a href="' + escapeHTML(safeUrl(j.publishedUrl)) + '">' + escapeHTML(j.approved.title) + "</a></p>").join("") : ""}</main></html>`;
    files.push(
      {
        name: "case.html",
        blob: new Blob([html], { type: "text/html;charset=utf-8" }),
      },
      {
        name: "manifest.json",
        blob: new Blob([JSON.stringify(record, null, 2)], {
          type: "application/json",
        }),
      },
    );
  }
  let storageWarning = "";
  try {
    await cacheGeneratedImages(job, files, content, revision);
  } catch (e) {
    storageWarning =
      " 생성 이미지 보관에 실패했습니다. 다운로드 파일을 별도로 보관하세요.";
  }
  download(
    await storedZip(files),
    `청인마루_${Flow.CHANNELS[job.channel]}_자료.zip`,
  );
  progress(
    "파일을 준비했습니다. 외부 플랫폼에 게시하지 않았습니다." + storageWarning,
    !!storageWarning,
  );
}
let workflowVideoBusy = false;
async function exportJobVideo(job) {
  if (workflowVideoBusy) throw Error("영상 출력이 진행 중입니다.");
  const type = ["video/mp4;codecs=avc1.42001E", "video/mp4"].find(
    (t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t),
  );
  if (!type)
    throw Error(
      "이 브라우저는 MP4 출력을 지원하지 않습니다. 최신 Chrome/Safari에서 시도하세요.",
    );
  workflowVideoBusy = true;
  let stream, recorder;
  try {
    const content = jobContent(job),
      count = content.carousel?.length || 5,
      frames = [];
    for (let i = 0; i < Math.min(5, count); i++)
      frames.push(await workflowCard(content, i, "story"));
    const c = node("canvas");
    c.width = 1080;
    c.height = 1920;
    const ctx = c.getContext("2d");
    ctx.drawImage(frames[0], 0, 0);
    stream = c.captureStream(30);
    recorder = new MediaRecorder(stream, {
      mimeType: type,
      videoBitsPerSecond: 8000000,
    });
    const chunks = [],
      done = new Promise((resolve, reject) => {
        recorder.ondataavailable = (e) => {
          if (e.data.size) chunks.push(e.data);
        };
        recorder.onstop = () =>
          resolve(new Blob(chunks, { type: "video/mp4" }));
        recorder.onerror = () => reject(Error("영상 인코딩 실패"));
      });
    recorder.start(250);
    const started = performance.now(),
      duration = 15000;
    await new Promise((resolve, reject) => {
      const draw = () => {
        if (document.hidden)
          return reject(Error("영상 출력 중에는 이 탭을 열어 두세요."));
        const elapsed = performance.now() - started,
          index = Math.min(
            frames.length - 1,
            Math.floor(elapsed / (duration / frames.length)),
          );
        ctx.drawImage(frames[index], 0, 0);
        progress(
          `현장 릴스 MP4 만드는 중 ${Math.min(100, Math.round((elapsed / duration) * 100))}%`,
        );
        if (elapsed >= duration) resolve();
        else requestAnimationFrame(draw);
      };
      draw();
    });
    recorder.stop();
    const blob = await done;
    if (blob.size < 1000) throw Error("영상 데이터가 부족합니다.");
    download(blob, "청인마루_현장릴스.mp4");
    progress("1080×1920 MP4를 준비했습니다. 음악은 포함하지 않습니다.");
  } finally {
    if (recorder && recorder.state !== "inactive") recorder.stop();
    stream?.getTracks().forEach((t) => t.stop());
    workflowVideoBusy = false;
  }
}
