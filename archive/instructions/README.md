# 작업 지시서 백업

작업 AI에게 전달한 지시서와 기준표 스크립트의 원본 사본. 구현 결과는 각 PR 브랜치의 `docs/FIRE_CONTROL_WIP*.md`와 `tests/releases/WIP*-validation.json`을 본다.

| 단계 | 지시서 | 기준표 스크립트 | 구현 PR | 상태 (2026-11-08) |
|---|---|---|---|---|
| WIP09 명중 확률 | [TACTICAL_WIP09_HIT_PROBABILITY_INSTRUCTIONS.md](TACTICAL_WIP09_HIT_PROBABILITY_INSTRUCTIONS.md) | [wip09_hit_reference.py](wip09_hit_reference.py) | #5 | 검토 통과 · 미병합 |
| WIP10 발사·비행·착탄 | [TACTICAL_WIP10_FLIGHT_IMPACT_INSTRUCTIONS.md](TACTICAL_WIP10_FLIGHT_IMPACT_INSTRUCTIONS.md) | [wip10_hit_reference.py](wip10_hit_reference.py) | #6 | 검토 통과 · 미병합 |

- 스크립트는 표준 라이브러리만 사용한다. `python3 wip10_hit_reference.py`로 기준값 표를 출력한다.
- WIP10 사본의 SHA-256은 지시서 `4e469d69…`, 스크립트 `142e5001…`로 PR #6 검증 기록(`tests/releases/WIP10-validation.json`)과 같다.
- 모든 계수는 게임 튜닝값이며 실제 사통장치·탄약 성능이 아니다.
