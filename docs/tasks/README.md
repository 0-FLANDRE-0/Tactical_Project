# 작업 지시서

예정·진행 중인 작업의 요구사항과 완료 기준을 보관한다. 지시서가 있다는 사실은 구현 완료를 뜻하지 않는다. 실제 구현 상태는 작업 브랜치의 코드와 해당 버전의 완료 보고·검증 기록으로 확인한다.

## 현재 작업

| 작업 | 지시서 | 상태 |
|---|---|---|
| WIP20 M1A2(1998) 전용 탄약고 사고 | [작업 지시서](TACTICAL_WIP20_M1A2_AMMUNITION_INCIDENTS.md) | 지시서 등록 · 구현/검증 대기 · 탄약 소실/격리 화재·일시 사격 중단/치명 사고 · 확률/시간은 시험 제안 |
| WIP19 탄약 운용·3종 탄약과 우측 명령/선택 정보 패널 | [완료 안내](TACTICAL_WIP19_AMMUNITION_AND_COMMAND_PANEL.md) · [원본 지시서](../../archive/instructions/TACTICAL_WIP19_AMMUNITION_AND_COMMAND_PANEL.md) | 최종 5bf1bb5 독립 재검증 통과 · main 통합 · M1A2_1998 전용 시험 설정 |
| WIP18 일시 기능 이상·승무원 경중상 | [완료 안내](TACTICAL_WIP18_HIT_REACTIONS_AND_CREW_INJURIES.md) · [원본 지시서](../../archive/instructions/TACTICAL_WIP18_HIT_REACTIONS_AND_CREW_INJURIES.md) | 최종 6c5e4f3 독립 재검증 통과 · main 통합 · M1A2_1998 전용 시험 설정 |
| WIP17 가변 맵 크기 지원 기반 | [완료 안내](TACTICAL_WIP17_VARIABLE_MAP_FOUNDATION.md) · [원본 지시서](../../archive/instructions/TACTICAL_WIP17_VARIABLE_MAP_FOUNDATION.md) | 최종 624d80d 독립 재검증 통과 · main 통합 · 실제 8×8 지도 제작은 후속 |
| WIP16 적 AI 교전 판단·표적 선택·행동 안정화 | [완료 안내](TACTICAL_WIP16_ENGAGEMENT_DECISIONS.md) · [검토 보완](TACTICAL_WIP16_REVIEW_CORRECTIONS_ADDA7BF.md) · [능선 캐시 보완](TACTICAL_WIP16_RIDGE_CACHE_CORRECTION_311EC5B.md) · [halt 재확인 보완](TACTICAL_WIP16_HALT_PROBE_CORRECTION_2D68725.md) · [원본 지시서](../../archive/instructions/TACTICAL_WIP16_ENGAGEMENT_DECISIONS.md) | 최종 47f9e07 독립 재검증 통과 · main 통합 |
| WIP15 가변 장전·피격 동요·장비 일시 이상 | [기본 완료 안내](TACTICAL_WIP15_RELOAD_AND_TEMPORARY_REACTIONS.md) · [수정 완료 안내](TACTICAL_WIP15_OBSERVATION_FAULT_REVISION.md) · [보존 지시서](../../archive/instructions/README.md) | 관측 유지·조준 저하 최종 5a0b516 재검증 통과 · main 통합 |
| WIP14 적 경로 이동·기본 AI·사격 시 이동 정책 | [완료 안내](TACTICAL_WIP14_ENEMY_AI_AND_FIRE_MOVEMENT.md) · [원본 지시서](../../archive/instructions/TACTICAL_WIP14_ENEMY_AI_AND_FIRE_MOVEMENT.md) | 임무 수명·재관측 보완 및 재검증 완료 · main 통합 |
| WIP13 경량 구동·자동변속·제동·조향 | [완료 안내](TACTICAL_WIP13_LIGHTWEIGHT_MOBILITY.md) · [원본 지시서](../../archive/instructions/TACTICAL_WIP13_LIGHTWEIGHT_MOBILITY.md) | 방향 전환 조향 수정·재검증 완료 · main 통합 |
| WIP12 사격 이펙트·미관측 사격 표시·입사각/도탄 확장 | [완료 안내](TACTICAL_WIP12_EFFECTS_AND_RICOCHET.md) · [원본 지시서](../../archive/instructions/TACTICAL_WIP12_EFFECTS_AND_RICOCHET.md) | 최종 수정·재검증 완료 · main 통합 6e5a510 |
| WIP11E 9표본 LOS 중복 조회 최적화 | [완료 안내](TACTICAL_WIP11E_LOS_OPTIMIZATION.md) · [원본 지시서](../../archive/instructions/TACTICAL_WIP11E_LOS_OPTIMIZATION.md) | 재검증 통과 · PR #10 main 통합 |
| WIP11D 지형 판독성 개선·WIP11C 공개 체력 병합 검증 | [완료 지시서](../../archive/instructions/TACTICAL_WIP11D_TERRAIN_READABILITY.md) | 구현·재검증 완료 · main 통합 |

