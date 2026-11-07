# TACTICAL v0.4 WIP07B — 판정을 유지한 LOS 최적화

2026-11-07. WIP07A `e9f037cc6edca994e3f19297d3e0aa6c491be164`에서 시작했다. 기존 `feat/wip07-observation`/초안 PR #3을 이어서 작업했다. 시작 시 작업 트리는 깨끗하고 AGENTS.md는 없었다. main `776f02cd7c4bffe65a24f9c13478b590cabe1a93`의 변경은 설계 아카이브뿐이어서 동기화해 보존했다. main으로 병합하거나 사이트를 공개 배포하지 않았다.

## 결과

32m 타일의 지형 최대 높이·건물 최대 높이·숲/관목 유무를 미리 요약해 차폐/숲 감쇠가 없다고 확실한 구간만 건너뛴다. 애매하면 모든 기존 2m 표본을 기존 순서대로 검사한다. 6m preview도 같은 원칙이다. 원본 높이장·건물 다각형·숲 깊이·9개 관측점·관측 주기·확률·기동은 유지한다.

[구현과 보수적 경계 증명](docs/LOS_OPTIMIZATION_WIP07B.md). `src/observation.js`, `vehicle-profiles.js`, 지도·높이장·내비게이션·반경은 WIP07A와 바이트 차이가 없다. 추가 요약 배열은 코어당 **265,625바이트**이고 초기화 시 한 번 만든다. 별도 런타임 모듈이나 외부 라이브러리를 추가하지 않았다.

## 실제 비교 수치

AMD EPYC 9V74 80-Core Processor, Node v24.22.1, Linux x64. 같은 실제 지도·seed 407·20Hz 고정 스텝/10Hz 관측·정지/이동 50·100대 fixture를 별도 새 프로세스로 기준/최적화 각각 3회 실행했다. 동시에 실행하지 않았고 순서를 교대했다. 준비 20스텝 뒤 100스텝(5초)을 측정했다. 이동 궤적 생성은 CPU 스텝 시간에서 제외한다.

| 조건 | 기존 중앙값 | 최적화 중앙값 | 감소 | P95 기존 → 최적화 | 최적화 최대 |
|---|---:|---:|---:|---:|---:|
| 정지 50대 | 3.23ms | 2.01ms | 37.7% | 8.31 → 4.58ms | 8.94ms |
| 정지 100대 | 16.81ms | 6.47ms | 61.5% | 51.67 → 14.21ms | 18.47ms |
| 이동 50대 | 9.46ms | 3.47ms | 63.3% | 11.33 → 4.34ms | 5.99ms |
| 이동 100대 | 63.77ms | 15.50ms | 75.7% | 73.91 → 17.82ms | 23.28ms |

중앙값과 P95는 각 프로세스 통계 세 개의 중앙값이다. 최대값은 세 실행 모두에서 관측한 가장 큰 스텝이다. **전체 게임 FPS를 뜻하지 않는다.** 비교한 이동 100대 fixture는 50ms CPU 스텝 예산 안으로 들어왔으며, 다른 배치/기기에서 같은 개선율이나 프레임률을 보장하지 않는다.

[3회 비교·개별 실행·최종 상태 해시](tests/releases/WIP07B-comparison.json) · [일반 벤치마크](tests/releases/WIP07B-benchmark.json). `scripts/observation-benchmark-fixture.cjs`에 기존과 같은 좌표·궤적·시간 조건을 공유했다. 초기화 시간은 두 로더 경로가 달라 요약 생성 비용의 전후 비교로 사용하지 않는다.

## 정확성 검증

원본 코어를 `tests/fixtures/sim-core-WIP07A.js`에 고정해 독립 대조했다. 원본 SHA-256: `ab70525f12138b068daf00198bd49611d883c940cd8ac8c6fcfeac5a55f2e49c`. 테스트 전용이고 HTML/Worker에는 포함되지 않는다.

- **LOS 13,805건**, **노출 1,000건** 정확히 일치. `visible`뿐 아니라 차폐 사유·숲 광학 깊이와 전체 부위 표본 값을 대조했다. 실제 지도 LOS 12,000건에 타일·지도 경계/역방향/수평·수직·영길이/범위 밖/얇은 건물/안뜰/능선/접선/수관/숲·관목 누적 사례를 더했다.
- 노출 1,000건은 별도로 9,000개 부위 광선을 사용한다. [정확성 결과](tests/releases/WIP07B-los-equivalence.json).
- 4개 정지/이동 시나리오 × 기준/최적화 × 3회, 총 24개 완전한 상태 출력을 비교했다. 차량별 접촉·팀 접촉·최종 자세·탐지/식별 효과·관측/캐시 횟수를 포함한 JSON이 모두 바이트 단위로 같다. 최적화가 탐지 기준이나 처리량을 줄여 수치를 맞추지 않았음을 확인했다.
- 기존 정지/도착·독립 선회·경계·장비 차이·HK/포수 자체 표적·팀 공유·움직이는 표적의 건물/능선/숲·기억 고정·캐시 무효화·seed/배속/렌더 묶음·입력·Worker 회귀를 유지했다.

