# TACTICAL v0.4 WIP07A

2026-11-07. WIP07 `a2dd77012a514b9499d8ca28a7d7671a983ff193`와 미병합 초안 PR #3을 이어서 보정했다. 작업 브랜치는 `feat/wip07-observation`이다. 시작 시 main `c99a21c`, 마무리 시 main `09580a3`의 변경은 별도 설계 아카이브뿐이어서 두 번 동기화해 보존했다. 작업 시작 트리는 깨끗했고 AGENTS.md는 없었다. main 병합·공개 배포는 하지 않았다.

## 변경과 재현

포수 순간 시야를 30°로 줄이고 전차장/포수의 자동 수색을 차체 전방 ±45°/±15°의 20초/12초 왕복으로 바꿨다. 평상시 탐색 구동 15°/s·8°/s와 확인 구동 상한 50°/s·40°/s를 분리했다. 각도는 실제 고정 스텝 상태이며 도안·홀드 부채꼴·프로파일이 같다.

관측 출처·적군 확인·확인 담당을 구분한다. 전차장 단독 미식별 접촉으로 포수를 미리 돌리지 않는다. 포수 자체 식별은 가짜 전차장 인계를 만들지 않고 HK OFF에서도 표적을 유지한다. 기존 확보 표적을 2초마다 새 후보로 교체하던 경로를 제거했다. 새 전차장 후보는 관측 사본으로 대기하며 사용자 경계와 기존 표적 유지가 우선한다.

주변 탐지와 미완료 식별 감쇠를 분리했다. 팀 지식 전달은 자기 LOS/효과/포수 확보로 바뀌지 않는다. UI에도 팀 표시와 선택 차량의 자체 관측/확보를 나눠 표시한다. 관측 확보는 전체 발사 가능 조건을 뜻하지 않는다.

| 기존 문제 | 수정 전 재현 | 수정 후 같은 조건 |
|---|---|---|
| 전차장 단독 접촉을 포수가 사전 추적 | 탐지 2.10s, 포수 집중 2.15s, 식별 3.00s. HK ON/OFF 모두 발생 | 사전 포수 집중 없음. HK ON은 식별 3.00s에 명시 인계, 이후 실제 선회/자체 관측으로 5.65s 확보. HK OFF는 자동 선회/인계 없음 |
| 주변 관측이 식별 효과를 보존 | 150m, 식별 효과 1.097624가 주변만 20s 뒤에도 동일 | 20s 뒤 0.194034, 비율 0.176777 = 8s 반감기 적용값 |

위 시간은 seed 7과 명시한 합성 LOS fixture의 재현 결과다. 실제 지도/브라우저 성능이나 실차 관측 시간으로 주장하지 않는다. [수정 전](tests/releases/WIP07A-before.json) · [수정 후 사건 기록](tests/releases/WIP07A-after.json) · [현재 구현 계약](docs/OBSERVATION_WIP07A.md) · [작업지시서 원문](docs/TACTICAL_WIP07A_OBSERVATION_CORRECTION_INSTRUCTIONS.md).

## 실행 파일

