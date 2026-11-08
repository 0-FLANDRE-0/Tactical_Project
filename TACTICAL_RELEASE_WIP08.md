# TACTICAL v0.4 WIP08 — 프로파일 레지스트리·조준·단발 발사

2026-11-07 KST. `main`의 WIP07B 병합 커밋 `ba5f46e5f03900d74cb0eff50e75fe945bb45486`에서 최신 `a832a89cdc4217d24c208a3430c4b2cde78cf899`로 fast-forward했다. 추가 변경은 archive 설계 문서였고 그대로 보존했다. 시작 작업 트리는 깨끗했고 적용 AGENTS.md는 없었다. 작업 브랜치는 `feat/wip08-aim-fire`다. 마지막 원격 확인에서도 main은 `a832a89`였다. 이번 브랜치는 main 병합·공개 배포하지 않는다.

## 구현 결과

- 불변 차량 ID 레지스트리: 등록 목록/엄격한 조회/중복 거부/복사 후 동결. `profileId`와 `artId`, 공유 제원과 차량별 조준·시험탄 상태를 분리했다. 현재 등록은 M1A2 하나이며 archive의 32종/탄약 자료는 자동 수입하지 않았다.
- 자체 포수 확보 → 실제 포탑 정렬 → 유효 시뮬레이션 시간 1.2초 조준 → 발사 버튼/G → 다음 0.05초 스텝의 단발 판정. 팀 정보만으로는 발사되지 않는다.
- 발사 순간 현재 포수 FOV·거리·9개 표본과 낮은 발사선 차폐를 재검사한다. 거부하면 탄수·발사 번호·난수를 소비하지 않는다. 지정 취소는 대기 중 발사도 취소한다.
- 먼저 명중/빗나감을 선택하고, **명중한 경우에만** 차체·포탑 전/측/후 중 하나를 조건부 선택한다. 노출·실제 차체/포탑 방향·거리·관측된 이동을 게임 가중치로 쓴다. 통합 상부 키는 유지하되 고각 모델이 없어 확률 0이다.
- 미식별/기억 정보 비공개를 유지한다. 명중 결과와 선/섬광은 기록된 발사 순간 위치에 고정되고 숨겨진 적을 따라가지 않는다. 렌더링·패널은 LOS를 조회하지 않는다.
- 새 모듈을 HTML/build/내장 Worker/Node·입력·fixture·길찾기 로더에 연결하고 프로파일 JSON·등록 목록을 내보냈다. 지도·차량 반경·길찾기와 이전 릴리스/아카이브는 보존했다.

설계 아카이브의 새 세부 장갑면 메모는 미확정 아이디어이며 이번 구현의 확정 지시로 취급하지 않았다. 모든 사격 수치는 **실차 성능을 재현한 값이 아닌 시험용 게임 튜닝**이다. [구현 상태·레지스트리 API·모든 초깃값](docs/FIRE_CONTROL_WIP08.md).

## 실행과 다운로드

