# TACTICAL v0.4 WIP11A — M1A2 (1998) 기본 피해·격파

WIP11A는 최신 main `33900e6282f111926b167591480b44c4f1343093`에서 시작했다. 작업 브랜치는 `feat/wip11a-combat-state`이며 main 병합과 공개 배포는 하지 않았다. 적용 AGENTS.md는 없었다.

양측 활성 차량을 `M1A2_1998`, 단일 시험탄을 `M829A2`로 연결했다. 차량은 최대 HP 1,450, M829A2는 100% 기준 피해 405와 사용자 지정 A1 피해 곡선을 사용한다. 기존 `M1A2` ID는 WIP10 역사 기준표용 동결 fixture로 남겼다. 치수·기동·센서·도안은 기존 게임 설정을 이어 쓰며 1998년형의 새 실측 제원으로 주장하지 않는다.

## 구현

DOM과 Canvas에 의존하지 않는 `src/combat-state.js`가 탄약 레지스트리, 거리/입사각 관통표 보간, 피해 순수 계산과 유닛 HP 상태 변경을 분리한다. 표 밖은 끝값 고정, 비관통 피해는 0, 추가 탄속 피해 보정은 1이다. 내부 HP는 실수로 유지하고 화면에서만 반올림한다.

WIP10 `finishDue()`가 명중·구역·좌우를 확정한 직후 공개 정제 전에 내부 콜백으로 피해를 적용한다. 발사 때는 HP를 줄이지 않는다. 실제 탄 ID는 사수별 순번으로 압축해 중복 처리를 막고, 공개·UI·진단 조회는 상태나 난수를 바꾸지 않는다. 피해 계산에는 새 난수가 없다.

격파는 HP 0에서 한 번만 발생한다. 격파 유닛은 이동·경계·지정·새 사격·관측을 중단하지만 이미 발사한 탄은 계속 해결된다. 위치와 동적 차량 반경은 잔해로 남아 통행을 막는다. 착탄 순간 관측된 적 격파만 고정된 공개 잔해 사본으로 보이며, 미관측 명중은 내부 피해를 적용해도 구역·방호·피해·HP·새 좌표를 공개하지 않는다. 상세 규칙은 [구현 문서](docs/COMBAT_STATE_WIP11A.md)에 있다.

선택 아군 패널에는 형식, M829A2, 현재/최대 HP와 생존/격파 상태를 표시한다. 허용된 현재 관측에서만 최근 관통·피해를 보여 준다. 격파 잔해는 어두운 실루엣과 X 표시를 사용한다.

## 검증

최종 결과는 **Node 249/249, 실제 Chromium 17/17, JavaScript/CJS 구문 54/54, Python 구문 13/13, 실패 0**이다. Node 249개에는 기존 WIP10 기준선 236개와 WIP11A 새 검사 13개가 포함된다. V01~V16은 모두 통과했다. [기계 판독 결과](tests/releases/WIP11A-validation.json)와 [브라우저 기록](tests/releases/WIP11A-browser.json)에 항목별 결과가 있다.

실제 Chromium 156.0.8078.79에서 로컬 HTTP로 단일 HTML을 열어 내장 시야 Worker, 초기 M1A2 (1998)/M829A2/HP, 관측·인계·조준, 비행 중 HP 유지, 착탄 피해, 미관측 비공개, 강제 저HP 실제 격파, 잔해 표시·명령 거부, 초기화, 데스크톱과 844×390·390×844 viewport를 확인했다. `file://`는 환경 정책으로 `ERR_BLOCKED_BY_ADMINISTRATOR`였고 통과로 기록하지 않았다. 모바일 검사는 Chromium viewport이며 실기기 검사가 아니다. [격파 화면](tests/releases/WIP11A-wreck.png) · [착탄 화면](tests/releases/WIP11A-impact.png).

관측 CPU fixture는 기존 조건을 유지했다. 이동 100대 고정 스텝 중앙값 16.60ms, P95 19.39ms였다. 여러 착탄 합성 검사는 이미 해결된 착탄 10,000건과 전체 중복 재전달을 15회 측정해 중앙값 21.07ms, P95 29.15ms였고 HP 중복 변화가 없으며 기록은 200건으로 제한됐다. 둘 다 전체 게임 FPS가 아니다. [관측 측정](tests/releases/WIP11A-benchmark.json) · [착탄 측정](tests/releases/WIP11A-combat-benchmark.json).

## 실행 파일

[GitHub 실행 ZIP](https://github.com/0-FLANDRE-0/Tactical_Project/raw/refs/heads/feat/wip11a-combat-state/Tactical_v0.4_WIP11A.zip)을 내려받아 압축을 풀면 외부 의존성 없는 HTML 한 파일이 나온다.

| 파일 | 바이트 | SHA-256 |
|---|---:|---|
| `Tactical_v0.4_WIP11A.html` = `dist/index.html` | 8,331,679 | `07eaba90265db0ad60e27531db1492b7c2c52c80ad7b5da2308654e603922e9f` |
| `Tactical_v0.4_WIP11A.zip` | 1,627,413 | `2c26e92e8094f54b626ad7952d0856d26e6bf623f9c6cc78726974d92812e2a7` |

ZIP에는 `Tactical_v0.4_WIP11A.html` 한 파일만 있으며 CRC-32는 `d3db5f94`다. 해제한 HTML과 `dist/index.html`이 일치하고, 같은 입력의 반복 패키징도 바이트 단위로 일치했다. [체크섬](SHA256SUMS_WIP11A.txt).

## 후속 범위

생존 차량의 모듈·궤도·승무원 피해, 화재·유폭·수리, ERA/복합장갑 소모, 다른 차종·탄종, 고폭/파편, 탄종 선택, 상세 장전·보급과 AI 자동 사격은 구현하지 않았다. `upper` 구역은 기존 명중 분배에서 0인 상태다. 실제 휴대기기 멀티터치·발열·지속 프레임률도 미실행이다.
