# 외팔보 대리모델 실험

Python 3.12 / CPU에서 실제로 실행한 재현용 코드다. Euler–Bernoulli 해석식의 처짐 크기를 정답으로 사용한다. 전체 물리장, FEM, 실측 검증이나 반복적인 최적화는 구현하지 않는다. 이 문제에서는 해석식을 직접 계산하는 편이 더 저렴하다.

## 실행

저장소 루트에서:

```bash
python3 -m venv /tmp/beam-env
source /tmp/beam-env/bin/activate
python -m pip install -r scripts/beam-surrogate/requirements.txt
python scripts/beam-surrogate/experiment.py
python scripts/beam-surrogate/verify.py
```

Windows PowerShell에서는 `py -3.12 -m venv "$env:TEMP/beam-env"` 및 `& "$env:TEMP/beam-env/Scripts/Activate.ps1"`로 환경을 만든 뒤 동일한 `python` 명령을 쓴다. `experiment.py`는 실행 위치와 무관하게 저장소를 찾는다.

원본 산출물을 보존하면서 재현하려면:

```bash
python scripts/beam-surrogate/experiment.py --output-root /tmp/beam-rerun
python scripts/beam-surrogate/verify.py --root /tmp/beam-rerun --compare-root .
```

## 고정 설정과 데이터 분리

- 길이 0.5 m, 탄성계수 70e9 Pa, 밀도 2700 kg/m³, 끝단 집중하중 10 N, 질량 상한 0.54 kg.
- 폭과 높이 범위 각각 [10, 40] mm. 직선·균일 단면·선형 탄성·작은 변형을 가정한다. 전단 변형, 자중, 소성, 좌굴, 공차는 포함하지 않는다.
- NumPy `default_rng(20260921)`로 독립 균등표본 300개를 만들고 같은 RNG의 permutation으로 180/60/60 분할한다. 중복 좌표가 없음을 검증한다.
- 학습 subset에서만 StandardScaler를 fit한다. 목표는 자연로그 `log(delta / 1 mm)`, 역변환은 exp다.
- RBF KernelRidge의 alpha 3개 × gamma 3개를 검증 MAPE로 선택한다. 같은 모델을 유지하며 validation/test로 refit하지 않는다.
- 테스트는 선택 후 평가한다. 별도 61×61 격자를 추론하고 질량 제한을 통과한 예측 상위 5개를 고정한 후 원래 truth 함수를 다시 호출한다. 전체 격자 정답은 그 뒤 감사에만 사용한다.
- BLAS/OMP 스레드를 1로 고정한다. 패키지 버전과 데이터 해시를 기록한다. 운영체제·BLAS 차이로 부동소수점 마지막 자릿수는 달라질 수 있다.

## 산출물

| 경로 | 내용 |
| --- | --- |
| `public/data/beam-surrogate/samples.csv` | 무작위 형상 300개와 split; 정답·최종 모델 예측·질량 |
| `public/data/beam-surrogate/candidates.csv` | 격자 3,721개; id, b_mm, h_mm, predicted_deflection_mm, truth_deflection_mm, mass_kg, feasible, relative_error_pct |
| `public/data/beam-surrogate/shortlist.csv` | 예측으로 선택한 상위 5개를 다시 정답 평가한 결과, predicted_rank 포함 |
| `public/data/beam-surrogate/results.json` | 상수·버전·분할·표준화 통계·9개 모델 검증·테스트·격자 평가·후보·SHA256 |
| `src/lib/beam-results.ts` | results.json을 MDX에 전달하는 import와 숫자 서식 함수 |
| `public/data/beam-surrogate/explorer.json` | columns + rows 형식의 브라우저 데이터, mm 격자축, 기준/선택 ID, 로그 색 척도의 최소/최대값 |
| `public/images/2026-09-21-beam-surrogate/design-space.png` | JavaScript 없이도 보이는 Matplotlib 성능 지도 |
| `src/assets/beam-surrogate/*.png` | 검증·형상 비교 그림. MDX import로 Astro가 크기와 반응형 이미지를 생성 |

격자는 높이가 바깥 루프, 폭이 안쪽 루프인 행 우선 순서다. `id = height_index * 61 + width_index`. `feasible`은 계산한 질량에 1e-12 kg 수치 허용오차를 사용한다. 이는 제작 공차 여유가 아니다. CSV 소수점 반올림 전 값으로 평가 지표를 계산한다.

