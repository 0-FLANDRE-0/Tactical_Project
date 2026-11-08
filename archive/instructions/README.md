# 작업 지시서 백업

작업 AI에게 전달한 지시서와 기준표 스크립트의 원본 사본 및 목차. WIP11 지시서는 `docs/`의 원본 사본을 가리킨다. 구현 결과는 각 PR 브랜치의 `docs/` 구현 문서와 `tests/releases/WIP*-validation.json`을 본다.

| 단계 | 지시서 | 기준표 스크립트 | 구현 PR | 상태 (2026-11-09) |
|---|---|---|---|---|
| WIP09 명중 확률 | [TACTICAL_WIP09_HIT_PROBABILITY_INSTRUCTIONS.md](TACTICAL_WIP09_HIT_PROBABILITY_INSTRUCTIONS.md) | [wip09_hit_reference.py](wip09_hit_reference.py) | #5 | 검토 통과 · main 병합 |
| WIP10 발사·비행·착탄 | [TACTICAL_WIP10_FLIGHT_IMPACT_INSTRUCTIONS.md](TACTICAL_WIP10_FLIGHT_IMPACT_INSTRUCTIONS.md) | [wip10_hit_reference.py](wip10_hit_reference.py) | #6 | 검토 통과 · main 병합 |
| WIP11A 피해·격파 | [TACTICAL_WIP11A_IMPLEMENTATION_INSTRUCTIONS.md](../../docs/TACTICAL_WIP11A_IMPLEMENTATION_INSTRUCTIONS.md) | — | #9 | 검토 통과 · main 병합 |
| WIP11B 잔해·기본 자동교전 | [TACTICAL_WIP11B_WRECK_AND_AUTO_ENGAGEMENT_INSTRUCTIONS.md](../../docs/TACTICAL_WIP11B_WRECK_AND_AUTO_ENGAGEMENT_INSTRUCTIONS.md) | — | #9 | 검토 통과 · main 병합 |
| WIP11C UI·경계 임무 | [TACTICAL_WIP11C_UI_AND_GUARD_INSTRUCTIONS.md](../../docs/TACTICAL_WIP11C_UI_AND_GUARD_INSTRUCTIONS.md) | — | #9 | 검토 통과 · main 병합 |
| WIP11D 지형 판독성 | [TACTICAL_WIP11D_TERRAIN_READABILITY.md](TACTICAL_WIP11D_TERRAIN_READABILITY.md) | — | #9 | 검토 통과 · main 병합 |
| WIP11E 9표본 LOS 중복 조회 최적화 | [TACTICAL_WIP11E_LOS_OPTIMIZATION.md](TACTICAL_WIP11E_LOS_OPTIMIZATION.md) | — | #10 | 재검증 통과 · main 병합 |
| WIP12 사격 이펙트·미관측 사격·도탄 | [TACTICAL_WIP12_EFFECTS_AND_RICOCHET.md](TACTICAL_WIP12_EFFECTS_AND_RICOCHET.md) | — | main 6e5a510 | 최종 수정·재검증 완료 · main 병합 |
| WIP13 경량 구동·자동변속·제동·조향 | [TACTICAL_WIP13_LIGHTWEIGHT_MOBILITY.md](TACTICAL_WIP13_LIGHTWEIGHT_MOBILITY.md) | — | PR 준비 | 구현·검증 완료 |

- 스크립트는 표준 라이브러리만 사용한다. `python3 wip10_hit_reference.py`로 기준값 표를 출력한다.
- WIP10 사본의 SHA-256은 지시서 `4e469d69…`, 스크립트 `142e5001…`로 PR #6 검증 기록(`tests/releases/WIP10-validation.json`)과 같다.
- 모든 계수는 게임 튜닝값이며 실제 사통장치·탄약 성능이 아니다.
