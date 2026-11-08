# TACTICAL v0.4 WIP08A — M1A2 형상·포탑 링·포구 발사

2026-11-07 KST. WIP08 `8691824c8a945cc37450333302dba58eb46789a0`와 깨끗한 `feat/wip08-aim-fire`에서 시작했다. 적용 AGENTS.md는 없었다. 시작 main은 `a832a89`였으며, 마무리 확인 중 `ebe6787c12be9485f288af88555ce1ecbe4d6f18`의 M1A2 (1998) 장갑 아카이브 추가를 발견해 원문을 보존하고 작업 브랜치에 동기화했다. 런타임 장갑 모델은 이번 변경에 넣지 않았다. 초안 PR #4를 갱신하며 main 병합·공개 배포는 하지 않는다.

## 구현

제공 `M1_Abrams_TopView.html`의 M1A2 벡터와 LOD를 적용했다. 차체 후면/펜더, 조종수 해치·잠망경·연료캡, 포탑/포방패/장비와 독립 CITV를 반영했다. 본문 캔버스·미식별 실루엣·기억·사이드바 SVG·단독/선회 SVG·비교 화면에 같은 도안을 쓴다. Lab의 iframe/postMessage·형식 선택 UI는 실행 게임에 넣지 않았다.

도안 원점 +0.15m와 **차체 고정 포탑 링 회전축 +0.66m**를 분리했다. 새 공통 2D 변환으로 실제 차체/포탑 방향에 따른 포구 끝을 구한다. 포탄 표시·섬광·발사 이벤트 원점·발사선 검사가 그 포구에서 시작한다. 이후 차량이 움직이거나 돌아가도 기록된 원점은 고정된다. 포구 아래 지형 높이가 달라도 발사 높이는 차체 지면 기준 +2.2m로 유지한다.

관측 9개 표본/주기/확률, 이동·반경 4.62m·길찾기 계약, 지도/고도/건물/숲과 WIP08 명중/조건부 부위·seed 규칙을 유지했다. 포탄 이동은 0.35초 화면 연출이며 실제 탄속·탄도·고각·관통·피해·상세 장전·포신 전체 충돌을 추가한 것은 아니다.

[구현/좌표/원본 구분](docs/M1A2_ART_MUZZLE_WIP08A.md) · [제공 원본](data/vehicles/references/M1_Abrams_TopView.html) · [수입 범위/체크섬](data/vehicles/references/top_view_import.json).

## 다운로드