WIP11E는 main `a01ae8b`에서 만든 새 브랜치에서 구현하고 재검증 후 통합했다. 같은 수평 경로를 쓰는 차체의 두 높이 표본만 묶어 정적 조회를 공유하며 9표본·2m 격자·차폐 결과와 기존 캐시 계약을 유지한다. [구현 문서](../LOS_OPTIMIZATION_WIP11E.md), [작성자 검증](../../tests/releases/WIP11E-validation.json), [병합 검토](../reviews/WIP11E_MERGE_REVIEW_2026-11-08.md)를 참고한다. 완료한 작업을 다시 구현하지 않는다.

WIP12는 main `687c624`에서 새 브랜치로 구현하고, 최종 `0314f7c`를 재검증한 뒤 `6e5a510`으로 main에 통합했다. [구현 문서](../COMBAT_EFFECTS_AND_RICOCHET_WIP12.md), [릴리스·검증](../../TACTICAL_RELEASE_WIP12.md), [검증 JSON](../../tests/releases/WIP12-validation.json)을 참고한다.

WIP13은 main `a789d53`에서 새 브랜치로 구현하고 방향 전환 조향을 보완한 최종 `94652dc`를 재검증해 main에 통합했다. 0.05초 고정 틱에서 전후진 interlock, 질량·출력 기반 구동, 자동변속, 연속 제동·도착과 속도별 조향을 연결했다. Tank_Project는 범위비와 상태 구조만 참고했고 적 이동 AI는 후속 작업이다. [구현 문서](../MOBILITY_WIP13.md), [릴리스·검증](../../TACTICAL_RELEASE_WIP13.md), [병합 검토](../reviews/WIP13_MERGE_REVIEW_2026-11-09.md)를 참고한다.

WIP14는 main `73afaca`에서 새 브랜치로 구현하고, 임무 수명·사격 억제·재관측 재개를 보완한 최종 `3da0c4f`를 재검증해 main에 통합했다. 적의 실제 경로 이동/순찰과 자체 관측 기반 접촉 반응을 기존 구동·자동교전에 연결했고, 기본 임무와 교전 정차/재개, 차량의 기동간 사격 능력과 공통 발사 조건을 분리했다. 0.75초 분산 판단, 경로 예산/재시도, 숨은 정보 경계와 실제 Chromium의 이동 사격·정차/재개를 검증했다. [구현 문서](../ENEMY_AI_FIRE_MOVEMENT_WIP14.md), [릴리스·검증](../../TACTICAL_RELEASE_WIP14.md), [병합 검토](../reviews/WIP14_MERGE_REVIEW_2026-11-09.md)를 참고한다.

WIP15는 main `c83024a`에서 만든 기존 브랜치에 최신 main `eb485b7`의 관측 이상 수정 지시를 병합해 이어서 구현했다. 장전탄을 포함한 42발 보존, 5.98초 기본 장전, 연속 사격 피로와 피격 동요, 근접 비관통 시험 피해와 세 종류 일시 이상을 유지한다. 전차장·포수 이상은 정상 관측·지정·확보를 보존하면서 조준 진행 0.70배와 유효 오차 1.25배를 한 번 적용하며, 사통 이상은 기존 조준·발사 정지를 유지한다. 실제 Chromium에서 seed 26/79/560의 수정 동작과 복구를 재검증했다. [구현 문서](../RELOAD_AND_TEMPORARY_REACTIONS_WIP15.md), [릴리스·검증](../../TACTICAL_RELEASE_WIP15.md)을 참고한다. 최종 `5a0b516`을 독립 재검증한 뒤 main에 통합했으며 [병합 검토](../reviews/WIP15_MERGE_REVIEW_2026-11-09.md)에 결과를 기록했다.

WIP16은 최신 main `bb479ad`에서 새 브랜치로 구현했다. AI가 자체 현재 관측·식별·사거리 안 접촉만 점수화하고 observation의 `ai` 출처 인계와 실제 포수/사격 표적을 공유한다. 수동 지정 우선, 최소 유지·연속 우위, 차폐 재선택 제한, 이동 유지/정차/상실 뒤 동일 임무 복귀와 탄약·일시 이상 상태를 분리했다. `adda7bf` 검토 뒤에는 지속 차폐가 종료 시계를 초기화하던 문제와 사거리 밖 수동 소유권을 자동 교전으로 오인하던 문제를 수정했다. `311ec5b` 추가 검토 뒤에는 발사선 방향 이동과 지면 고도를 차폐 캐시에 포함하고 기존 fire-control 검사로 능선 통과 뒤 자동 교전을 복구했다. `2d68725` 추가 검토 뒤에는 `halt`의 이동 중 발사선 재확인을 무발사 검사로 분리하고, 통과 뒤 제동·정차 유지 시간을 거친 첫 발을 보장했다. [구현 문서](../ENGAGEMENT_DECISIONS_WIP16.md), [릴리스·검증](../../TACTICAL_RELEASE_WIP16.md)을 참고한다. 최종 `47f9e07`을 독립 재검증한 뒤 main에 통합했으며 [병합 검토](../reviews/WIP16_MERGE_REVIEW_2026-11-12.md)에 결과를 기록했다.

