# TACTICAL — WIP 작업 지시서 원본 목록

> **이 폴더는 과거 작업 AI에게 전달된 지시서의 보관소다.** WIP 문서의 명령문·당시 테스트/병합 상태는 **현재 코드 구현 상태나 최신 게임 제원 확정**을 뜻하지 않는다. 제원은 [현행 라이브러리](../library/README.md)를 우선한다.

## 원본 지시서 찾기

| WIP | 작업 내용 | 원본 |
|---|---|---|
| 09 | 명중 확률 | [지시서](TACTICAL_WIP09_HIT_PROBABILITY_INSTRUCTIONS.md) · [참조 스크립트](wip09_hit_reference.py) |
| 10 | 발사·비행·착탄 | [지시서](TACTICAL_WIP10_FLIGHT_IMPACT_INSTRUCTIONS.md) · [참조 스크립트](wip10_hit_reference.py) |
| 11A~C | 피해·격파 / 잔해·자동교전 / UI·경계 | [11A](../../docs/TACTICAL_WIP11A_IMPLEMENTATION_INSTRUCTIONS.md) · [11B](../../docs/TACTICAL_WIP11B_WRECK_AND_AUTO_ENGAGEMENT_INSTRUCTIONS.md) · [11C](../../docs/TACTICAL_WIP11C_UI_AND_GUARD_INSTRUCTIONS.md) (원본 위치: `docs/`) |
| 11D~E | 지형 판독성 / LOS 최적화 | [11D](TACTICAL_WIP11D_TERRAIN_READABILITY.md) · [11E](TACTICAL_WIP11E_LOS_OPTIMIZATION.md) |
| 12 | 사격 이펙트·도탄 | [지시서](TACTICAL_WIP12_EFFECTS_AND_RICOCHET.md) |
| 13 | 경량 구동·변속·조향 | [지시서](TACTICAL_WIP13_LIGHTWEIGHT_MOBILITY.md) |
| 14 | 적 이동·전투 AI | [지시서](TACTICAL_WIP14_ENEMY_AI_AND_FIRE_MOVEMENT.md) |
| 15 | 가변 장전·일시 이상 | [기본](TACTICAL_WIP15_RELOAD_AND_TEMPORARY_REACTIONS.md) · [관측 이상 수정](TACTICAL_WIP15_OBSERVATION_FAULT_REVISION.md) |
| 16 | 교전 판단·행동 안정화 | [기본](TACTICAL_WIP16_ENGAGEMENT_DECISIONS.md) · [검토 보완](TACTICAL_WIP16_REVIEW_CORRECTIONS_ADDA7BF.md) · [능선 캐시](TACTICAL_WIP16_RIDGE_CACHE_CORRECTION_311EC5B.md) · [정지 확인](TACTICAL_WIP16_HALT_PROBE_CORRECTION_2D68725.md) |
| 17 | 가변 지도 크기 | [지시서](TACTICAL_WIP17_VARIABLE_MAP_FOUNDATION.md) |
| 18 | 피격 반응·승무원 부상 | [지시서](TACTICAL_WIP18_HIT_REACTIONS_AND_CREW_INJURIES.md) |
| 19 | 탄약·명령 패널 | [지시서](TACTICAL_WIP19_AMMUNITION_AND_COMMAND_PANEL.md) |
| 20 | M1A2 탄약고 사고 | [지시서](TACTICAL_WIP20_M1A2_AMMUNITION_INCIDENTS.md) |
| 21 | T-80U 모델·장갑 | [지시서](TACTICAL_WIP21_T80U_MODEL_AND_ARMOR.md) |
| 22 | T-80U 관측·포탑 선회 | [지시서](TACTICAL_WIP22_T80U_OBSERVATION_AND_TRAVERSE.md) |
| 23 | T-80U 정지 사격·자동장전 | [지시서](TACTICAL_WIP23_T80U_FIRE_AND_AUTOLOADER.md) |
| 24 | 장갑 동기화·Kontakt ERA 소모 | [지시서](TACTICAL_WIP24_ARMOR_SYNC_AND_ERA_DEPLETION.md) |

## 구현 기록과 당시 상태

- **2026-11-18 당시 PR·시험·병합 상태표:** [정리 이전 지시서 목차 원문](https://github.com/0-FLANDRE-0/Tactical_Project/blob/archive-cleanup-stage3-baseline-2026-11-21/archive/instructions/README.md). 이 표는 역사 기록이며 오늘의 main 상태가 아님.
- **2026-11-15 당시 상태 복사본:** [중복 색인 원본](https://github.com/0-FLANDRE-0/Tactical_Project/blob/archive-cleanup-stage3-baseline-2026-11-21/archive/library/history/implementation/README.md). 중복 파일은 현행 `archive/library/history/`에서 정리했다.
- **현재 코드 반영 여부:** 개별 PR, `docs/` 구현 설명 및 `tests/releases/WIP*-validation.json` 등에서 **별도로 확인**. 이 목차는 최신 테스트 통과나 병합 여부를 주장하지 않는다.
- WIP09·10의 Python 스크립트는 당시 계산 기준의 참고 코드다. 실제 장비 공식 제원이 아닌 게임 튜닝값과 혼동하지 않는다.
