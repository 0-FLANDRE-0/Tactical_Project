# TACTICAL v0.4 WIP10 — 예측 사격·비행·착탄

2026-11-07 KST. 발사 시 자기 포수 관측 속도로 선행 위치를 계산하고, 실제 포구에서 그 방향으로 발사한다. 거리와 게임 평균 탄속으로 비행 시간을 정한 뒤 착탄 시점의 실제 표적 위치·차체/포탑 방향·포구 기준 차폐로 최종 확률을 한 번 추첨한다. 결과를 정한 뒤 명중점 또는 지형·건물 빗나감 위치를 만들어 화면과 공개 이벤트에 연결했다. 장갑·관통·피해는 이 버전의 범위가 아니다.

초기 WIP10 작업은 WIP09 `04d6d2e85bd4e599332f03f0614989dbbc79990b`에서 시작했다. 이번 보완은 `feat/wip10-flight-impact`의 `41f080efd11675f24d23fc0b3547b9f4364e4380`에서 시작했고, 최신 main `e2f44d92d06d35782dfa0f5ce81f6c3eb3a77bf6`를 merge commit `2f12a560d56ffd8bc6025e6a50af6719596a4554`로 정상 병합했다. main의 다음 단계·전차·탄약 아카이브와 기존 사용자 변경은 보존했다. 적용 AGENTS.md는 없었다. PR #6은 초안이며 main 병합과 공개 배포는 하지 않는다.

이전 고정 0.8초 지연과 화면 픽셀 효과만 있던 부분 구현은 제거했다. 제공 지시서의 예측 방향, 실제 ToF, 착탄 시점 확률, 편향, 포물선 지형/건물 탄착과 Python 기준표를 실행 코드와 검사에 모두 연결했다. [구현 식과 공개 규칙](docs/FIRE_CONTROL_WIP10.md) · [입력 파일 체크섬과 범위](docs/WIP10_SOURCE_SCOPE.json).

## 구현 결과

- 발사 승인 시 새 포수/포구 LOS, 정렬, 거리, 탄수와 간격을 확인한다. 발사 이벤트에는 결과가 없고 결정 난수를 사용하지 않는다.
- `ToF = R0/(muzzleVelocity×velocityRetention)`, `P_pred = pose0+v_obs×ToF`, `β_s = atan2(P_pred−origin)`으로 비행 스냅샷을 만든다. `origin`은 도안과 공유하는 실제 포구 좌표다.
- 착탄 시 저장한 포구에서 실제 표적의 9개 표본 차폐를 다시 조회한다. 포수 FOV·거리를 다시 적용하지 않으며 사수 이동·선회·관측 상실은 이미 발사된 탄을 바꾸지 않는다.
- 예측과 실제 위치 차이를 탄 방향의 가로/거리 편향으로 분해하고 중력 세로 편향을 더한다. 현재 보이는 차체/포탑 직사각형에 정규분포를 적분해 최종 확률을 계산한다.
- WIP09의 `sigma.man`, `maneuverAccel`, `maneuverReferenceSpeed`를 제거했다. 표적 기동은 예측 위치와 착탄 위치 차이로만 반영한다. 관측 속도는 조준 리셋과 분리하고 표적 변경 또는 긴 관측 공백에서만 비운다.
- 차체와 포탑의 실제 방향과 각 박스의 길이·폭으로 전·측·후 투영 비중을 계산한다. 측면은 표적 기준 좌/우를 별도로 기록한다.
- 결과 추첨 뒤 독립 Box–Muller 스트림으로 점을 만든다. 명중은 선택 부위 안, 빗나감은 모든 보이는 직사각형 밖에 놓는다. 최대 64회 뒤 안전한 대체값을 쓴다.
- 빗나감 경로는 포구와 표적 평면점을 잇는 중력 포물선을 10m부터 2m 간격으로 전진한다. 지형 또는 건물 지붕과 만나는 첫 구간을 4회 이분해 `ground`, `building`, `out-of-map`, `max-distance`와 앞·뒤 거리를 기록한다.
- 팀이 착탄 때 표적을 관측하면 결과·부위·편향·좌표를 공개한다. 미관측 명중 좌표는 숨기고, 미관측 빗나감은 지면/건물 먼지 좌표와 종류만 공개하며 표적 상대 거리 `beyond`는 숨긴다. 내부 표적 ID는 공개 snapshot과 이벤트에 없다.
- 예광선은 실제 포구에서 발사 방향으로 실제 ToF 동안 진행한다. 결과 뒤 공개 가능한 명중 섬광 또는 빗나감 먼지를 2초 표시한다. 패널의 예상 확률은 한 곳이며 비행 남은 시간과 최근 탄착 종류를 표시한다.
- 프로파일에 `impact:{rejectionAttempts:64,marchStepM:2,maxBeyondM:3000}`을 추가했다. `flightSeconds`, `effectSeconds`와 통계 기동 필드는 폐기 필드로 거부한다. `data/vehicles/M1A2.json`을 다시 내보냈다.