[GitHub 실행 ZIP](https://github.com/0-FLANDRE-0/Tactical_Project/raw/refs/heads/feat/wip08-aim-fire/Tactical_v0.4_WIP08A.zip) — 압축 해제 후 `Tactical_v0.4_WIP08A.html` 한 파일을 연다. 기존 WIP08 HTML/ZIP은 그대로 보존했다.

| 파일 | 바이트 | SHA-256 |
|---|---:|---|
| `Tactical_v0.4_WIP08A.html` = `dist/index.html` | 8,297,948 | `4c5e9886f33776cc7dd57e733920e7ca63656b9a29bcf9e2f6d1f955cc26b68e` |
| `Tactical_v0.4_WIP08A.zip` | 1,617,804 | `2b2fd026e2b8814e36c09d78a2c603d43b73ddbcf3f50e2c2357a8d1cfd8611b` |

`node scripts/export_vehicle_profile.cjs` → `python3 scripts/build_vehicle_review.py` → `python3 build.py` → `python3 scripts/package_release.py WIP08A`로 제작했다. 반복 빌드/패키징 바이트 일치, ZIP CRC와 압축 해제 후 dist 바이트 일치를 확인했다. [체크섬](SHA256SUMS_WIP08A.txt).

## 검증

**Node 195/195, 실제 Chromium 15/15, JS/CJS 구문 43/43, Python 구문 3/3 통과. 최종 실패 0.** 기존 WIP08 Node 187개에 도안/포구/기억 검사 8개를 추가했다. [명령·해시·검증 기록](tests/releases/WIP08A-validation.json).

| 검사 | 결과 | 종류 |
|---|---:|---|
| 기존 관측/LOS/UI/사격 + `tests/art-muzzle.test.cjs` 등 `node --test` | 123/123 | 순수 규칙·실제 코어·합성 지형·동결 LOS 원본 |
| `node tests/input.test.cjs` | 35/35 | 가짜 DOM 입력 |
| `node tests/map.test.cjs` | 16/16 | 실제 지도/기동 |
| `node tests/visibility.test.cjs` | 12/12 | 기하/영역/지도 |
| `node tests/vehicle.test.cjs` | 9/9 | 프로파일/기동/실제 Node Worker/오래된 응답 차단 |
| `node tests/browser.test.cjs` | 15/15 | 실제 Chromium 156.0.8078.79 DOM/Canvas/내장 Worker, 로컬 HTTP |
| JS/CJS `node --check` / Python `compile` | 43/43 · 3/3 | 소스·로더·검사 및 build/package/비교 화면 제작 |
| 원본 LOS/노출 대조 | 13,805/1,000건 일치 | 동결 원본 수정 없음 |
| 별도 프로세스 LOS 비교 | 24개 완전 상태 출력 일치 | 양쪽 현재 관측/사격 상태, 발사 입력 없음 |

제공 M1A2 벡터 세 레이어는 정확히 일치한다. 실제 Canvas에서는 원본과 내장 렌더러를 같은 신규 Path2D 캐시 조건에서 정면/측면/후방/차체와 포탑이 다른 네 자세로 비교해 모든 RGBA 채널이 일치했다. 별도로 실제 앱의 선/섬광 시작점을 확인했고 포구 이벤트와 DOMMatrix 변환 차이는 약 **3.58×10⁻⁸m**였다. 포탑 선회 중/후방/회전한 차체의 실제 단발, 이벤트 원점 고정, 배열이 분리된 공개 사본과 기억도 검사했다.

브라우저 대조를 처음 만들 때 사용 이력이 다른 Path2D 캐시에서 정면 CITV 가장자리 265채널의 래스터 차이(최대 13)를 발견했다. 동일한 새 인스턴스로 캐시 조건을 맞추자 네 자세 모두 정확히 일치했다. 실제 앱 발사선/섬광 검사는 별도로 유지했다. 이를 도안 벡터 변경이나 숨겨진 렌더링 차이로 무시하지 않고 검사 조건에 기록했다.

[브라우저 기록](tests/releases/WIP08A-browser.json) · [제공 도안/반영 도안 비교](tests/releases/WIP08A-art-comparison.png) · [단발 결과](tests/releases/WIP08A-shot.png) · [세로](tests/releases/WIP08A-390x844.png) · [가로](tests/releases/WIP08A-844x390.png).

## 성능 회귀

실제 지도, seed 407, 0.05초 스텝/10Hz 관측, 준비 20/측정 100스텝, 각 진영 절반의 50/100대 fixture다. Node v24.22.1, AMD EPYC 9V74, Linux x64. 원본 LOS와 최적화 LOS를 각 3개의 순차 새 프로세스에서 실행했다. 양쪽에 현재 관측/사격 상태 처리를 동일하게 적용했으며 이동 궤적 생성은 제외한다. 발사 입력이 없어 새 포구 정밀 검사의 대규모 동시 사격 비용은 이 수치에 포함하지 않는다.

| 조건 | 원본 LOS 중앙값 | 현재 중앙값 | 현재 P95 |
|---|---:|---:|---:|
| 정지 50대 | 3.37ms | 2.21ms | 4.39ms |
| 정지 100대 | 18.14ms | 7.64ms | 15.23ms |
| 이동 50대 | 9.21ms | 3.80ms | 4.97ms |
| 이동 100대 | 63.72ms | 16.09ms | 18.95ms |

각 프로세스 통계 세 개의 중앙값이며 전체 FPS가 아니다. [개별 실행/동일 상태/해시](tests/releases/WIP08A-comparison.json) · [일반 벤치마크](tests/releases/WIP08A-benchmark.json).

## 차단/미실행

file://는 실제 시도했지만 `ERR_BLOCKED_BY_ADMINISTRATOR`로 차단됐다. 같은 단일 HTML을 로컬 HTTP로 검증했으며 더블클릭 실행 통과로 기록하지 않는다. 실제 Android 터치/발열/메모리/지속 FPS, 전체 게임 FPS·동시 사격 성능, 원본 DEM/GDAL 재대조와 실차 치수/무장 성능 인증은 미실행이다. 제공 도안 수치는 게임 외형 근사로 사용한다.
