# TACTICAL v0.4 WIP22 릴리스·검증

2026-11-15 기준 WIP22는 main `04b937d99ede7e840b53559ee5a249551bc407de`에서 새로 만든 `feat/wip22-t80u-observation-traverse` 브랜치에 구현했다. WIP21의 수정 T-80U 도안·장갑·HP·비소모 Kontakt-5를 유지하고, 정지 T-80U의 자체 관측·전차장 자동 인계·실제 포탑/큐폴라 선회·포수 자체 확보를 추가했다. main 병합과 공개 배포는 별도 검토 전에 진행하지 않는다.

## 구현 결과

- `T80U_1989`은 `target=true, observation=true, mobility=false, fire=false, ai=false`를 자체 검증하는다. 기동/발사/AI 프로파일과 운용 상태는 생성하지 않는다.
- 포탑 24°/s, 전차장 큐폴라 40°/s 상한은 인용한 2차 자료에서 채택했다. 원 교범/실기기 측정으로 독립 검증하지 않았다. 2,000m·90°/30° FOV, 관측점 높이, 12°/s·8°/s 탐색, 0.50초 인계·0.40초 확보는 조정 가능한 주간 게임 시험값이다.
- CITV/hunter-killer 호환 필드와 전차장 표적 지시 허용을 분리했다. M1A2는 기존 `hunterKiller` 값을 legacy fallback으로 쓰어 시간·우선순위·행동이 달라지지 않고, T-80U는 CITV 복사 없이 전차장 지시만 명시한다.
- 새 `T-80U 관측시험`은 적 T-80U 한 대와 아군 M1A2(1998) 한 대를 배치한다. M1A2는 최초 보류이며 기존 UI로 자동 전환할 수 있다. T-80U의 차체는 고정되고 포탑/큐폴라만 실제 관측 상태에서 돌아간다.
- WIP21 `T-80U 방호시험`은 차량별 실행 마스크로 관측 상태 자체를 생성하지 않고 기존 차체·포탑·큐폴라 자세를 유지한다. 마스크는 프로파일이 비활성한 기동/발사/AI를 켤 수 없다.
- 관측 전용 차량에서 AI/fire-control 함수를 무조건 호출하던 경로를 능력 검사로 막았다. 접촉 추적은 최신 유효 관측 `pose`만 사용하며, 기억 중 숨은 실제 표적을 따라가지 않는다.

자세한 좌표·상태·정보 경계는 [WIP22 구현 문서](docs/T80U_OBSERVATION_AND_TRAVERSE_WIP22.md)에 있다.

## 검증

### 통과

| 명령/묶음 | 결과 |
|---|---|
| `node --check` 변경 JS 6개 | 6/6 통과 |
| `node --test --test-concurrency=2 tests/*.test.cjs` | **378/378 통과**, 실제 Chromium 스크립 포함 |
| `node --test tests/wip22-t80u-observation.test.cjs` | WIP22 코어 8/8 통과 (전체 묶음에 포함) |
| `node tests/wip22-browser.test.cjs` | WIP22 실제 Chromium 1/1 통과 (전체 묶음에 포함) |
| `python3 -m unittest -v tests/terrain_readability_test.py` | 7/7 통과 |
| `node scripts/benchmark_wip22_observation.cjs` | 완료, Node CPU/query/ray/상태 해시 기록 |
| `node scripts/benchmark_wip22_browser.cjs` | 완료, Chromium CPU/query/ray 기록 |
| 내보내기→빌드→`python3 scripts/package_release.py WIP22` 2회 | HTML·ZIP 바이트 재현, 압축 해제 HTML=`dist/index.html` |

Node 전체 묶음은 기존 코어/입력/지도/시야/차량/Worker, WIP12·15·16·17·18·19·20·21 실제 Chromium 회귀, WIP22 코어/브라우저를 포함한다. WIP22 브라우저 검사는 Chromium 156.0.8078.79에서 1440×900, 844×390 DPR1/2, 390×844를 실행했다. 실제 화면 내의 현재 관측 T-80U로 카메라를 맞춘 탐색 전/확보 후 증거와 모바일/세로 화면을 `tests/releases/WIP22-*.png`에 남겼다.

seed 7 실제 코어/브라우저에서 T-80U는 40.45초 탐지, 46.95초 식별, 47.50초 전차장 지정 접수, 53.90초 포수 자체 확보로 진행했다. 초기 35초 탐색의 매 틱 변화는 포탑 8°/s·큐폴라 12°/s 이하, 지정/추적 포함 전체는 24°/s·40°/s 이하였다. 위치·차체 방위는 변하지 않았다.

