# TACTICAL v0.4 WIP11B — 영구 잔해·기본 자동교전

WIP11B는 최신 main `2f1786c5d844fa2dd9086c1a69a1d6e52d18c05d`를 기존 PR #9 브랜치 `feat/wip11a-combat-state`에 정상 병합한 뒤 WIP11A를 확장했다. 강제 푸시나 대체 PR은 만들지 않았다. 적용되는 `AGENTS.md`는 없었다.

살아 있는 차량만 관측자와 행동 주체로 두고 격파 차량은 관측 후보에 남겼다. 미관측 격파도 나중에 기존 LOS·탐지·식별 규칙으로 잔해를 확인할 수 있다. 한 번 확인한 잔해는 최초 공개 위치·자세의 팀별 고정 사본으로 전투가 끝날 때까지 유지되며, 지도·명단·직접 API·지정과 자동 후보에서 제외된다. 숨은 실제 격파 상태는 동일한 공개 기억 접촉의 명령 반응이나 공개 사유를 바꾸지 않는다.

실행 시나리오의 양측 M1A2 (1998)는 차량별 `auto`로 시작한다. 기존 수동 fixture와 공통 생성 기본값은 `hold`다. 자동 발사는 자체 관측·식별·인계/포수 확보·실제 포탑 정렬·조준·발사선 재검사를 모두 통과한 뒤 수동과 같은 비행·착탄·피해 경로를 쓴다. `hold`는 관측·인계·조준을 유지하고 수동 단발을 허용한다. 현재 포수 표적 A의 관측 유예가 끝나거나 실제 포구 발사선이 차폐되면, 전차장이 직접 관측·식별한 유효한 B로 인계하고 포수가 다시 확보·조준한다. 상세 상태와 공개 정보 계약은 [구현 문서](docs/WRECK_AND_AUTO_ENGAGEMENT_WIP11B.md)에 있다.

## 검증

최종 결과는 **Node 266/266, 실제 Chromium 22/22, JavaScript/CJS 구문 56/56, Python 구문 13/13, 실패 0**이다. Node 결과는 WIP11A 기준선 249개와 WIP11B 신규 17개를 구분한다. 규칙/코어는 177+15=192, 입력은 35+2=37, 지도 16, 시야 12, 차량/Worker 9다. W01~W08, E01~E17, I01~I03은 모두 통과했다. [기계 판독 결과](tests/releases/WIP11B-validation.json)와 [브라우저 기록](tests/releases/WIP11B-browser.json)에 항목별 결과가 있다.

실제 Chromium 156.0.8078.79에서 로컬 HTTP로 소스에서 빌드한 단일 HTML을 열었다. 기본 양측 auto 무입력 사격, 차량별 auto/hold, 수동 사격, 실제 내장 Worker, 팀 공유와 자체 확보의 분리, 비행·피해·격파, 관측 격파 잔해, **미관측 격파 뒤 기억 만료와 실제 재식별·영구 표시·클릭 불가**, 선택 차량과 마지막 아군 격파의 안전한 UI, A→B 인계·재확보·자동 사격과 왕복 방지, 초기화, 데스크톱과 844×390·390×844 viewport를 확인했다. 페이지 오류는 없었다.

`file://`는 환경 정책으로 `ERR_BLOCKED_BY_ADMINISTRATOR`였고 통과로 기록하지 않았다. 정확히 같은 독립 HTML을 로컬 HTTP로 검사했다. 모바일 결과는 Chromium viewport이며 실제 Android/iOS 기기 검사가 아니다. 실제 휴대기기 멀티터치·발열·지속 프레임률은 미실행이다. [재발견 잔해](tests/releases/WIP11B-rediscovered-wreck.png) · [A→B 인계](tests/releases/WIP11B-handoff.png) · [선택 불가 잔해](tests/releases/WIP11B-wreck.png).

## 성능 fixture

CPU는 AMD EPYC 9V74, Node v24.22.1 환경이다. 아래 수치는 고정 스텝 CPU 시간이며 전체 게임 FPS가 아니다.

| fixture | 조건 | 중앙값 | P95 |
|---|---|---:|---:|
| 관측 | 정지 50대, 100스텝 | 2.998ms | 5.815ms |
| 관측 | 정지 100대, 100스텝 | 8.340ms | 16.093ms |
| 관측 | 이동 50대, 100스텝 | 4.638ms | 6.373ms |
| 관측 | 이동 100대, 100스텝 | 17.659ms | 22.359ms |
| 활성 auto | 정지 50대, 600스텝 | 2.312ms | 5.383ms |
| 활성 auto | 정지 100대, 600스텝 | 8.008ms | 14.193ms |
| 피해 적용 | 해결 착탄 10,000건, 15회 | 19.128ms/회 | 29.727ms/회 |

활성 auto 50대는 30초에 125발/125착탄, 격파 17대, 재표적 사건 13건이었다. 100대는 314발 중 309착탄을 해결하고 종료 시 5발이 비행 중이었으며, 격파 39대와 재표적 사건 56건이었다. 관측·인계·조준·자동 요청·비행·피해·격파·재표적과 제한된 로그를 포함하고 렌더링·길찾기는 제외한다. [관측 fixture](tests/releases/WIP11B-benchmark.json) · [활성 auto fixture](tests/releases/WIP11B-auto-benchmark.json) · [착탄 fixture](tests/releases/WIP11B-combat-benchmark.json).

## 실행 파일

[GitHub 실행 ZIP](https://github.com/0-FLANDRE-0/Tactical_Project/raw/refs/heads/feat/wip11a-combat-state/Tactical_v0.4_WIP11B.zip)을 내려받아 압축을 풀면 외부 의존성 없는 HTML 한 파일이 나온다.

| 파일 | 바이트 | SHA-256 |
|---|---:|---|
| `Tactical_v0.4_WIP11B.html` = `dist/index.html` | 8,339,591 | `4069a9e6e5cdc01b9e9d7f030233d3201f84d36db1c8284c662fa6525b34aeb5` |
| `Tactical_v0.4_WIP11B.zip` | 1,629,733 | `7921646d14438cb5477afb5749b5ebfd90c2ac7bd0fae521f0898aecbe00a986` |

ZIP에는 `Tactical_v0.4_WIP11B.html` 한 파일만 있으며 CRC-32는 `311795d1`다. 해제한 HTML과 `dist/index.html`이 일치하고, 같은 입력의 반복 패키징도 바이트 단위로 일치했다. [체크섬](SHA256SUMS_WIP11B.txt).

## 남은 범위

정교한 위협 점수와 전체 OODA, 자유사격/응사만/사격금지 ROE, 적 자율 이동·엄폐, 탄종 선택·상세 장전·보급, 모듈·승무원·화재·유폭·수리, 비관통 근접피해 적용은 후속이다. WIP10부터 남은 미관측 빗나감 먼지 공개 정책도 미결정 상태를 유지한다.
