# 터치 기기와 공통 편집 디자인 · 2026-11-06

## 읽고 확인한 해외 자료

| 자료 | 확인 범위 | 반영 |
| --- | --- | --- |
| [스위스 연방 디자인 시스템](https://github.com/swiss/designsystem) | 현재 README. 이전 swiss/styleguide README는 구버전임을 확인하고 현재 저장소로 이동 | 개별 화면 장식보다 공통 디자인 체계와 일관된 위계 |
| [일본 디지털청 Button 소스](https://github.com/digital-go-jp/design-system-example-components/blob/main/src/components/Button/Button.tsx) | 원문 React 코드. 중간 버튼 높이 48px, 작은 버튼의 44px 터치 영역, 명확한 포커스 | 모바일 입력 16px, 44–48px 조작 영역, 포커스 표시 |
| [Astro 해외 포트폴리오 예제](https://github.com/withastro/astro/blob/main/examples/portfolio/src/styles/global.css) | 실제 CSS의 공통 색·타입·간격 토큰 | 종이색·잉크색·강조색과 서체를 공유하는 UI/출력 체계 |
| [Interior Home Design](https://github.com/RafaelGoulartB/interior-design-website) | README, 포르투갈어 README, 실제 화면 이미지, header/our-projects 소스 | 큰 공간 사진과 일정한 사진 그리드. 주황색 광고형 장식·홍보 문구는 채택하지 않음 |

덴마크 Norm Architects의 실사이트 접근은 환경 네트워크 정책으로 차단됐다. 라이브 사이트를 열어 분석했다고 주장하지 않는다. 일본 디지털청 자료는 조작·접근성 참고 자료이지 건축 화보 사례가 아니다. 검수에 사용한 외부 실내 사진은 앱·공개 저장소에 넣지 않았으며 청인마루의 시공 사례·제품 적용 실적이 아니다.

## 결과와 동작

- `platform-design.js`: 공통 서체·종이색·72px 기준선·로고·제품 정보 위치. 공간 화보/갤러리/소재 저널 3안은 같은 사진과 순서로 비교. 실시간 비교는 축소 캔버스 3장만 유지한다.
- 플랫폼마다 형식을 유지: 피드 1080×1350, 스토리·릴스·쇼츠 1080×1920, 카카오 800×800, 블로그 대표 1200×1200, 유튜브 표지 1280×720. 네이버 본문은 원본 비율. 스토리 주요 문구는 상·하단 및 오른쪽 UI 영역을 피한다.
- 한국어 실제 문구를 지정해 폰트를 로드한 뒤 출력한다. 긴 문구는 정해진 영역에서 글자 크기를 조절하고 초과 시 말줄임을 표시한다. 전체 원고는 보존한다.
- 수동 제품명을 기존 선택 제품과 다르게 바꾸면 이전 브랜드·규격을 임의로 이어 붙이지 않는다.
- iPad 세로·가로 모두 1180px 이하에서 상단 메뉴를 사용한다. 사진을 불러오면 안내를 줄여 편집 화면을 확보한다. 마지막 메뉴는 앱 전용 sessionStorage 키로 복원한다.
- 원본 바이트는 그대로 유지. 작업용 이미지 최대 1800px·캐시 2장, 썸네일 240px. 출력/미리보기 교체 시 불필요한 캔버스를 해제한다. 원본 PNG 내보내기는 기존 고해상도 경로를 유지한다.
- Apple 터치 기기는 비동기 생성 직후 자동 다운로드 대신 저장 창을 표시한다. 새 탭이나 팝업 없이 파일을 준비한 뒤 실제 사용자 탭으로 `navigator.share`를 호출한다. 공유를 지원하지 않으면 사진별 링크·길게 눌러 저장·ZIP 저장을 제공한다. 사진 앱에 저장됐다고 임의 표시하지 않는다. 동영상도 지원되는 경우 공유할 수 있다.
- ZIP `deflate-raw`가 없는 Safari에서 로컬 fflate 0.8.2로 해제. 라이선스 `vendor/fflate-LICENSE`. 크기·CRC 검사는 동일하게 유지. 네트워크 전송 없음.
- HEIC/HEIF 선택 허용. 브라우저가 원본을 해독할 수 있을 때만 처리한다. 미지원 시 기존 작업을 보존하고 JPG 변환 경로를 안내한다. HEIC 전용 외부 변환 서비스는 연결하지 않았다.
- 동영상은 WebCodecs H.264 level 4.0으로 각 프레임에 정확한 24fps 타임스탬프를 부여하고, 로컬 mp4-muxer 5.2.2로 단일 MP4를 만든다. MediaRecorder의 조각 MP4에서 실제 디코딩 오류가 확인되어 이 경로를 교체했다. 6프레임 단위로 인코더 큐를 비워 메모리를 제한한다. 코덱 정보뿐 아니라 전체 프레임 디코딩도 검증한다. 중단·화면 이탈 시 인코더·캔버스를 정리한다. 라이선스는 `vendor/mp4-muxer-LICENSE`.
- MP4는 `VideoEncoder`/`VideoFrame` 및 H.264 지원이 필요하다. 미지원 Safari에서는 MP4 버튼에 최신 버전 필요를 표시하고 PNG/ZIP 저장을 제공한다. 서버 업로드·영상 변환 API 비용·계정은 필요하지 않다. 구형 iOS의 모든 브라우저에서 영상 출력을 보장하지 않는다.
- 일반 사진의 콘텐츠 초안이 전후 시공을 임의 주장하지 않도록 수정했다. 전후형 초안은 비교 사진을 지정한 경우만 제공한다.

## 검증과 한계

`tests/apple_browser.py`: Chromium의 iPhone/iPad 터치 환경. 원본 4032×3024 10장·캐시·3안·PNG/ZIP·압축 해제 대체 경로·편집/새로고침·페이지 넘침 검사. OS 공유 API는 테스트 대역으로 파일 개수·형식·실제 Blob을 검증하며 실제 사진 앱 테스트로 표현하지 않는다.

`tests/webkit_browser.py`: 실제 WebKitGTK 2.52.6. iOS user-agent와 화면 크기를 적용해 실행한다. 업로드, 3안, 한글 PNG, 저장 창, IndexedDB 원본 보존·문구 복원, 세로·가로 화면, 선택적 실제 MP4 출력을 검증한다. WebKitGTK는 Safari와 엔진 계열을 공유하지만 실제 iPhone/iPad 하드웨어·OS의 사진 앱은 아니다.

`tests/workflow_browser.py`: 기존 프로젝트·4개 채널·독립 원고/승인본·일정·백업/복원·실제 H.264 MP4 및 PNG ZIP 회귀 검증. Node 테스트는 제품 사실·ZIP 무결성·업무 규칙을 검증한다.

최초 Playwright WebKit 다운로드와 공식 컨테이너 레이어가 정책에 차단되어, 허용된 Debian 저장소에서 /tmp에 추출한 WebKitGTK를 사용했다. 테스트용 설치의 실행 경로를 재배치했으며 앱에는 이 도구나 변경된 바이너리가 포함되지 않는다. 공개 Pages 주소 직접 접속은 환경 네트워크 정책으로 제한되어 GitHub Pages 배포 작업 상태와 동일 커밋의 로컬 실행을 구분한다.

## 복구

배포 전 백업 브랜치 `backup/before-apple-editorial-20261106`에서 `marketing/`만 복원한 새 커밋을 main에 반영한다. 원본 IndexedDB 버전과 저장 키는 변경하지 않는다. 기기 데이터·실측 파일을 초기화하지 않는다. 배포는 GitHub Pages의 기존 main 브랜치 경로를 따른다.

### 이 변경의 검증 결과

| 검사 | 결과 |
| --- | --- |
| 제품 사실·업무 규칙·ZIP 무결성 Node 21개 항목 | PASS |
| iPhone/iPad 크기: 사진 원본 10장, 캐시 2장, 디자인 3안, 사진 PNG/ZIP, 압축 해제 대체 경로, 문구 복원, 화면 넘침 | PASS |
| 실제 WebKitGTK: 업로드, 한글 PNG 5규격, 3안, 저장 창, 원본·문구 IndexedDB 복원, 세로·가로 | PASS |
| H.264 MP4 1080×1920: WebKit 9초 / Chromium 15초, 실제 전체 프레임 디코딩 | PASS |
| 프로젝트 → 4채널 → 수정·승인본·일정·백업/복원 | PASS |
| 루트 index.html/icon.jpg/maruni.png/ruru.png 해시 비교 | 변경 없음 |
| 물리 iPhone/iPad 사진 앱·OS 공유 창 | 이 환경에서 직접 검증 불가 |

실제 원본·생성 파일·고객 데이터는 공개 저장소에 커밋하지 않았습니다. 검수 화면과 결과 JSON은 작업 환경의 `/workspace/apple-design-evidence`, `/workspace/apple-touch-evidence`, `/workspace/apple-webkit-evidence`, `/workspace/apple-workflow-evidence`에 별도 보관합니다.
