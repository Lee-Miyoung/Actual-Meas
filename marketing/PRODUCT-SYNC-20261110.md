# 제품 정보 연동 · 2026-11-10

## 구현과 현재 연결 상태

마루견적의 `buildMasterData()`, `fetchAndCacheSheet()`, `loadSheetData()`와 기존 Worker를 분석했다. 기존 Google Apps Script 시트 주소와 시트 형식은 변경하지 않는다.

마루견적 `_worker.js`에 `/api/marketing-products`를 추가했다. 서버 내부에서 기존 시트를 읽고 `brand`, `name`, `model`, `spec`, `category`만 새 객체에 담아 반환한다. 원본 응답·가격 필드·고객정보는 캐시나 로그에 저장하지 않는다. CORS는 마케팅 GitHub Pages 출처만 허용하고, GET/OPTIONS만 제공한다. 공개되는 것은 제품 메타정보뿐이다. 기존 견적 인증과 계산 HTML은 변경하지 않았다.

**실제 견적 프로그램의 배포 주소가 아직 확인되지 않아 실제 시트 제품 동기화는 미검증·미연결이다.** 빈 피드를 성공한 연동처럼 표시하지 않는다. 마루견적 GitHub main에는 전용 경로 구현을 반영했으나 Cloudflare 자동 배포 완료 여부는 주소 확인 후 검사해야 한다.

연결 방법:

1. 견적 사이트에서 `/api/marketing-products`가 JSON을 반환하는지 확인한다. Worker를 지원하는 기존 Cloudflare Pages 배포가 필요하다.
2. 마케팅의 `03 제품 도감 → 견적 서버 연결 설정`에 견적 사이트의 HTTPS 주소를 입력한다. 앱이 제품 전용 경로를 사용한다. 비밀번호·키·원본 시트 주소를 입력하지 않는다.
3. 전체 기기의 기본 연결과 정적 정상 피드 배포에는 `marketing/data/product-source.json`의 `endpoint`를 해당 HTTPS `/api/marketing-products` 주소로 설정한다. GitHub Actions의 Marketing product-only feed를 실행하면 검증된 피드만 저장한다. 별도 유료 서비스나 API 키는 필요하지 않다.

## 저장 및 동기화 정책

- 브라우저는 가격이 든 원본 시트 JSON을 요청하지 않는다. 전용 서버 응답과 안전한 정적 피드만 수신한다. 추가 필드가 섞인 응답은 거부한다.
- 브랜드·제품군 기준으로 모델을 묶고 실제 모델별 규격을 유지한다. 벽장재를 별도로 분류한다. 같은 모델의 규격이 서로 다르면 반영하지 않고 충돌로 표시한다.
- 수동 등록 항목은 삭제하지 않는다. 기존 제품의 모델·규격 변경은 사용자 확인 후 병합한다. 기존 확인된 특징·자료 출처·제품 ID를 유지한다.
- 프로젝트와 승인 콘텐츠의 제품 스냅샷은 동기화로 바꾸지 않는다. 새 현장/사진에서는 도감의 모델 선택을 통해 실제 정보를 적용한다. 여러 자재 연결은 기존 사진별 제품 지정 기능을 사용한다.
- 마지막 정상 자료, 마지막 동기화일, 충돌 목록과 주기를 기존 프로젝트 설정에 저장하고 전체 백업에 포함한다. 실패하면 기존 도감과 정상 자료를 보존한다.
- 앱이 열려 있을 때 직접/6시간/24시간 확인한다. 서버 정적 피드는 GitHub Actions에서 6시간마다 갱신 가능하다. 연결 주소 미설정 상태의 서버 작업은 이전 피드를 유지하고 설정 대기 상태로 종료한다.

## 검증

| 검사 | 결과 |
|---|---|
| 순수 함수·기존 콘텐츠 로직 회귀 | 47 PASS |
| 제품 전용 Worker: 정확한 5개 필드, 비공개 값 제외, 기존 로그인 유지, POST 거부 | PASS (모의 시트 응답) |
| PC·iPad 크기: 불러오기, 검색, 바닥재/벽장재 | PASS (모의 제품 전용 응답) |
| 규격 변경 충돌·명시적 병합·기존 승인 제품 불변 | PASS |
| 서버 실패 시 마지막 정상 도감 유지 | PASS |
| 전체 JSON 백업·복원, 동기화 설정 및 제품 복구 | PASS |
| 원본 Google/견적 소스 브라우저 요청 없음 | PASS |
| 기존 실측 루트 파일·로고·캐릭터 해시 | 변경 없음 |
| 기존 실측 화면 HTTP 200·11개 버튼·초기 JS 오류 없음 | PASS |
| WebKitGTK: iPad/iPhone 크기, 회전, PNG, H264 MP4, 원본 바이트 보존 | PASS |
| 실제 iPad Safari 기기 | 미검증 |
| 실제 견적 서버·Google 시트 연결 | 주소 미확인으로 미검증 |

화면·백업 테스트 산출물은 `/workspace/product-feed-review/`에 있다. 테스트 파일은 `marketing/tests/product_feed_browser.py`, `product_feed.test.cjs`, `product_feed_client.test.cjs`에 있다.

## 관련 사진 디자인 작업

신규 프로젝트에 사진 중심 시그니처 v2 렌더러와 크롭·초점·로고·오버레이 토큰을 적용했다. 기존 v1 렌더러는 유지하고 버전을 고정한다. 90개 플랫폼/스타일/페이지 배치 검사와 설정/프로젝트 백업 복원이 통과했다. 참고·테스트 사진을 실제 청인마루 시공 사례로 주장하지 않는다.

## 변경 파일과 복구

제품: `product-feed-core.js`, `product-feed.js`, `data/product-source.json`, `data/products.json`, `server/project-products.cjs`, `office.js`, `index.html`, `signature.css`, 제품 테스트 및 `.github/workflows/marketing-products.yml`.

디자인: `signature-core.js`, `signature-photo-v2.js`, `signature-studio.js` 및 관련 디자인 테스트. 원본 `signature-render.js`는 유지했다.

Actual-Meas 백업: `backup/before-photo-signature-v2-20261110`.
마루견적 백업: `backup/before-product-endpoint-20261110`.
문제 시 각 저장소의 해당 백업에서 변경 대상 파일만 복구하고 main에 커밋한다. Actual-Meas는 `marketing/`와 제품 동기화 워크플로만 복구하고 루트 실측 파일은 건드리지 않는다. maru_calc는 `_worker.js`만 복구한다. 데이터가 필요한 경우 앱의 전체 백업 JSON으로 복원한다. 코드 복구만으로 브라우저 저장 데이터가 삭제되지는 않는다.
