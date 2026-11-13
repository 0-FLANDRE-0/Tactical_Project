# 작업 지시서 백업

작업 AI에게 전달한 지시서와 기준표 스크립트의 원본 사본 및 목차. WIP11 지시서는 `docs/`의 원본 사본을 가리킨다. 구현 결과는 각 PR 브랜치의 `docs/` 구현 문서와 `tests/releases/WIP*-validation.json`을 본다.

| 단계 | 지시서 | 기준표 스크립트 | 구현 PR | 상태 (2026-11-13) |
|---|---|---|---|---|
| WIP17 가변 맵 크기 지원 기반 | [원본 지시서](TACTICAL_WIP17_VARIABLE_MAP_FOUNDATION.md) | — | `feat/wip17-variable-map-foundation` | 최종 624d80d 독립 재검증 통과 · main 병합 (2026-11-13) · 실제 8×8 지도 제작 제외 |
| WIP16 적 AI 교전 판단·표적 선택·행동 안정화 | [기본 지시서](TACTICAL_WIP16_ENGAGEMENT_DECISIONS.md) · [검토 보완](TACTICAL_WIP16_REVIEW_CORRECTIONS_ADDA7BF.md) · [능선 캐시 보완](TACTICAL_WIP16_RIDGE_CACHE_CORRECTION_311EC5B.md) · [halt 재확인 보완](TACTICAL_WIP16_HALT_PROBE_CORRECTION_2D68725.md) | — | PR #15 | 최종 47f9e07 독립 재검증 통과 · main 병합 |
| WIP15 가변 장전·피격 동요·장비 일시 이상 | [기본 지시서](TACTICAL_WIP15_RELOAD_AND_TEMPORARY_REACTIONS.md) · [관측 이상 수정](TACTICAL_WIP15_OBSERVATION_FAULT_REVISION.md) | — | PR #14 | 최종 5a0b516 독립 재검증 통과 · main 병합 |
| WIP09 명중 확률 | [TACTICAL_WIP09_HIT_PROBABILITY_INSTRUCTIONS.md](TACTICAL_WIP09_HIT_PROBABILITY_INSTRUCTIONS.md) | [wip09_hit_reference.py](wip09_hit_reference.py) | #5 | 검토 통과 · main 병합 |
| WIP10 발사·비행·착탄 | [TACTICAL_WIP10_FLIGHT_IMPACT_INSTRUCTIONS.md](TACTICAL_WIP10_FLIGHT_IMPACT_INSTRUCTIONS.md) | [wip10_hit_reference.py](wip10_hit_reference.py) | #6 | 검토 통과 · main 병합 |
| WIP11A 피해·격파 | [TACTICAL_WIP11A_IMPLEMENTATION_INSTRUCTIONS.md](../../docs/TACTICAL_WIP11A_IMPLEMENTATION_INSTRUCTIONS.md) | — | #9 | 검토 통과 · main 병합 |
| WIP11B 잔해·기본 자동교전 | [TACTICAL_WIP11B_WRECK_AND_AUTO_ENGAGEMENT_INSTRUCTIONS.md](../../docs/TACTICAL_WIP11B_WRECK_AND_AUTO_ENGAGEMENT_INSTRUCTIONS.md) | — | #9 | 검토 통과 · main 병합 |
| WIP11C UI·경계 임무 | [TACTICAL_WIP11C_UI_AND_GUARD_INSTRUCTIONS.md](../../docs/TACTICAL_WIP11C_UI_AND_GUARD_INSTRUCTIONS.md) | — | #9 | 검토 통과 · main 병합 |
| WIP11D 지형 판독성 | [TACTICAL_WIP11D_TERRAIN_READABILITY.md](TACTICAL_WIP11D_TERRAIN_READABILITY.md) | — | #9 | 검토 통과 · main 병합 |
| WIP11E 9표본 LOS 중복 조회 최적화 | [TACTICAL_WIP11E_LOS_OPTIMIZATION.md](TACTICAL_WIP11E_LOS_OPTIMIZATION.md) | — | #10 | 재검증 통과 · main 병합 |
| WIP12 사격 이펙트·미관측 사격·도탄 | [TACTICAL_WIP12_EFFECTS_AND_RICOCHET.md](TACTICAL_WIP12_EFFECTS_AND_RICOCHET.md) | — | main 6e5a510 | 최종 수정·재검증 완료 · main 병합 |
| WIP13 경량 구동·자동변속·제동·조향 | [TACTICAL_WIP13_LIGHTWEIGHT_MOBILITY.md](TACTICAL_WIP13_LIGHTWEIGHT_MOBILITY.md) | — | 최종 구현 94652dc | 조향 보완·재검증 통과 · main 병합 |
| WIP14 적 경로 이동·기본 AI·사격 시 이동 정책 | [TACTICAL_WIP14_ENEMY_AI_AND_FIRE_MOVEMENT.md](TACTICAL_WIP14_ENEMY_AI_AND_FIRE_MOVEMENT.md) | — | 최종 구현 3da0c4f | 임무 수명·재관측 보완 및 재검증 통과 · main 병합 |

- 스크립트는 표준 라이브러리만 사용한다. `python3 wip10_hit_reference.py`로 기준값 표를 출력한다.
- WIP10 사본의 SHA-256은 지시서 `4e469d69…`, 스크립트 `142e5001…`로 PR #6 검증 기록(`tests/releases/WIP10-validation.json`)과 같다.
- 모든 계수는 게임 튜닝값이며 실제 사통장치·탄약 성능이 아니다.
