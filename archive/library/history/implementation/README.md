# 과거 WIP 지시서·구현 히스토리 — 2026-11-15 기록 당시 상태

> **4단계 이력 전용 색인.** 아래 표는 [원본 아카이브 지시서 색인](https://github.com/0-FLANDRE-0/Tactical_Project/blob/main/archive/instructions/README.md)의 WIP09~22 업무 및 당시 상태를 재현한다. 개별 WIP 지시서는 **작성 시점의 지시/코드 상태**일 뿐 2026-11-19 현재 main 코드의 독립 검증 결과가 아니다. 지시서 원본·참조 Python 파일은 그대로 보존.

# 작업 지시서 백업

작업 AI에게 전달한 지시서와 기준표 스크립트의 원본 사본 및 목차. WIP11 지시서는 `docs/`의 원본 사본을 가리킨다. 구현 결과는 각 PR 브랜치의 `docs/` 구현 문서와 `tests/releases/WIP*-validation.json`을 본다.

| 단계 | 지시서 | 기준표 스크립트 | 구현 PR | 상태 (2026-11-15) |
|---|---|---|---|---|
| WIP22 T-80U(1989) 자체 관측·인계·선회 | [원본 지시서](https://github.com/0-FLANDRE-0/Tactical_Project/blob/main/archive/instructions/TACTICAL_WIP22_T80U_OBSERVATION_AND_TRAVERSE.md) | — | `feat/wip22-t80u-observation-traverse` | 구현·검증 완료 · PR 검토/병합 대기 · 125mm 무장/기동 제외 |
| WIP21 T-80U(1989) 모델·장갑 통합과 피격시험 | [원본 지시서](https://github.com/0-FLANDRE-0/Tactical_Project/blob/main/archive/instructions/TACTICAL_WIP21_T80U_MODEL_AND_ARMOR.md) | — | `feat/wip21-t80u-model-armor` | 작성자 구현·검증 완료 · PR 검토 대기 · ERA 방호만 적용, 소모/손상 없음 |
| WIP20 M1A2(1998) 전용 탄약고 사고 | [원본 지시서](https://github.com/0-FLANDRE-0/Tactical_Project/blob/main/archive/instructions/TACTICAL_WIP20_M1A2_AMMUNITION_INCIDENTS.md) | — | `feat/wip20-ammunition-incidents` | 최종 3633952 독립 재검증 통과 · main 병합 (2026-11-14) · M1A2_1998 전용 시험 설정 |
| WIP19 탄약 운용·3종 탄약과 우측 명령/선택 정보 패널 | [원본 지시서](https://github.com/0-FLANDRE-0/Tactical_Project/blob/main/archive/instructions/TACTICAL_WIP19_AMMUNITION_AND_COMMAND_PANEL.md) | — | `feat/wip19-ammunition-command-panel` | 최종 5bf1bb5 독립 재검증 통과 · main 병합 (2026-11-14) · M1A2_1998 전용 시험 설정 |
| WIP18 일시 기능 이상·승무원 경중상 | [원본 지시서](https://github.com/0-FLANDRE-0/Tactical_Project/blob/main/archive/instructions/TACTICAL_WIP18_HIT_REACTIONS_AND_CREW_INJURIES.md) | — | `feat/wip18-hit-reactions` | 최종 6c5e4f3 독립 재검증 통과 · main 병합 (2026-11-13) · M1A2_1998 전용 시험 설정 |
| WIP17 가변 맵 크기 지원 기반 | [원본 지시서](https://github.com/0-FLANDRE-0/Tactical_Project/blob/main/archive/instructions/TACTICAL_WIP17_VARIABLE_MAP_FOUNDATION.md) | — | `feat/wip17-variable-map-foundation` | 최종 624d80d 독립 재검증 통과 · main 병합 (2026-11-13) · 실제 8×8 지도 제작 제외 |
| WIP16 적 AI 교전 판단·표적 선택·행동 안정화 | [기본 지시서](https://github.com/0-FLANDRE-0/Tactical_Project/blob/main/archive/instructions/TACTICAL_WIP16_ENGAGEMENT_DECISIONS.md) · [검토 보완](https://github.com/0-FLANDRE-0/Tactical_Project/blob/main/archive/instructions/TACTICAL_WIP16_REVIEW_CORRECTIONS_ADDA7BF.md) · [능선 캐시 보완](https://github.com/0-FLANDRE-0/Tactical_Project/blob/main/archive/instructions/TACTICAL_WIP16_RIDGE_CACHE_CORRECTION_311EC5B.md) · [halt 재확인 보완](https://github.com/0-FLANDRE-0/Tactical_Project/blob/main/archive/instructions/TACTICAL_WIP16_HALT_PROBE_CORRECTION_2D68725.md) | — | PR #15 | 최종 47f9e07 독립 재검증 통과 · main 병합 |
| WIP15 가변 장전·피격 동요·장비 일시 이상 | [기본 지시서](https://github.com/0-FLANDRE-0/Tactical_Project/blob/main/archive/instructions/TACTICAL_WIP15_RELOAD_AND_TEMPORARY_REACTIONS.md) · [관측 이상 수정](https://github.com/0-FLANDRE-0/Tactical_Project/blob/main/archive/instructions/TACTICAL_WIP15_OBSERVATION_FAULT_REVISION.md) | — | PR #14 | 최종 5a0b516 독립 재검증 통과 · main 병합 |
| WIP09 명중 확률 | [TACTICAL_WIP09_HIT_PROBABILITY_INSTRUCTIONS.md](https://github.com/0-FLANDRE-0/Tactical_Project/blob/main/archive/instructions/TACTICAL_WIP09_HIT_PROBABILITY_INSTRUCTIONS.md) | [wip09_hit_reference.py](https://github.com/0-FLANDRE-0/Tactical_Project/blob/main/archive/instructions/wip09_hit_reference.py) | #5 | 검토 통과 · main 병합 |
| WIP10 발사·비행·착탄 | [TACTICAL_WIP10_FLIGHT_IMPACT_INSTRUCTIONS.md](https://github.com/0-FLANDRE-0/Tactical_Project/blob/main/archive/instructions/TACTICAL_WIP10_FLIGHT_IMPACT_INSTRUCTIONS.md) | [wip10_hit_reference.py](https://github.com/0-FLANDRE-0/Tactical_Project/blob/main/archive/instructions/wip10_hit_reference.py) | #6 | 검토 통과 · main 병합 |
| WIP11A 피해·격파 | [TACTICAL_WIP11A_IMPLEMENTATION_INSTRUCTIONS.md](https://github.com/0-FLANDRE-0/Tactical_Project/blob/main/docs/TACTICAL_WIP11A_IMPLEMENTATION_INSTRUCTIONS.md) | — | #9 | 검토 통과 · main 병합 |
| WIP11B 잔해·기본 자동교전 | [TACTICAL_WIP11B_WRECK_AND_AUTO_ENGAGEMENT_INSTRUCTIONS.md](https://github.com/0-FLANDRE-0/Tactical_Project/blob/main/docs/TACTICAL_WIP11B_WRECK_AND_AUTO_ENGAGEMENT_INSTRUCTIONS.md) | — | #9 | 검토 통과 · main 병합 |
| WIP11C UI·경계 임무 | [TACTICAL_WIP11C_UI_AND_GUARD_INSTRUCTIONS.md](https://github.com/0-FLANDRE-0/Tactical_Project/blob/main/docs/TACTICAL_WIP11C_UI_AND_GUARD_INSTRUCTIONS.md) | — | #9 | 검토 통과 · main 병합 |
| WIP11D 지형 판독성 | [TACTICAL_WIP11D_TERRAIN_READABILITY.md](https://github.com/0-FLANDRE-0/Tactical_Project/blob/main/archive/instructions/TACTICAL_WIP11D_TERRAIN_READABILITY.md) | — | #9 | 검토 통과 · main 병합 |
| WIP11E 9표본 LOS 중복 조회 최적화 | [TACTICAL_WIP11E_LOS_OPTIMIZATION.md](https://github.com/0-FLANDRE-0/Tactical_Project/blob/main/archive/instructions/TACTICAL_WIP11E_LOS_OPTIMIZATION.md) | — | #10 | 재검증 통과 · main 병합 |
| WIP12 사격 이펙트·미관측 사격·도탄 | [TACTICAL_WIP12_EFFECTS_AND_RICOCHET.md](https://github.com/0-FLANDRE-0/Tactical_Project/blob/main/archive/instructions/TACTICAL_WIP12_EFFECTS_AND_RICOCHET.md) | — | main 6e5a510 | 최종 수정·재검증 완료 · main 병합 |
| WIP13 경량 구동·자동변속·제동·조향 | [TACTICAL_WIP13_LIGHTWEIGHT_MOBILITY.md](https://github.com/0-FLANDRE-0/Tactical_Project/blob/main/archive/instructions/TACTICAL_WIP13_LIGHTWEIGHT_MOBILITY.md) | — | 최종 구현 94652dc | 조향 보완·재검증 통과 · main 병합 |
| WIP14 적 경로 이동·기본 AI·사격 시 이동 정책 | [TACTICAL_WIP14_ENEMY_AI_AND_FIRE_MOVEMENT.md](https://github.com/0-FLANDRE-0/Tactical_Project/blob/main/archive/instructions/TACTICAL_WIP14_ENEMY_AI_AND_FIRE_MOVEMENT.md) | — | 최종 구현 3da0c4f | 임무 수명·재관측 보완 및 재검증 통과 · main 병합 |

- 스크립트는 표준 라이브러리만 사용한다. `python3 wip10_hit_reference.py`로 기준값 표를 출력한다.
- WIP10 사본의 SHA-256은 지시서 `4e469d69…`, 스크립트 `142e5001…`로 PR #6 검증 기록(`tests/releases/WIP10-validation.json`)과 같다.
- 모든 계수는 게임 튜닝값이며 실제 사통장치·탄약 성능이 아니다.


## 상태 표시 유의점

- WIP21/22의 PR 검토·병합 대기는 **2026-11-15 원본 기록**. 현재 GitHub 브랜치·실행 경로와 같다고 간주할 수 없음.
- WIP18/20의 게임 시험 설정은 M1A2_1998 전용이며 다른 차량에 자동 확대하지 않음.
- 원본에 있는 당시 구현 대기와 후속 검증·병합 상태의 시점 차이는 이력으로 보존. 현재 코드 검증은 5단계 별도 항목.