### 환경 부재로 미실행

- `tests/battlefield_dem_validation_test.py`와 `tests/source_quality.py`는 이 환경에 Python `osgeo`/GDAL 모듈이 없어 import 단계에서 실행하지 못했다. 통과로 기록하지 않는다. WIP22에서 DEM 생성 코드·원본 지도는 변경하지 않았다.
- 실물 T-80U, 원 교범, 실제 야전 광학계, 실제 휴대폰의 멀티터치·발열·지속 FPS는 검증하지 않았다.

## 성능 측정

AMD EPYC 9V74, Node v24.22.1의 0.05초 고정 스텝 CPU이다. 각 값은 새 프로세스/시나리오 3회 측정의 중앙값이며 렌더링은 없다.

| 장면 | 중앙 / P95 | query / ray (각 trial) | 비고 |
|---|---:|---:|---|
| WIP21 기준 기본 | 0.3593 / 0.6310ms | 1,750 / 23,595~25,179 | 5초 예열+30초 측정 |
| WIP22 기본 | 0.3618 / 0.6150ms | 위와 정확히 일치 | trial별 공개 상태 해시도 일치 |
| WIP21 기준 방호시험 | 0.0286 / 0.0731ms | 350 / 1,296~1,314 | 관측 비활성 T-80U 3대 |
| WIP22 방호시험 | 0.0252 / 0.0940ms | 위와 정확히 일치 | 실행 마스크 회귀 |
| 탐색 50 / 100 관측자 | 0.3635 / 0.7146ms · 0.6707 / 1.2230ms | 10,000/17,721~18,072 · 20,000/31,401~32,004 | 적 1대, 20초 측정 |
| 추적 50 / 100 관측자 | 0.3146 / 1.2168ms · 0.6126 / 2.0316ms | 10,000/30,600 · 20,000/61,200 | 전차장/포수 지정, 적 1대 |

합성 관측자는 실제 지형의 60×30m(50대) 또는 60×60m(100대) 밀집 배치와 비활성 정지 M1A2 표적 1대를 사용했다. 차폐 때문에 추적 예열 후 확보는 50대 중 32대, 100대 중 48대였으며 이 수를 결과 JSON에 함께 남겼다. 차량별 추가 LOS를 그러내기 위해 차폐를 무시하지 않았다.

실제 Chromium 156, 1440×900 DPR1의 시뮬레이션+캔버스+DOM 프레임 CPU 중앙/P95는 WIP21 기준 기본 0.8/1.6ms, WIP22 기본 0.8/1.8ms, WIP21 기준 방호 0.6/1.1ms, WIP22 방호 0.5/1.0ms, WIP22 관측시험 0.4/0.8ms였다. 헤드리스 서버 CPU 시간이며 실기기 FPS·발열 결과가 아니다. 재현 조건과 trial은 `tests/releases/WIP22-observation-performance.json`, `WIP22-browser-performance.json`에 있다.

## 배포물

| 파일 | 바이트 | SHA-256 |
|---|---:|---|
| `Tactical_v0.4_WIP22.html` | 8,543,060 | `ba7831693f107d50aef83e87afba7298d466c997abfc09dc3b57453d8c438366` |
| `dist/index.html` | 8,543,060 | `ba7831693f107d50aef83e87afba7298d466c997abfc09dc3b57453d8c438366` |
| `Tactical_v0.4_WIP22.zip` | 1,694,685 | `536b6b35781dc5da382872f5dbcd63c1a7adc8820871907bed6c959cc41674ab` |

ZIP은 `Tactical_v0.4_WIP22.html` 한 파일만 포함한다. 압축 데이터는 1,694,539바이트, CRC-32는 `b680a4af`이며 압축 해제 바이트는 `dist/index.html`과 같다. 체크섬은 `SHA256SUMS_WIP22.txt`에 있다.

검토용 직접 ZIP 다운로드 URL은 브랜치 push 후 다음과 같다.

`https://raw.githubusercontent.com/0-FLANDRE-0/Tactical_Project/refs/heads/feat/wip22-t80u-observation-traverse/Tactical_v0.4_WIP22.zip`

## 남은 범위

T-80U의 125mm 주포/기관총, 탄약·자동장전, 기동/순찰/교전 AI, 승무원·모듈·탄약고 피해, ERA 손상·소모·폭발, 야간·열상·날씨·배율·포신 고저각은 구현하지 않았다. T-80U 장갑·HP·ERA와 관측 절차 수치는 게임 시험 데이터이며 실차 성능 보증이 아니다.