- [GitHub ZIP 다운로드](https://github.com/0-FLANDRE-0/Tactical_Project/raw/refs/heads/feat/wip07-observation/Tactical_v0.4_WIP07A.zip), **1,605,270바이트**. 압축을 풀면 실행 HTML 하나가 나온다.
- `Tactical_v0.4_WIP07A.html` = `dist/index.html`: **8,258,144바이트**, 동일한 바이트.
- HTML SHA-256: `abd2f38b4984e2312aad22a1c5e79c93ae092403785ea3c4592d7c5829b5a500`.
- ZIP SHA-256: `4da317d290f4e1123903161cca9ef953fb0b2cce3bc79d857255691b1ef8bc9a`.
- `node scripts/export_vehicle_profile.cjs` → `python3 build.py` → `python3 scripts/package_release.py WIP07A`로 생성했다. ZIP CRC와 압축 해제한 HTML의 바이트/SHA 일치, 반복 빌드/패키징 일치를 확인했다.
- [체크섬](SHA256SUMS_WIP07A.txt) · [기계 판독 검증](tests/releases/WIP07A-validation.json). 이전 WIP07 HTML/ZIP·검증 파일은 보존했다.

## 실행한 검사

Node **153/153**, 실제 Chromium **12/12**, JS/CJS 구문 **32/32**, Python 구문 **2/2** 통과. 최종 실패 검사는 없다. 초기 계약 변경으로 실패했던 수색/인계 검사는 새 동작을 검사하도록 갱신한 뒤 통과했다. 기존 드래그·핀치·입력 취소·선택·배속·일시정지·오래된 Worker 응답 회귀를 유지했다.

| 명령 | 결과 | 종류 |
|---|---:|---|
| `node --test tests/look-animation.test.cjs tests/ui-cache.test.cjs tests/observation.test.cjs tests/observation-core.test.cjs tests/observation-correction.test.cjs tests/observation-moving.test.cjs` | 81/81 | pure + actual core; synthetic and actual map fixtures |
| `node tests/input.test.cjs` | 35/35 | fake DOM and renderer |
| `node tests/map.test.cjs` | 16/16 | actual map/mobility |
| `node tests/visibility.test.cjs` | 12/12 | visibility geometry and map |
| `node tests/vehicle.test.cjs` | 9/9 | profile/mobility/actual Node Worker/stale response adapter |
| `node tests/browser.test.cjs` | 12/12 | 실제 Chromium 156.0.8078.79; DOM/Canvas/내장 Worker |
| JS/CJS `node --check` | 32/32 | 구문 |
| build/package Python `compile` | 2/2 | 구문 |

지시서 회귀 항목 연결:

| 번호 | 주 검사 파일 | 결과 |
|---|---|---|
| R01 | `tests/observation-correction.test.cjs` | 통과 |
| R02 | `tests/observation-correction.test.cjs` | 통과 |
| R03 | `tests/observation-correction.test.cjs` | 통과 |
| R04 | `tests/observation-correction.test.cjs` | 통과 |
| R05 | `tests/observation-correction.test.cjs` | 통과 |
| R06 | `tests/observation-correction.test.cjs` | 통과 |
| R07 | `tests/observation-correction.test.cjs` | 통과 |
| R08 | `tests/observation-correction.test.cjs` | 통과 |
| R09 | `tests/observation-correction.test.cjs` | 통과 |
| R10 | `tests/observation-correction.test.cjs` | 통과 |
| R11 | `tests/observation-moving.test.cjs` | 통과 |
| R12 | `tests/observation-moving.test.cjs` | 통과 |
| R13 | `tests/observation-correction.test.cjs` | 통과 |
| R14 | `tests/observation-moving.test.cjs` | 통과 |
| R15 | `tests/observation-moving.test.cjs` | 통과 |
| R16 | `tests/observation-moving.test.cjs` | 통과 |
| R17 | `tests/observation-moving.test.cjs` | 통과 |
| R18 | `tests/observation-moving.test.cjs` | 통과 |
| R19 | `tests/observation-moving.test.cjs` | 통과 |
| R20 | `tests/observation-moving.test.cjs` | 통과 |
| R21 | `tests/observation-moving.test.cjs` | 통과 |
| R22 | `tests/observation-correction.test.cjs` | 통과 |

관측 규칙 검사는 합성 가시선을 주입한다. 이동 회귀는 실제 코어·아홉 부위 표본·2m LOS를 쓰며, 명시한 합성 건물/능선/숲에서 결정적 궤적을 실행한다. 움직이는 표적의 부채꼴 진입/이탈, 차폐, 광학 깊이, 숨은 자세 변화에도 고정된 기억, 재등장, 양 끝점 이동·차체/포탑 회전·높이 변화의 캐시 무효화를 확인했다. 원본 지도는 지도/기동 검사와 벤치마크, 브라우저의 실제 팀 공유/직접 지정 시나리오에서 사용한다. [이동 회귀 사건·조건](tests/releases/WIP07A-moving-regressions.json)을 남겼다.

실제 Chromium은 모바일 844×390/390×844 배치, 장비 선택·경계·취소·자동 복귀·직접 지정·확보 해제를 확인했다. Canvas의 실제 FOV 각도와 도안의 실제 포탑/전차장 방향을 대조했다. 모의 접촉은 정보 공개 UI 검사에만 사용했고, 새 팀 공유 사례는 원본 지도와 실제 관측 파이프라인으로 ‘팀에는 보이지만 선택 차량은 거리 밖’ → 직접 지정 대기 → 자체 센서 확보를 검사했다.

[데스크톱](tests/releases/WIP07A-desktop.png) · [팀 관측/자체 미확보](tests/releases/WIP07A-team-not-own.png) · [가로](tests/releases/WIP07A-844x390.png) · [세로](tests/releases/WIP07A-390x844.png) · [브라우저 기록](tests/releases/WIP07A-browser.json).

## 정지·이동 비용

실측: AMD EPYC 9V74 80-Core Processor, Node v24.22.1, Linux x64. 원본 지도·seed 407, 합법 위치로 보정한 격자와 양 진영 관측, 준비 20스텝 뒤 100스텝(5초). 이동은 각 중심에서 폭 12m/8m의 결정적 사인/코사인 궤적이며 정적 충돌 위치는 갱신하지 않는다. 정확한 좌표식·초기 위치·이동 성공/차단 횟수와 시간 조건을 [원시 JSON](tests/releases/WIP07A-benchmark.json)에 기록했다. 궤적 생성은 측정 구간에서 제외하고 실제 선회·후보 선별·관측·효과/인계·팀 병합을 포함한다.

| 조건 | 차량 | 스텝 중앙값 | p95 | 최대 | 정밀 광선 | 캐시 재사용 |
|---|---:|---:|---:|---:|---:|---:|
| 정지 | 50 | 3.76ms | 8.57ms | 10.75ms | 37,378 | 90,530 |
| 정지 | 100 | 18.52ms | 54.91ms | 56.04ms | 119,827 | 318,311 |
| 이동 | 50 | 9.21ms | 10.90ms | 11.27ms | 126,729 | 0 |
| 이동 | 100 | 65.25ms | 76.38ms | 80.92ms | 438,633 | 0 |

**이동 100대는 50ms 스텝 예산을 넘는다.** 성능 완료로 주장하지 않는다. 같은 높이 채널의 기하 요청은 후보당 한 번이고, 관측은 2개 cohort로 분산된다. 이동 조건에서는 양 끝점이 바뀌어 광선 캐시 재사용이 0인 것을 확인했다. 이 때문에 정지 결과보다 비용이 높다. 관측 시간/확률을 임의로 바꿔 비용을 낮추지 않았다. 수치는 CPU 관측 fixture이며 전체 게임 FPS가 아니다.

후속 성능 진입점은 `src/sim-core.js`의 `exposure/lineOfSight` 정밀 광선 묶음 처리와 `src/observation.js`의 결정적 관측 작업 분산이다. 10Hz 의미·부위 차폐·seed 재현성과 오래된 가시선으로 시간을 적립하지 않는 계약을 유지해야 한다.

## 차단·미실행·남은 범위

- 시스템 Chromium 실행은 이번에도 성공. file://는 `ERR_BLOCKED_BY_ADMINISTRATOR`로 차단되어 동일한 HTML을 로컬 HTTP로 검사했다. 파일 더블클릭 실행 통과로 기록하지 않는다.
- 실제 Android 터치/멀티터치·전체화면·방향 고정·발열·지속 FPS는 미실행.
- 원본 DEM/GDAL 대조는 미실행. 지도 원본·높이장·4.62m 반경·길찾기 계약은 변경하지 않았다.
- 이동 100대의 실시간 CPU 예산과 지속 브라우저 FPS는 남은 성능 문제다. 관측 보정/움직임 회귀는 위 범위에서 통과했다.
- 발사·조준 완료·탄도·장갑·피해·재장전·고각·적 전술 AI는 요청대로 후속 범위다.
