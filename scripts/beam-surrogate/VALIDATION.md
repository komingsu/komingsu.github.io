# 실행 및 검증 기록

2026-09-21, `komingsu/komingsu.github.io`의 Astro 사이트에 이식하고 검증했다. 기준 커밋은 `662a609a4075e20e8957091a61755588f7c28370`이다. Linux x86_64 / Python 3.12.3 / CPU / Node 24.19.0에서 실행했다. 아래 숫자는 `public/data/beam-surrogate/results.json`과 CSV에서 확인할 수 있다.

## 이식 내용

- 한국어 글을 `src/content/posts/ko/beam-surrogate-design-space.mdx`로 옮기고 기존 메타데이터 스키마, Figure/Interactive/Callout/Cite, KaTeX 수식, 참고문헌 형식을 적용했다.
- Liquid 데이터 삽입은 실행 결과 JSON을 읽는 MDX 표현식으로 바꿨다. 브라우저 시각화는 기존 React island 방식과 사이트 색상 체계를 사용한다.
- 데이터는 `public/data`, 정적 대체 지도는 `public/images`, 본문 그림은 Astro 이미지 최적화를 받는 `src/assets`에 둔다. 재현 코드는 `scripts/beam-surrogate`에 있다.
- 새 글의 표는 기존 `table-wrap`을 사용한다. 320px 화면에서 상단 메뉴가 넘치지 않도록 `global.css`에 480px 이하 메뉴 줄바꿈 규칙을 추가했다. 한국어·영어 홈에서도 확인했다.
- 웹 의존성을 추가하거나 package.json/package-lock.json을 변경하지 않았다.
- 기존 샘플 포스트 7개(한국어 6개·영어 1개)를 삭제하고 새 실습 글만 남겼다. README의 작성 예시는 새 글과 재현 코드로 연결했다.

## 실제 실험 결과

- 학습/검증/테스트: 180/60/60. 별도 탐색 격자: 3,721개, 질량 제한 충족 1,087개.
- 검증 MAPE로 선택한 RBF KernelRidge: alpha=1e-6, gamma=0.1.
- 테스트 MAE 0.0023150921 mm, RMSE 0.0104963934 mm, MAPE 0.1291641828%, R² 0.9998212488, Spearman 1.0.
- 격자 최대 상대오차 5.5998306632%: 폭 10 mm / 높이 10 mm.
- 제약을 만족하는 후보의 Spearman 0.9999826404, 예측/정답 상위 20 교집합 19개.
- 예측으로 선택한 후보: 폭 10 mm / 높이 40 mm, 질량 0.540 kg. 예측 처짐 0.1112167465 mm, 재평가 정답 0.1116071429 mm.
- 기준 20×20 mm: 질량 0.540 kg, 정답 처짐 0.4464285714 mm. 같은 질량에서 처짐 75% 감소.
- 유한 격자에서 정답 최선 후보와 선택이 일치했다. 연속 공간 전체의 최적성 증명으로 해석하지 않는다.

## 통과한 검사

- 이식한 `experiment.py`를 실제 실행하여 CSV/JSON/PNG 전체를 생성했다.
- `/tmp/beam-astro-rerun`에 전체 파이프라인을 독립 재실행하고 `verify.py --root /tmp/beam-astro-rerun --compare-root .`로 게시용 수치 일치를 확인했다.
- `verify.py`: 물리 단위, 데이터 분할/격자 좌표 중복 방지, 학습 전용 표준화, 검증에 의한 모델 선택, 모델 재학습 예측 일치, 테스트/격자 지표, 후보 재평가, 제약, 해시와 브라우저 데이터 일치.
- 이식 전후 samples.csv/candidates.csv/shortlist.csv/results.json은 바이트 단위로 동일하다. 그림과 브라우저 색상만 새 사이트 체계에 맞췄다.
- `npm run check`: 40개 파일, 오류 0 / 경고 0 / 힌트 0.
- `npm run build`: 샘플 삭제 후 27개 페이지 빌드 성공. 본문 그림의 반응형 이미지, RSS와 사이트맵 생성 성공.
- `python scripts/beam-surrogate/check_site.py`: 27개 HTML의 로컬 링크·자원 593개 및 문서 내 앵커 확인. 수식 렌더링 오류 없음. 글의 핵심 수치·참고문헌 4개·글 목록/홈/카테고리/RSS/사이트맵 노출 확인.
- 게시글 원본과 빌드 결과에 한국어 글 1개·영어 글 0개만 남음을 확인했다. 삭제한 샘플 주소는 HTML 링크·RSS·사이트맵에도 없다. 한국어 RSS의 항목 1개, 영어 RSS의 항목 0개 및 영어 홈/글 목록의 빈 상태 표시를 확인했다.
- `git diff --check`: 통과.
- Playwright 1.55.0 / 해당 버전 Chromium으로 실제 빌드된 `/posts/beam-surrogate-design-space/` 검사: **1440×1100, 390×844, 320×740**에서 통과.
- 지도 클릭/모바일 탭, 비교 버튼 세 개, 슬라이더, Home/End/화살표 키, 예측·정답·질량 일치, 제약 상태, SVG 형상 갱신, 본문 이미지 및 KaTeX 표시 확인. 밝은/어두운 테마에 따른 canvas 색상 변경 확인. 화면 가로 넘침·로컬 자원 HTTP 실패·브라우저 JavaScript 오류 없음.
- 데이터 요청 실패와 JavaScript 비활성 상태에서 정적 지도 표시 확인. 한국어·영어 홈의 320px 메뉴도 확인했다.
- 자동 브라우저 검사에서는 클릭 좌표와 캡처를 안정화하기 위해 smooth scroll만 끈다. 실제 사이트의 스크롤 설정은 그대로 유지한다.

## 보관 범위

실험 데이터와 그림은 합계 약 964 KiB다. 모델 바이너리, 가상환경, 브라우저 바이너리와 검증 스크린샷은 저장소에 추가하지 않았다. 샘플 삭제 후의 스크린샷은 `/tmp/beam-pr-browser`에 있다. 빌드 결과와 설치 의존성은 저장소의 기존 ignore 규칙을 따른다.

이식은 최신 저장소의 별도 로컬 체크아웃에서 수행했다. 이전 사이트 디렉터리와 `assets/lib`의 기존 사용자 변경은 보존했다.