CSV는 Python `csv.writer`의 기본 CRLF 줄바꿈을 사용한다. `.gitattributes`가 이 파일들의 자동 줄바꿈 변환을 막아, 운영체제별 Git 설정에 의해 기록된 SHA256이 바뀌지 않게 한다.

정적 그림의 영문 축은 단위·모델 예측/해석식 정답을 명시하며 한국어 본문과 캡션이 의미를 설명한다. 원본 데이터, 정적 그림, 브라우저 데이터는 같은 한 번의 실행에서 생성된다. 모델 pickle과 가상환경은 저장소에 넣지 않는다.

## 지표와 검증

이번 이식의 수치·환경·검사 결과는 [VALIDATION.md](VALIDATION.md)에 기록했다.

MAE/RMSE(mm), MAPE(%), 상대오차 p95/max, R²와 Spearman을 기록한다. 가능한 격자 후보에서 Spearman, 예측/정답 상위20 교집합, 선택 손실(선택 정답/격자 최선 정답−1)을 별도로 기록한다. 경계 오차는 폭 또는 높이가 범위 끝에서 2 mm 이내인 점들의 MAPE다.

`verify.py`는 기준 형상의 단위 계산, 분할·격자 중복 방지, 학습 전용 표준화 통계, 검증 기반 선택, CSV/JSON/브라우저 데이터 일치, 질량 제약과 재평가·지표·해시를 검사한다. `--compare-root`는 재실행의 숫자도 비교한다. 글의 표는 결과 JSON을 읽어 수기 전사 오류를 줄인다.

블로그는 Node 24 / Astro + MDX + React 기반이다. 저장소 루트에서:

```bash
npm ci
npm run check
npm run build
python scripts/beam-surrogate/check_site.py
npm run preview -- --host 127.0.0.1
```

`http://localhost:4321/posts/beam-surrogate-design-space/`를 연다. 한국어 글은 `src/content/posts/ko/beam-surrogate-design-space.mdx`이며 `category: sciml`, `interactive: true`를 사용한다. 수식은 빌드 시 KaTeX로 렌더링된다. 기존 Figure/Interactive/Callout/Cite 컴포넌트와 참고문헌 목록을 사용한다.

`src/components/interactive/BeamExplorer.tsx`는 `client:visible` React island다. 화면에 들어올 때 JSON을 읽고, 로딩 전·실패·JavaScript 비활성 상태에서는 서버가 렌더링한 정적 지도가 남는다. 색상은 OptimizerLab.css에 문서화된 중립색 척도와 범주색 slot 1/2를 그대로 사용한다. 원/별·실선/점선·텍스트 값으로 색 외의 구별 수단도 제공한다. theme-toggle과 시스템 테마 변경 시 canvas를 다시 그린다.

브라우저 검증은 선택 사항이며 학습 의존성에 포함하지 않는다:

```bash
python -m pip install -r scripts/beam-surrogate/requirements-browser.txt
python -m playwright install chromium
python scripts/beam-surrogate/check_browser.py --url http://localhost:4321/posts/beam-surrogate-design-space/
```

기존 Chromium을 쓰려면 `--browser /absolute/path/to/chrome`를 지정한다. 데스크톱/모바일/키보드/지도/슬라이더/제약 변경/밝은·어두운 테마/데이터 실패/JavaScript 비활성 대체 그림을 검사하고 스크린샷을 `/tmp/beam-astro-browser`에 둔다. React 외의 ML/시각화 라이브러리는 추가하지 않으며, 브라우저는 미리 계산한 JSON만 읽는다. 지도는 최근접 후보를 선택하며 보간하지 않는다.

## 출처

- [MIT OCW, 1.050 Solid Mechanics, Problem Set 11, p.2](https://ocw.mit.edu/courses/1-050-solid-mechanics-fall-2004/fd4eff39aec922b8c07660006f40686e_pset04_11.pdf): 끝단 하중 외팔보 식.
- [scikit-learn 1.6 KRR](https://scikit-learn.org/1.6/modules/kernel_ridge.html), [데이터 누수 방지](https://scikit-learn.org/1.6/common_pitfalls.html#data-leakage).
- [SciPy 1.15.3 Spearman](https://docs.scipy.org/doc/scipy-1.15.3/reference/generated/scipy.stats.spearmanr.html).