지도·기동·차량 반경·길찾기·관측 주기와 확률·9개 표본·LOS 최적화·M1A2 도안은 유지했다. `archive/combat`의 7절은 WIP06 당시 상태를 설명해 현재 WIP08~10 사격과 다르며 아카이브 원문은 수정하지 않았다.

## 기준표와 자동 검사

사용자가 제공한 `wip10_hit_reference.py`를 그대로 `tests/fixtures/`에 보관했다. SHA-256은 `142e5001ee9bd4042a88e6011a1342a2b96cc94eb093f9b0faec069c6aaf6dc6`이다. 생성 스크립트가 체크섬을 고정하고 임시 디렉터리에서 원본을 실행해 [46행 JSON](tests/releases/WIP10-reference.json)을 만든다.

- 발사 미리보기 24행: `sigma.man` 제거 뒤 확률·차체/포탑 질량·오차·ToF
- 착탄 6행: 계속 횡단, 정지, 가속/감속, 새 출발, 거리 방향 이동의 편향과 최종 확률
- 구역 11행: 0°~360° 연속성, 차체/포탑 투영, 좌우
- 경로 5행: 표적 앞·뒤의 포물선 높이
- 추가 검사: 1000개 seed의 명중점/빗나감점, 강제 대체값, 평지 장·단탄, 건물 충돌

**Node 규칙/코어 236/236, 실제 Chromium 16/16, JS/CJS 구문 49/49, Python 구문 11/11 통과. 최종 실패 0.** [기계 판독 결과](tests/releases/WIP10-validation.json).

| 검사 | 결과 | 구분 |
|---|---:|---|
| 15개 `node --test` 파일 | 164/164 | 관측·사격·실제 코어·동결 LOS·Python 기준표 |
| `node tests/input.test.cjs` | 35/35 | 가짜 DOM 입력·취소·일시정지 |
| `node tests/map.test.cjs` | 16/16 | 실제 지도·기동 |
| `node tests/visibility.test.cjs` | 12/12 | 가시 영역·지도·등고선 |
| `node tests/vehicle.test.cjs` | 9/9 | 프로파일·기동·실제 Node Worker·오래된 응답 차단 |
| `node tests/browser.test.cjs` | 16/16 | Chromium 156.0.8078.79 DOM/Canvas/내장 Worker, 로컬 HTTP |
| `node --check` / Python AST parse | 49/49 · 11/11 | 전체 JS/CJS와 Python |

핵심 통합 검사는 발사 때 난수 0회, 착탄 때 단일 결정, 실제 ToF, 같은 기한의 ID 순서, 횡단 표적의 발사 직후 정지, 착탄 전 완전 차폐, 표적 삭제, 사수 선회·관측 상실, 공개 정보 은폐, 시나리오 초기화, seed와 1×/4× 묶음 재현성을 확인한다. 기존 드래그·핀치·입력 취소·선택 변경·일시정지·관측·Worker 회귀도 그대로 통과했다.

