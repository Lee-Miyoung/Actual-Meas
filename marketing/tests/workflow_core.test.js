const test = require("node:test"),
  assert = require("node:assert/strict"),
  Flow = require("../workflow-core.js"),
  Writer = require("../content-engine.js");
const product = {
    id: "wall-a",
    type: "wall",
    category: "벽장재",
    brand: "테스트",
    model: "벽 모델",
    size: "600×1200",
    features: "미확인 방수",
    verified: false,
  },
  source = Writer.create({
    product,
    mode: "editorial",
    count: 5,
    photoCount: 1,
  }),
  project = {
    id: "p1",
    number: "CM-TEST-001",
    title: "테스트 현장",
    region: "서울 성동구",
    space: "거실",
    memo: "",
  },
  assets = [{ key: "wf-photo:abc", adjust: {}, focus: { x: 0.5, y: 0.5 } }];
test("one site prepares four distinct factual channel drafts", () => {
  const all = Flow.drafts(project, source, assets);
  assert.equal(all.length, 4);
  assert.equal(new Set(all.map((d) => d.channel)).size, 4);
  assert.equal(new Set(all.map((d) => d.body)).size, 4);
  for (const d of all) {
    assert(!d.body.includes("미확인 방수"));
    assert(!d.body.includes("철거"));
    assert.equal(d.product.model, "벽 모델");
  }
  assert(
    all.find((d) => d.channel === "naver").body.includes("사진 배치 순서"),
  );
  assert.equal(all.find((d) => d.channel === "kakao").mascotRecommendation, "");
  assert(
    Flow.drafts(project, source, assets, "줄눈은 어떻게 관리하나요?").find(
      (d) => d.channel === "kakao",
    ).mascotRecommendation,
  );
});
test("state progression requires review, approval, schedule and actual measurements", () => {
  const j = { status: "초안", draft: Flow.drafts(project, source, assets)[0] };
  assert(!Flow.canTransition(j, "승인"));
  assert(Flow.canTransition(j, "검토"));
  j.status = "검토";
  assert(Flow.canTransition(j, "초안"));
  assert(Flow.canTransition(j, "승인"));
  j.status = "승인";
  assert(!Flow.canTransition(j, "게시 예정"));
  j.approved = structuredClone(j.draft);
  j.scheduledDate = "2026-11-06";
  assert(Flow.canTransition(j, "게시 예정"));
  j.status = "게시 완료";
  assert(!Flow.canTransition(j, "성과 분석"));
  assert(Flow.canTransition(j, "성과 분석", true));
});
test("dashboard does not invent follower changes and includes existing schedules", () => {
  const s = {
    channelJobs: [],
    posts: [{ id: "old", status: "게시 준비" }],
    records: [],
    leads: [],
  };
  assert.equal(Flow.dashboard(s, "2026-11-05").followers, null);
  assert.equal(Flow.dashboard(s, "2026-11-05").scheduled, 1);
  s.records = [{ date: "2026-11-01", followers: 1500 }];
  assert.equal(Flow.dashboard(s, "2026-11-05").followers, null);
  s.records.push({ date: "2026-11-05", followers: 1508 });
  assert.equal(Flow.dashboard(s, "2026-11-05").followers.delta, 8);
});
test("approved public case omits private metadata and keys", () => {
  const job = {
    status: "초안",
    draft: Flow.drafts(project, source, assets)[2],
  };
  assert.throws(() => Flow.publicCase(project, job));
  job.status = "승인";
  job.approved = {
    ...job.draft,
    product: {
      ...job.draft.product,
      price: 1234,
      source: "private source",
      note: "internal",
    },
    customer: "private",
    token: "secret",
  };
  const data = Flow.publicCase(project, job);
  assert(!Object.hasOwn(data.product, "price"));
  assert(!Object.hasOwn(data.product, "source"));
  assert(!Object.hasOwn(data, "token"));
  assert(!JSON.stringify(data).includes("private source"));
});
