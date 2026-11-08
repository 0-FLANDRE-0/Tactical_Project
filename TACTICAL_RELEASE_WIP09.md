# TACTICAL v0.4 WIP09 — 게임 명중 확률·연속 조준

2026-11-07 KST. 시작 커밋은 WIP08A `68a549bbb4c379174902268e10278dec9ddc9f0d`다. PR #4 미병합, 깨끗한 작업 트리와 적용 AGENTS.md 없음도 확인했다. 지시서대로 `feat/wip09-hit-model`을 만들고 main `2d70fe6bf9c701352b80e6da370bd5b122515cc2`의 탄약 문서 변경을 `e027c56`에서 동기화했다. 아카이브 원문은 보존하고 탄약/장갑 수치를 런타임에 가져오지 않았다. PR #4에 의존하는 별도 초안으로 검토하며 main 병합·공개 배포하지 않는다.

## 구현 결과

기존 거리 선형 명중률을 게임 오차 예산과 현재 자기 포수에게 보이는 직사각형 확률로 교체했다. 표적 차체/포탑 방향·크기·열/행 노출, 연속 조준, 관측 위치에서 추정한 이동 벡터를 사용한다. `P_hull + P_turret`로 명중 여부를 정하고 **명중한 경우에만** 두 질량을 정규화해 기존 전/측/후 구역에 분배한다. 상부는 0, 빗나감은 부위 없음이다. 새 탄착 좌표·실제 탄도·관통/피해는 생성하지 않는다.

준비 게이트는 1.2초로 유지하되 `layTime`은 이후에도 누적한다. 기존 게이트 실패/취소/발사/초기화 시 누적과 속도 추정을 초기화한다. 0.5초보다 긴 관측 간격은 속도 추정에 사용하지 않는다. 승인된 단발의 기존 두 해시 난수만 사용하며 거부/읽기/렌더링은 소비하지 않는다.

탐지·식별 점수·숲 광학깊이·관측 중심 가중이나 기존 노출 비율을 명중률에 다시 곱하지 않는다. 가시 마스크를 정하는 기존 지형·건물·숲 LOS와 포구 발사선 게이트는 그대로 두며, 별도 수풀 탄체 저항/충돌은 추가하지 않는다. 9개 표본의 위치·순서·캐시 키와 관측 주기/확률, 지도·기동/길찾기, M1A2 도안/포구를 유지했다.

**모든 새 수치는 게임 튜닝값**이다. 실차 사통장치·탄약 성능을 측정하거나 현실적으로 보정한 값이 아니다. [구현/초깃값/전체 기준표](docs/FIRE_CONTROL_WIP09.md) · [원본 지시서](docs/TACTICAL_WIP09_HIT_PROBABILITY_INSTRUCTIONS.md).

## 프로파일·변경 파일

- 제거: `accuracyNear`, `accuracyFar`, `selfMotionPenalty`, `targetMotionPenalty`, `motionReference`, `zoneWeights`. 레지스트리는 폐기된 필드가 남은 프로파일을 거부한다.
- 추가: `dispersionMrad`, `layStartMrad`, `layMinMrad`, `layTauSeconds`, `rangeErrorM`, `muzzleVelocity`, `velocityRetention`, `leadResidual`, `maneuverAccel`, `maneuverReferenceSpeed`, `stabMradPerMps`, `presented`. 지시서의 초깃값과 유한 수/범위/순서 검증을 적용했다.
- `src/fire-control.js`: CDF·오차 예산·직사각형·명중/구역 질량, 연속 조준/관측 벡터, 사본 진단값.
- `src/sim-core.js`, `observation.js`: 표본 인덱스/높이 메타데이터와 자기 포수 샘플 사본. 사수 오차와 표적 크기/높이 띠를 구분한다.
- `src/app.js`, `page.html`, `styles.css`: 명중률·오차·보이는 크기·차체/포탑 전체 확률 요약. 미식별/기억은 숨기며 snapshot은 상세 분해 사본을 제공한다.
- 프로파일/JSON 내보내기, Python 기준표 생성 스크립트, 새 검사/동결 관측 원본, 벤치마크의 메타데이터 경계 어댑터와 버전별 검증 자료를 갱신했다. 새 런타임 모듈은 없으며 기존 HTML/Worker 로드 순서를 유지한다.