실제 Chromium에서는 단일 HTML 부팅, 실제 내장 Worker, 포구와 예광선/섬광의 Canvas 좌표, 비행 중 일시정지, 관측/미관측 결과, 모바일 844×390·390×844, 제공 M1A2 HTML과 네 자세의 픽셀 동일성을 검사했다. [비행 화면](tests/releases/WIP10-flight-desktop.png) · [착탄](tests/releases/WIP10-impact.png) · [미관측](tests/releases/WIP10-unobserved.png) · [브라우저 기록](tests/releases/WIP10-browser.json).

## 관측 성능 회귀

실제 지도, seed 407, 20Hz 스텝·10Hz 관측, 준비 20·측정 100스텝, 50/100대와 정지/이동 조건에서 동결 원본과 현재 LOS를 각각 3개 새 프로세스로 순차 측정했다. **24개 완전 상태 출력이 모두 같다.** Node v24.22.1, AMD EPYC 9V74, Linux x64 결과다.

| 조건 | 원본 중앙값 | 현재 중앙값 | 현재 P95 | 중앙값 감소 |
|---|---:|---:|---:|---:|
| 정지 50대 | 3.50ms | 2.54ms | 5.36ms | 27.5% |
| 정지 100대 | 17.87ms | 7.33ms | 15.46ms | 59.0% |
| 이동 50대 | 9.25ms | 3.72ms | 5.78ms | 59.8% |
| 이동 100대 | 66.74ms | 16.45ms | 19.19ms | 75.4% |

이 fixture는 발사 명령을 내리지 않으므로 새 탄 비행·탄착 생성 비용을 포함하지 않는다. CPU 고정 스텝 측정이며 전체 FPS나 동시 사격 성능이 아니다. [비교 조건과 상태 해시](tests/releases/WIP10-comparison.json) · [현재 일반 측정](tests/releases/WIP10-benchmark.json).

## 실행 파일

[GitHub 실행 ZIP](https://github.com/0-FLANDRE-0/Tactical_Project/raw/refs/heads/feat/wip10-flight-impact/Tactical_v0.4_WIP10.zip). 압축을 풀면 실행 HTML 한 파일이 나온다.

| 파일 | 바이트 | SHA-256 |
|---|---:|---|
| `Tactical_v0.4_WIP10.html` = `dist/index.html` | 8,314,287 | `017583cd603d8b97de400bf8947d24ae1c73532d06bc830885b453a7a2b518e1` |
| `Tactical_v0.4_WIP10.zip` | 1,622,838 | `95a8efdb7116029c198b83abbeec01653496dc7b1bea1f229f2efa72c653c0ba` |

`node scripts/export_vehicle_profile.cjs` → `python3 scripts/generate_wip10_reference.py` → `python3 build.py` → `python3 scripts/package_release.py WIP10` 순으로 제작했다. 반복 빌드와 ZIP이 바이트 단위로 같고, ZIP CRC와 압축 해제 HTML의 dist 일치를 확인했다. [체크섬 파일](SHA256SUMS_WIP10.txt).

## 미실행과 남은 범위

- `file://` 실행은 Chromium 정책의 `ERR_BLOCKED_BY_ADMINISTRATOR`로 차단됐다. 같은 단일 HTML을 로컬 HTTP로 실제 브라우저 검증했으며 더블클릭 실행 통과로 기록하지 않는다.
- 실제 Android 멀티터치·메모리·발열·지속 FPS, 전체 게임 FPS와 다수 동시 사격 성능은 측정하지 않았다.
- 원본 DEM/GDAL 자료 대조는 이번 사격 변경에서 다시 실행하지 않았다. 지도·높이·건물 입력은 변경하지 않았다.
- 탄속 유지율 하나와 중력 포물선을 쓰는 게임 모델이다. 공기저항·기상·탄종별 탄도·고각·도탄·신관·숲 탄체 충돌을 실제 물리로 검증한 것은 아니다.
- 관통·장갑·피해·파괴·상세 장전·탄종 다양화·AI 자동 발사·2발째 보정은 지시서대로 후속 범위다.