[GitHub 실행 ZIP 다운로드](https://github.com/0-FLANDRE-0/Tactical_Project/raw/refs/heads/feat/wip08-aim-fire/Tactical_v0.4_WIP08.zip) — 압축 해제 후 HTML 한 파일을 브라우저에서 연다. 표적을 탭하고 필요하면 포수 직접 지정 → 자체 확보/조준 완료 → 발사 버튼 또는 G. 자동 발사는 없다. 판정 결과는 보이지만 피해/파괴는 아직 없다.

| 파일 | 바이트 | SHA-256 |
|---|---:|---|
| `Tactical_v0.4_WIP08.html` = `dist/index.html` | 8,279,627 | `1747a03cfa1aa34d9b06f723581eca61d5e821459ef0b39f337e61727688b69a` |
| `Tactical_v0.4_WIP08.zip` | 1,612,217 | `6e62c5df58f2d2b27265b84cb8a150ee3d8c94efa1cb6b389ca13f059e1bdf31` |

`src` 수정 → `node scripts/export_vehicle_profile.cjs` → `python3 build.py` → `python3 scripts/package_release.py WIP08`. 두 번 빌드/패키징한 바이트가 같고 ZIP CRC·단일 HTML 구성·압축 해제 후 dist와 동일함을 확인했다. [체크섬 파일](SHA256SUMS_WIP08.txt).

## 검증

**Node 187/187, 실제 Chromium 14/14, JS/CJS 구문 41/41, Python 구문 2/2 통과. 최종 실패 0.** 기존 Node 160개를 유지하고 27개를 추가했다. 상세 명령·출처·해시는 [기계 판독 기록](tests/releases/WIP08-validation.json)에 있다.

| 검사 | 결과 | 환경 |
|---|---:|---|
| 관측/LOS/연출/UI 캐시 + registry/fire-control/fire-core `node --test` | 115/115 | 순수 규칙·실제 코어·명시적 합성 지형·동결 원본 대조 |
| `node tests/input.test.cjs` | 35/35 | **가짜 DOM** 입력 회귀 |
| `node tests/map.test.cjs` | 16/16 | 실제 지도·기동 |
| `node tests/visibility.test.cjs` | 12/12 | 영역 기하·지도 |
| `node tests/vehicle.test.cjs` | 9/9 | 프로파일·기동·**실제 Node Worker**·오래된 응답 차단 |
| `node tests/browser.test.cjs` | 14/14 | **실제 Chromium 156.0.8078.79**, DOM/Canvas/내장 Worker, 로컬 HTTP |
| `node scripts/benchmark_los_compare.cjs` | 24개 완전 상태 출력 일치 | 6개 독립 순차 프로세스 |
| `node --check` / Python `compile` | 41/41 · 2/2 | src/scripts/tests 및 build/package |

새 검사는 확보/정렬/시간의 구분, 팀 공유와 자체 확보의 차이, 최신 시야/낮은 발사선, 취소·초기화, 탄수/중복 입력/장비 비활성, 빗나감과 조건부 부위, 완전 가림의 0 확률, 차체/포탑 독립 방향, 별도 seed·읽기·1×/2× 묶음 재현성과 독립 프로파일을 포함한다. 실제 기본 시나리오에서도 식별 → 직접 지정 → 조준 → 단발 이벤트/탄수 차감을 추가 확인했다.

브라우저에서는 실제 코어로 확보한 표적에 버튼 발사 후 결과·41발 표시, 발사 간격과 일시정지 중 G 차단, 초기화를 확인했다. 기존 실루엣·기억·자체/팀 정보·입력 취소·장비 선택·실제 선회/관측 부채꼴·축소 모션·모바일 배치를 유지했다. [브라우저 기록](tests/releases/WIP08-browser.json) · [단발 결과 화면](tests/releases/WIP08-shot.png) · [세로 390×844](tests/releases/WIP08-390x844.png) · [가로 844×390](tests/releases/WIP08-844x390.png).

검증 도중 브라우저 assertion이 150ms UI 갱신 전에 읽는 문제는 두 프레임 대기로 수정했다. 포탑만 보이는 낮은 벽 fixture는 실제 식별이 8초보다 오래 걸려 관측을 16초 허용했다. 탐지 규칙/확률을 완화하지 않고 최종 전체 검사를 다시 통과했다.

## 성능 회귀

AMD EPYC 9V74, Node v24.22.1, Linux x64. 실제 지도·seed 407·20Hz 스텝/10Hz 관측, 20스텝 준비 후 100스텝 측정. 50/100대 절반씩 양 진영, 기존과 같은 합성 이동 궤적이며 궤적 생성 비용은 제외한다. 별도 프로세스로 원본 LOS/최적화 LOS 각 3회 순차 실행, 실행 순서 교대. 양쪽 모두 **현재 관측 및 새 사격 상태 처리**를 실행한다. 사격 입력은 없으므로 발사 순간 추가 LOS나 대규모 전투 성능을 측정한 것은 아니다.

| 조건 | 원본 LOS 중앙값 | 현재 중앙값 | 현재 P95 |
|---|---:|---:|---:|
| 정지 50대 | 3.42ms | 2.18ms | 4.43ms |
| 정지 100대 | 16.73ms | 6.93ms | 14.31ms |
| 이동 50대 | 9.20ms | 3.69ms | 4.68ms |
| 이동 100대 | 63.83ms | 15.91ms | 18.33ms |

각 프로세스 통계 3개의 중앙값이다. CPU 스텝 시간이며 전체 FPS가 아니다. 새 상태 처리 추가 후에도 이동 100대에서 기존 보수적 LOS 가속 효과가 유지됐다. 동결 원본 LOS 13,805건/노출 1,000건도 정확히 일치한다. 원본 oracle은 수정하지 않았다.

[개별 실행·최종 상태 해시·비교 조건](tests/releases/WIP08-comparison.json) · [일반 벤치마크](tests/releases/WIP08-benchmark.json) · [LOS 정확성](tests/releases/WIP08-los-equivalence.json).

## 미실행과 남은 범위

- file://는 실제 시도했으나 Chromium의 `ERR_BLOCKED_BY_ADMINISTRATOR`로 차단됐다. 동일 단일 HTML을 로컬 HTTP에서 검증했으며 더블클릭 실행 통과로 기록하지 않는다.
- 실제 Android 터치/발열/메모리/지속 FPS, 전체 게임 100대의 지속 FPS·동시 사격 성능, 원본 DEM/GDAL 대조는 미실행이다.
- 실제 탄도·탄착점·고각·정밀 포구 충돌, 관통·장갑·피해·파괴, 탄종 선택·상세 장전·적 자동 사격 AI는 후속 작업이다. 시험탄 42발과 1초 입력 간격을 상세 재장전 모델로 해석하지 않는다.
- 다른 차체 크기의 이동 계약/캐시는 아직 준비하지 않았다. 이번에는 등록 구조와 독립된 설정/상태를 만들고 기존 M1A2 이동 계약을 보존했다.