## 기준표와 회귀 검사

**Node 211/211, 실제 Chromium 15/15, JS/CJS 구문 47/47, Python 구문 5/5 통과. 최종 실패 0.** WIP08A의 195개 사례를 유지하고 16개를 추가했다. [기계 판독 검증](tests/releases/WIP09-validation.json).

| 검사 | 결과 | 환경 |
|---|---:|---|
| 기존 관측/LOS/UI/레지스트리/사격/도안 + hit-model/observation-metadata `node --test` | 139/139 | 순수 규칙·실제 코어·합성 지형·동결 원본 |
| `node tests/input.test.cjs` | 35/35 | 가짜 DOM 입력 |
| `node tests/map.test.cjs` | 16/16 | 실제 지도/기동 |
| `node tests/visibility.test.cjs` | 12/12 | 기하/영역/지도 |
| `node tests/vehicle.test.cjs` | 9/9 | 프로파일/기동/실제 Node Worker/오래된 응답 차단 |
| `node tests/browser.test.cjs` | 15/15 | 실제 Chromium 156.0.8078.79 DOM/Canvas/내장 Worker, 로컬 HTTP |
| JS/CJS `node --check` / Python `compile` | 47/47 · 5/5 | src/scripts/tests, build/package/도안 비교/기준표 생성 및 Python oracle |

제공 Python은 그대로 `tests/fixtures/wip09_hit_reference.py`에 보관했다(SHA-256 `ec338593640ad406dc529c5759e308ffee57ba55721ddeda61a56ecdc9d483f6`). 임시 디렉터리에서 실행해 [35개 기준 사례](tests/releases/WIP09-hit-table.json)를 생성했다. JS의 명중·차체·포탑·σx·σz는 Python과 0.00011 이내, tof는 출력 반올림 0.00051 이내로 일치한다. 원본 지시서의 명중률 35칸과 2000m 분해 28칸도 별도로 ±0.002 기준을 통과한다.

예: 정면 완전노출/정지/조준 1.2초의 2000m 식 결과는 약 **0.76619 = 차체 0.50304 + 포탑 0.26315**다. 3000m는 기준 식 검사에서만 maxRange를 늘렸고 실제 게임은 계속 2000m 밖에서 0이다. 조준 0.4초도 식 검사만 하며 실제 발사 게이트를 통과하지 못한다.

CDF 기준값/대칭/단조성, 거리/노출/조준/운동의 효과, 0 면적 거부·탄수/난수 미소비, 독립 구역 선택, 목표 변경/상실/관측 간격, 사본 비변이와 seed·배속 재현성을 검사했다. 단발의 포구 정합과 기존 입력/일시정지/초기화/선택/드래그/핀치/취소 회귀도 유지했다.

## 관측·LOS 보존과 바뀐 검사 계약

동결 WIP07A의 LOS **13,805건**과 노출 **1,000건**에서 기존 필드가 정확히 일치했다. 새 `along/z/col/row` 네 필드만 비교 투영에서 제외하고 순서·값·캐시를 별도 검증했다. `lineOfSight`와 이동 함수 본문, 지도·프로파일의 관측/기동/노출/길찾기 설정은 변경하지 않았다.

동결 WIP08A 관측 파일 SHA-256은 `5790c3db92e62a6b9bd75e3c960156509dab5228f454c519a311c6b412b49cb9`다. 가림·부분 노출·기억·재관측·움직임·숲을 포함한 6개 구간에서 현재 구현의 결정/이벤트/시간/횟수/상태가 추가 메타데이터를 제외하면 정확히 같다.