## 실행한 검사

**Node 160/160**, **실제 Chromium 12/12**, **JS/CJS 구문 37/37**, **Python 구문 2/2** 통과. 최종 실패 검사는 없다. 가짜 DOM 입력 검사, 실제 코어 판정 검사와 실제 Chromium을 구분했다. 과거 A 버전의 결과를 복사해 새 결과로 사용하지 않았다.

| 명령 | 결과 | 종류 |
|---|---:|---|
| `node --test tests/look-animation.test.cjs tests/ui-cache.test.cjs tests/observation.test.cjs tests/observation-core.test.cjs tests/observation-correction.test.cjs tests/observation-moving.test.cjs tests/los-optimization.test.cjs` | 88/88 | observation/actual core/LOS oracle and UI cache |
| `node tests/input.test.cjs` | 35/35 | fake DOM/input |
| `node tests/map.test.cjs` | 16/16 | actual map/mobility |
| `node tests/visibility.test.cjs` | 12/12 | geometry/mask/map |
| `node tests/vehicle.test.cjs` | 9/9 | profiles/mobility/actual Node Worker/stale response |
| `node tests/browser.test.cjs` | 12/12 | Chromium 156.0.8078.79 DOM/Canvas/내장 Worker |
| `node scripts/benchmark_los_compare.cjs` | 24개 상태 일치 | 6개 독립 순차 프로세스 |
| JS/CJS `node --check` | 37/37 | src/scripts/tests 및 원본 oracle |
| Python `compile` | 2/2 | build/package |
| 반복 빌드/패키징·ZIP CRC·압축 해제 바이트 일치 | 통과 | Python |

실제 Chromium의 장비 선택·지점 경계·직접 지정·해제·실제 각도/부채꼴·실루엣 픽셀·기억·팀 표시와 자기 확보 구분·모바일 844×390/390×844 배치를 다시 검사했다. [브라우저 기록](tests/releases/WIP07B-browser.json) · [데스크톱](tests/releases/WIP07B-desktop.png) · [팀 관측/자체 미확보](tests/releases/WIP07B-team-not-own.png) · [가로](tests/releases/WIP07B-844x390.png) · [세로](tests/releases/WIP07B-390x844.png).

## 다운로드와 체크섬

- [GitHub ZIP 다운로드](https://github.com/0-FLANDRE-0/Tactical_Project/raw/refs/heads/feat/wip07-observation/Tactical_v0.4_WIP07B.zip) — **1,606,413바이트**. 실행 HTML 한 파일만 들어 있다.
- `Tactical_v0.4_WIP07B.html` = `dist/index.html` — **8,262,184바이트**, 동일한 바이트.
- HTML SHA-256: `6d5ed68a48309f1cc503f96174c527fd1135723f507bd8c03d80304466dcc34c`.
- ZIP SHA-256: `63435fa9d29549c7380df144ada5602845905c082503b25d1fdfe48904f00bd0`.
- [체크섬](SHA256SUMS_WIP07B.txt) · [기계 판독 검증](tests/releases/WIP07B-validation.json).
- `src`를 수정하고 `python3 build.py` → `python3 scripts/package_release.py WIP07B`로 생성했다. 기존 WIP07A HTML/ZIP·관측 문서·검증 자료와 main의 아카이브는 보존했다.

## 차단·미실행·한계

- file://는 Chromium의 `ERR_BLOCKED_BY_ADMINISTRATOR` 정책으로 차단되어 같은 단일 HTML을 로컬 HTTP로 검사했다. 파일 더블클릭 실행 통과로 기록하지 않는다.
- 실제 Android의 터치/발열/메모리/배터리·지속 FPS와 전체 게임 100대 지속 FPS는 미실행.
- 원본 DEM/GDAL 대조는 미실행. 지도 원본과 높이장·길찾기를 변경하지 않았다.
- 숲이나 지형 상한 때문에 애매한 구간은 의도적으로 원래 검사를 수행한다. 다른 배치에서의 최악 비용을 이 수치로 보장하지 않는다.
- 동적 지형/건물 파괴가 추가되면 이 정적 파생 요약도 함께 갱신해야 한다. 현재 게임에는 그 기능을 추가하지 않았다.
