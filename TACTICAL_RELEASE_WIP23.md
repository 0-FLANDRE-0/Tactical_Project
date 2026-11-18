# TACTICAL v0.4 WIP23 릴리스·검증

브랜치 `feat/wip23-t80u-fire-autoloader`, 시작점 `a8ef6eb64c5c802c4deaeac1618a788e0bb1caff`. main 병합과 공개 배포는 수행하지 않는다.

## 구현

- 정지·관측·사격 가능하지만 기동/AI가 없는 `T80U_1989`
- 2A46M-1, 3BM42, 125mm APFSDS 피해 곡선과 근접 비관통 피해 비활성
- 장전 1+저장 12발, 정확한 6.00초 자동장전, 보충 비활성
- M1A2_1998의 명시적 3BM42 피격 반응·탄약고 사고 공격탄 정책
- 기존 관측/방호 시나리오 마스크와 새 `t80u-fire` 페이지 시나리오
- 아군 T-80U 탄약·자동장전 UI, 적 내부 정보 비공개

## 검증 기준

최종 명령별 실제 결과와 산출물 바이트/CRC/SHA-256은 [WIP23-validation.json](tests/releases/WIP23-validation.json)에 기록한다. 핵심 코어 검사는 3BM42 표/피해 곡선, M1 정책 연결, 실제 탐지→확보→발사→비행→착탄, 13발 보존, 6초 간격, 보류 중 장전, 격파 취소와 기존 시나리오 마스크를 포함한다.

`scripts/benchmark_wip23.cjs`는 작성 기준 `origin/main`의 내장 코어와 현재 코어를 별도로 조립한다. seed 7로 기본 전투·방호시험·관측시험을 각각 90초 실행해 정규화한 차량/접촉/관측/전투 상태가 정확히 같음을 확인하고, 새 교전시험은 3개 seed를 각 90초 측정한다. 결과는 [WIP23-performance.json](tests/releases/WIP23-performance.json)에 있다.

실제 Chromium 증거는 [WIP23-browser-evidence.json](tests/releases/WIP23-browser-evidence.json)과 `tests/releases/WIP23-t80u-*.png`에 있다. 이는 가짜 DOM이 아니라 시스템 Chromium에서 단일 HTML을 실행한 결과다.

## 제한

M1A2 정면 비관통은 정상 결과이며 강제 관통으로 우회하지 않았다. 측면 배치 검증은 공통 피해 경로 확인용이다. T-80U 기동/AI·혼합 적재·보급·장전장치/승무원/탄약고 피해·ERA 소모는 후속 범위다. 모든 신규 무장/사격 수치는 게임 시험 데이터다.
