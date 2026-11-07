/* Site-centered workflow. Pure data rules, no external publishing or credentials. */
(function (root, factory) {
  if (typeof module === "object" && module.exports)
    module.exports = factory(require("./content-engine.js"));
  else root.MarketingWorkflow = factory(root.CheonginContent);
})(typeof globalThis !== "undefined" ? globalThis : this, function (Writer) {
  "use strict";
  const CHANNELS = {
    instagram: "인스타그램",
    naver: "네이버 블로그",
    website: "홈페이지",
    kakao: "카카오채널",
  };
  const STATES = [
    "초안",
    "검토",
    "승인",
    "게시 예정",
    "게시 완료",
    "성과 분석",
  ];
  function projectNumber(id, date) {
    return (
      "CM-" +
      date.replaceAll("-", "") +
      "-" +
      id.replaceAll("-", "").slice(-6).toUpperCase()
    );
  }
  function drafts(project, draft, assets, question = "") {
    const p = Writer.normalProduct(draft.product),
      name = Writer.label(p),
      facts = Writer.facts(p).join("\n"),
      context = [project.region, project.space].filter(Boolean).join(" · "),
      works = draft.works?.length
        ? `확인한 작업: ${draft.works.join(" · ")}`
        : "",
      site = project.title || project.number,
      photos = assets.map(
        (a, i) =>
          `사진 ${i + 1}: ${i === 0 ? "현장 대표 사진" : "현장 디테일 " + i}`,
      ),
      common = {
        product: p,
        series: draft.series || "",
        copyVersion: draft.copyVersion || 1,
        photoRefs: assets,
        mode: draft.mode,
        theme: project.theme || "editorial",
        site: site,
        region: project.region || "",
        space: project.space || "",
        works: draft.works || [],
      };
    const bodyByChannel = {
      instagram: {
        title: draft.titles[draft.selectedTitle],
        body: draft.caption + "\n\n" + draft.hashtags,
        hook: draft.hook,
        script: draft.script,
        story: draft.story,
        carousel: draft.carousel,
        photoOrder: photos,
        format: "캐러셀 · 릴스 · 스토리",
      },
      naver: {
        title: [project.region, name, "시공 기록"].filter(Boolean).join(" "),
        body: [
          `${site}${context ? " / " + context : ""}`,
          draft.blog,
          "사진 배치 순서",
          ...photos,
        ]
          .filter(Boolean)
          .join("\n\n"),
        photoOrder: photos,
        format: "검색형 원고 · 사진 순서",
      },
      website: {
        title: site + " | " + name,
        body: [
          site,
          context,
          "사용 제품\n" + name,
          facts,
          works,
          project.memo && "현장 기록\n" + project.memo,
          "시공 상담\n" + draft.comment,
          Writer.SLOGAN,
        ]
          .filter(Boolean)
          .join("\n\n"),
        hero: assets[0]?.key || "",
        format: "시공 사례 상세 · 대표 이미지",
      },
      kakao: {
        title: site + " 시공 사례 안내",
        body: [
          draft.kakao,
          question
            ? `고객 질문: ${question}\n답변 초안: 제품별 모델·규격과 현장 조건을 확인해 안내하겠습니다. 구체적인 성능은 확인된 자료를 기준으로 설명합니다.`
            : `상담 전 자주 묻는 질문\nQ. 어떤 자료를 준비하면 좋을까요?\nA. 현장 사진, 시공 지역, 원하는 소재와 일정을 알려주세요.`,
          works,
        ]
          .filter(Boolean)
          .join("\n\n"),
        mascotRecommendation: question
          ? "마루니·루루 정보형 카드 추천: " + question
          : "",
        format: "사례 소개 · 상담 Q&A",
      },
    };
    return Object.keys(CHANNELS).map((channel) => ({
      channel,
      ...common,
      ...bodyByChannel[channel],
    }));
  }
  function canTransition(job, next, hasMetrics = false) {
    const i = STATES.indexOf(job.status),
      n = STATES.indexOf(next);
    if (i < 0 || n < 0) return false;
    if (job.status === "검토" && next === "초안") return true;
    if (n !== i + 1) return false;
    if (
      next === "검토" &&
      (!job.draft?.title.trim() ||
        !job.draft?.body.trim() ||
        !job.draft?.photoRefs?.length)
    )
      return false;
    if (
      next === "게시 예정" &&
      (!job.approved || !/^\d{4}-\d{2}-\d{2}$/.test(job.scheduledDate || ""))
    )
      return false;
    if (next === "성과 분석" && !hasMetrics) return false;
    return true;
  }
  function monthlyFollowerDelta(records, month) {
    const sorted = records
        .filter(
          (r) => typeof r.date === "string" && Number.isFinite(r.followers),
        )
        .sort((a, b) => a.date.localeCompare(b.date)),
      now = sorted.filter((r) => r.date.startsWith(month));
    if (!now.length) return null;
    const before = sorted.filter((r) => r.date < month + "-01").at(-1),
      first = before || now[0],
      last = now.at(-1);
    if (first === last) return null;
    return {
      delta: last.followers - first.followers,
      from: first.date,
      to: last.date,
    };
  }
  function dashboard(state, today) {
    const jobs = state.channelJobs || [],
      month = today.slice(0, 7),
      linked = new Set(jobs.map((j) => j.postId).filter(Boolean)),
      legacy = (state.posts || []).filter((p) => !linked.has(p.id));
    return {
      draft: jobs.filter((j) => j.status === "초안").length,
      review: jobs.filter((j) => j.status === "검토").length,
      approved: jobs.filter((j) => j.status === "승인").length,
      scheduled:
        jobs.filter((j) => j.status === "게시 예정").length +
        legacy.filter((p) => p.status === "게시 준비").length,
      published:
        jobs.filter((j) => ["게시 완료", "성과 분석"].includes(j.status))
          .length + legacy.filter((p) => p.status === "게시 완료").length,
      due: jobs.filter(
        (j) => j.status === "게시 예정" && j.scheduledDate <= today,
      ),
      legacyDue: legacy.filter(
        (p) => p.status === "게시 준비" && p.date <= today,
      ),
      needsMetrics: jobs.filter((j) => j.status === "게시 완료"),
      followers: monthlyFollowerDelta(state.records || [], month),
      newLeads: (state.leads || []).filter((l) =>
        (l.date || "").startsWith(month),
      ).length,
      quotes: (state.leads || []).filter((l) => l.stage === "견적").length,
      contracts: (state.leads || []).filter((l) => l.stage === "계약").length,
    };
  }
  function validate(s) {
    if (s.workflowVersion === undefined) return s;
    if (
      s.workflowVersion !== 1 ||
      !Array.isArray(s.channelJobs) ||
      s.channelJobs.length > 10000 ||
      !Array.isArray(s.projectIndex) ||
      s.projectIndex.length > 1000
    )
      throw Error("현장 업무 데이터 형식 오류");
    for (const p of s.projectIndex)
      if (
        typeof p.id !== "string" ||
        typeof p.number !== "string" ||
        typeof p.title !== "string"
      )
        throw Error("현장 목록 형식 오류");
    for (const j of s.channelJobs) {
      if (
        typeof j.id !== "string" ||
        typeof j.projectId !== "string" ||
        !Object.hasOwn(CHANNELS, j.channel) ||
        !STATES.includes(j.status) ||
        !j.draft ||
        typeof j.draft.title !== "string" ||
        typeof j.draft.body !== "string" ||
        !Array.isArray(j.versions)
      )
        throw Error("채널 작업 형식 오류");
      if (
        j.generatedVersions !== undefined &&
        (!Array.isArray(j.generatedVersions) ||
          j.generatedVersions.some(
            (v) =>
              !Array.isArray(v.files) ||
              v.files.some(
                (f) =>
                  typeof f.name !== "string" ||
                  typeof f.key !== "string" ||
                  !f.key.startsWith("wf-photo:"),
              ),
          ))
      )
        throw Error("생성 이미지 버전 형식 오류");
      for (const d of [
        j.draft,
        j.approved,
        j.pendingDraft,
        ...j.versions.map((v) => v.content),
        ...(j.generatedVersions || []).map((v) => v.content),
      ].filter(Boolean)) {
        if (
          typeof d.title !== "string" ||
          typeof d.body !== "string" ||
          !Array.isArray(d.photoRefs) ||
          d.photoRefs.some(
            (a) => typeof a.key !== "string" || !a.key.startsWith("wf-photo:"),
          )
        )
          throw Error("채널 버전/사진 참조 형식 오류");
        Writer.normalProduct(d.product);
      }
    }
    return s;
  }
  function publicCase(project, job) {
    if (
      !job.approved ||
      !["승인", "게시 예정", "게시 완료", "성과 분석"].includes(job.status)
    )
      throw Error("승인된 홈페이지 원고만 내보낼 수 있습니다.");
    return {
      schema: "cheonginmaru.public-case.v1",
      projectNumber: project.number,
      title: job.approved.title,
      body: job.approved.body,
      region: job.approved.region,
      space: job.approved.space,
      product: Object.fromEntries(
        [
          "type",
          "category",
          "brand",
          "model",
          "size",
          "color",
          "material",
          "pack",
          "coverage",
        ].map((k) => [k, job.approved.product[k] || ""]),
      ),
      generatedAt: new Date().toISOString(),
    };
  }
  return {
    CHANNELS,
    STATES,
    projectNumber,
    drafts,
    canTransition,
    dashboard,
    monthlyFollowerDelta,
    validate,
    publicCase,
  };
});