갱신한 과거 검사 계약은 폐기된 선형 정확도/zoneWeights의 존재, 이동해도 조건부 비중이 항상 같다는 가정, 새 메타데이터가 없는 노출 객체의 완전 일치다. 새 모델의 기준표/질량 보존과 이전 LOS 필드의 독립 대조로 대체했다. 입력/개인 관측/기억 공개·정지/도착·선회·도안·Worker 검사를 약화하지 않았다.

## 브라우저와 성능

브라우저에서 새 요약·상세 snapshot·단발 표시와 미식별/기억 숨김을 검사했다. [데스크톱 요약](tests/releases/WIP09-hit-desktop.png) · [844×390](tests/releases/WIP09-hit-844x390.png) · [390×844](tests/releases/WIP09-hit-390x844.png) · [브라우저 기록](tests/releases/WIP09-browser.json). 모바일 캡처는 viewport 검사이며 실제 Android가 아니다. 세로 화면의 기존 사이드바 숨김 정책도 유지한다.

실제 지도, seed 407, 20Hz 스텝/10Hz 관측, 준비 20/측정 100스텝, 50/100대 절반씩 양 진영, 기존 합성 궤적이다. Node v24.22.1/AMD EPYC 9V74/Linux x64에서 원본 LOS/최적화 각 3개 새 프로세스를 순차 실행했다. 양쪽은 같은 현재 관측/명중 상태를 처리하고, 원본 기하의 관측 경계에만 새 인덱스를 붙였다. **24개 완전 상태 출력이 동일**하다.

| 조건 | 원본 LOS 중앙값 | 현재 중앙값 | 현재 P95 |
|---|---:|---:|---:|
| 정지 50대 | 3.63ms | 2.62ms | 5.44ms |
| 정지 100대 | 17.78ms | 7.40ms | 15.39ms |
| 이동 50대 | 9.29ms | 3.85ms | 5.11ms |
| 이동 100대 | 65.89ms | 16.83ms | 19.14ms |

각 프로세스 통계 3개의 중앙값이다. 궤적 생성 비용은 제외하며 발사 입력은 없다. CPU 스텝 시간으로 전체 FPS나 동시 사격 성능을 뜻하지 않는다. [별도 프로세스 비교/전체 상태 해시](tests/releases/WIP09-comparison.json) · [일반 측정](tests/releases/WIP09-benchmark.json).

## 다운로드와 체크섬

[GitHub 실행 ZIP](https://github.com/0-FLANDRE-0/Tactical_Project/raw/refs/heads/feat/wip09-hit-model/Tactical_v0.4_WIP09.zip). 압축 해제하면 단일 HTML 한 파일이다. 기존 실행 파일/ZIP/검증 자료는 보존했다.

| 파일 | 바이트 | SHA-256 |
|---|---:|---|
| `Tactical_v0.4_WIP09.html` = `dist/index.html` | 8,303,585 | `5343e3389267ec193dbefd4be66a1508833d7ec6fefdf15222354809f65daffb` |
| `Tactical_v0.4_WIP09.zip` | 1,619,832 | `1b4aab7bd0f34cf68018eccd70c1efa4ecd9041d2255650abab5b2640b1fdbb4` |

`node scripts/export_vehicle_profile.cjs` → `python3 scripts/generate_hit_reference.py` → `python3 build.py` → `python3 scripts/package_release.py WIP09`. 반복 빌드/패키징, ZIP CRC, 압축 해제 후 dist 바이트 일치를 확인했다. [체크섬 파일](SHA256SUMS_WIP09.txt).

## 미실행·한계

file://는 실제 시도했지만 `ERR_BLOCKED_BY_ADMINISTRATOR`로 차단됐다. 같은 단일 HTML을 로컬 HTTP로 검사했으며 더블클릭 실행 통과로 기록하지 않는다. 실제 Android 터치/발열/메모리/지속 FPS, 전체 게임 FPS·동시 사격 성능, 원본 DEM/GDAL 재대조는 미실행이다. 직사각형은 게임 근사이며 실차 성능 검증이 아니다. 탄종 다양화·세부 부위·상부 피격·관통·피해·파괴·상세 장전·자동 발사·2발째 보정은 추가하지 않았다.
