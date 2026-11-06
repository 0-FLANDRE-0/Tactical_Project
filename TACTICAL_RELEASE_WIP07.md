# TACTICAL v0.4 WIP07

## 기준과 결과

main `5eea28cf80deaa1ffdf9494090d3e2e3f621e636`에서 시작했다. 원격 main도 같고 작업 트리는 깨끗했으며 AGENTS.md는 없었다. 구현 브랜치는 `feat/wip07-observation`이다. 지도·기동·4.62m 반경·길찾기 계약과 WIP06/과거 archive는 보존했다. main 병합과 사이트 배포는 수행하지 않았다.

실제 전차장/포탑 선회, 200m 전방위 실루엣 채널, 전차장 2500m/90°/50°/s, 포수 2000m/60°/40°/s, 방향·시간·seed 기반 탐지/식별, 마지막 자세 기억, 개별 경계, 헌터킬러 인계/포수 자체 확보까지 연결했다. [구현·설정·공개 정보 계약](docs/OBSERVATION_WIP07.md)과 [첨부 계획 보존본](docs/TACTICAL_OBSERVATION_IMPLEMENTATION_PLAN.md)을 참조한다.

## 실행 파일

- 권장 다운로드: [Tactical_v0.4_WIP07.zip](https://github.com/0-FLANDRE-0/Tactical_Project/raw/refs/heads/feat/wip07-observation/Tactical_v0.4_WIP07.zip) — **1,603,496바이트**. 실행 HTML 하나만 포함한다. ZIP CRC와 압축 해제한 HTML의 SHA-256/바이트 일치를 확인했다. 게임 소스와 HTML 내용은 바꾸지 않았다.
- ZIP SHA-256: `8ba5e4c1231d705db148c5966ad0575c4cb3ba55b1d68b65f44cac2244d9c4b5`.
- [Tactical_v0.4_WIP07.html](Tactical_v0.4_WIP07.html)과 [dist/index.html](dist/index.html)은 **8,251,170바이트**, 완전히 같은 바이트다.
- SHA-256: `60748e83cb4720f692906467da767acf8912cacac8cc2ec7b61668bf18b19a5b`.
- [체크섬 파일](SHA256SUMS_WIP07.txt), [기계 판독 검증 기록](tests/releases/WIP07-validation.json).
- `src`에서 `python3 build.py`로 생성했다. `dist`만 직접 수정하지 않았다. 새 observation 모듈을 HTML·build·Worker·검사·개발 스크립트 로더에 연결했다. 일반 build는 dist만 갱신하므로 버전 HTML 사본은 별도로 일치시켰다.
- 실행 데이터와 코드는 한 파일에 포함된다. 이 환경의 file:// 정책 차단으로 더블클릭 경로는 검증하지 못했으며, 같은 HTML을 로컬 HTTP로 제공하여 실제 Chromium에서 실행했다.

## 실행한 검증

2026-11-06, Node v24.22.1, Python 3.12.14, Linux x64. **Node 127/127**, **실제 Chromium 10/10**, **구문 28/28** 통과. 실패한 최종 기능 검사는 없다. 기존 화면 연출 14개 검사는 실제 포즈 어댑터 검사 3개로 교체했고 나머지 입력·지도·시야·차량 회귀를 유지했다.

| 명령 | 결과 | 환경 |
|---|---:|---|
| `node --test tests/look-animation.test.cjs tests/ui-cache.test.cjs tests/observation.test.cjs tests/observation-core.test.cjs` | 55/55 | Node pure + actual core/flat/real-map tests |
| `node tests/input.test.cjs` | 35/35 | fake DOM and renderer |
| `node tests/map.test.cjs` | 16/16 | actual map and mobility |
| `node tests/visibility.test.cjs` | 12/12 | geometry and coverage fixture |
| `node tests/vehicle.test.cjs` | 9/9 | mobility/profile + actual Node worker and fake stale-response worker |
| `node tests/browser.test.cjs` | 10/10 | 실제 Chromium 156.0.8078.79 DOM/Canvas/내장 Worker |
| 모든 src JS / tests CJS / scripts CJS의 `node --check` | 28/28 | 구문 검사 |
| 프로파일 내보내기·단일 HTML 빌드·사본/체크섬·반복 빌드 | 통과 | Python/Node |

새 관측 검사는 200m 제한·중심/시간 효과·숲/부위·독립 선회·정지/도착·경계 우선·거리 밖 대기와 만료·장비 플래그·미발견 좌표 비사용·정보 비공개·기억 위치 고정·seed/배속/렌더 묶음·초기화·광선 캐시 무효화를 확인한다. 팀 정보 공유가 자기 포수 확보로 바뀌지 않는 것도 확인한다. 실제 노출/지도 검증과 합성 센서 규칙 검사를 구분했다.

브라우저 확인 항목:

- single HTML starts offline with actual canvas
- guard world point input, actual turret pose and pause
- terrain hold runs real embedded Worker and composes sectors
- silhouette reuses artwork but contains only black opaque pixels
- unidentified marker, click and panel hide ID/type/exposure; render never calls LOS
- identified and remembered contacts update panel permissions then expire selection
- mobile viewport 844×390 has no horizontal overflow and controls stay in map
- mobile viewport 390×844 has no horizontal overflow and controls stay in map
- reduced-motion and normal views keep same actual observation state
- no application page errors

브라우저는 실제 Canvas 픽셀의 검은 실루엣도 검사한다. 정보 공개 패널 검사는 통제된 접촉 사본 하나를 주입하며, 가짜 DOM 검사와 구분한다. [데스크톱](tests/releases/WIP07-desktop.png), [844×390](tests/releases/WIP07-844x390.png), [390×844](tests/releases/WIP07-390x844.png), [실루엣 선택](tests/releases/WIP07-silhouette-panel.png), [기억](tests/releases/WIP07-memory.png) 스크린샷을 남겼다.

## 관측 비용

`node scripts/benchmark_observation.cjs`: 실제 지도, 양 진영이 관측하는 정지 격자, seed 407, 20스텝 준비 후 100회 0.05초 스텝. 공간 후보/각도 선별·현재 선회·10Hz 관측·정확한 LOS/유효한 광선 캐시·팀 병합을 포함한다. [fixture와 원시 수치](tests/releases/WIP07-benchmark.json)에 좌표식·조회/캐시 횟수를 기록했다.

| 총 차량 | 스텝 중앙값 | p95 | 최대 | 팀 공개 사본 조회 중앙값 |
|---:|---:|---:|---:|---:|
| 50 | 5.03ms | 10.10ms | 12.68ms | 0.016ms |
| 100 | 21.12ms | 49.66ms | 86.24ms | 0.032ms |

기존 46/57ms는 다른 표시 루프 측정이므로 이 수치와 직접 비교하지 않는다. 이는 전체 FPS나 실기기 성능이 아니다. 100대에서는 일부 스텝이 50ms를 넘는다. 움직이는 차량이 많으면 정확히 같은 광선 캐시가 덜 재사용되므로 추가 성능 조정이 필요할 수 있다.

## 차단·미실행·후속 범위

- `file://` 브라우저 이동은 `ERR_BLOCKED_BY_ADMINISTRATOR`로 차단됨. 로컬 HTTP 실행은 통과. 이를 파일 더블클릭 실행 통과로 기록하지 않는다.
- 실제 Android 터치/멀티터치·전체화면·방향 고정·발열·지속 프레임률은 미실행.
- 원본 DEM/GDAL 대조는 미실행. 전장 원본/높이장/내비게이션 캐시는 변경하지 않았다.
- 100대 이동 편대의 지속 브라우저 FPS는 미측정. 위 정지 fixture CPU 수치만 제공한다.
- 발사·탄도·장갑·관통·피해·재장전·고각은 요청대로 후속 범위다.