WIP17은 main `c13765e`에서 `feat/wip17-variable-map-foundation` 브랜치로 구현하고, DEM 검증·독립 LOS 로더를 보완한 최종 `624d80d`를 독립 재검증해 2026-11-13 main에 통합했다. 기본 4×4 라스도르프는 유지하고 공통 지도 규격, 독립 폭/높이 인덱스, 파생 캐시 서명, 설정/CLI 기반 생성·빌드를 연결했다. 실제 해상도의 합성 8×8/직사각형을 Node·단일 HTML·내장 Worker·Chromium에서 검증했지만 실제 8×8 실측 지도는 만들지 않았다. [구현 문서](../VARIABLE_MAP_FOUNDATION_WIP17.md), [릴리스·검증](../../TACTICAL_RELEASE_WIP17.md), [병합 검토](../reviews/WIP17_MERGE_REVIEW_2026-11-13.md)를 참고한다.

WIP18은 지시서가 등록된 main에서 `feat/wip18-hit-reactions` 브랜치로 구현하고 최신 main `cb3f68f`의 설계 기록을 반영했다. 전차장 자동 탐색·차량별 승무원 구성·범주별 감수성·효과 정책 연결을 보완한 최종 `6c5e4f3`를 독립 재검증해 2026-11-13 main에 통합했다. `tank-ke/M829A2`와 7개 피격 구역의 시험 데이터는 `M1A2_1998` 전용이며 다른 차종에 자동 상속하지 않는다. 일시 구동/포탑 이상과 경상/중상을 실제 동작에 연결하고 WIP15 반응·중첩 제어·정보 경계를 유지했다. [구현 문서](../HIT_REACTIONS_AND_CREW_INJURIES_WIP18.md), [릴리스·검증](../../TACTICAL_RELEASE_WIP18.md), [병합 검토](../reviews/WIP18_MERGE_REVIEW_2026-11-13.md)를 참고한다.

WIP19는 WIP18이 통합된 main `62a7658`에서 `feat/wip19-ammunition-command-panel` 브랜치로 구현했다. `M1A2_1998`에만 M829A2/A1/M830 혼합 42발, 장전탄·세 저장 구획, 준비/장전·즉응탄 보충과 탄종별 실제 발사/착탄을 연결했다. 지도 도구와 명령은 우측 상단, 선택 유닛 정보는 아래 독립 스크롤 영역으로 옮기고 큰 명단·정적 도안/제원은 제거했다. 아군 활성 고장/작업만 지도에 최대 두 줄 표시하며 승무원 상태와 적 내부 정보 공개 경계를 유지한다. [구현 문서](../AMMUNITION_AND_COMMAND_PANEL_WIP19.md)와 [릴리스·검증](../../TACTICAL_RELEASE_WIP19.md)을 참고한다.

## 관리 방법

WIP19는 마지막 예약탄 장전 중 AI 임무 복귀, 확인 잔해의 보충 차단, 선호 탄종 보충 순서와 모바일 지도 버튼을 보완한 최종 `5bf1bb5`를 독립 재검증해 2026-11-14 main에 통합했다. [병합 검토](../reviews/WIP19_MERGE_REVIEW_2026-11-14.md)에 재현·검증 범위를 기록했다. 혼합량·공급/보충 시간·미정 탄약 정책의 임시값은 계속 조정 가능한 초기 시험 제안이다. 완료 안내와 원본 지시서, 기계 판독 검증 기록을 구분한다.

- 요구사항은 이 폴더의 지시서에서 관리하고, 구현 설명·테스트 결과는 별도 문서에 남겨 지시서와 연결한다.
- 변경된 요구사항은 지시서에 반영한다. 실제로 실행하지 않은 검사를 통과로 적지 않는다.
- 작업 완료 후에는 최종 지시서를 [archive/instructions](../../archive/instructions/README.md)에 보관하고 이 목차의 상태와 링크를 갱신한다. 완료 전에는 같은 지시서의 여러 사본을 따로 편집하지 않는다.
- 아카이브의 과거 지시서·제안은 현재 작업을 자동으로 추가하는 명령으로 취급하지 않는다.
