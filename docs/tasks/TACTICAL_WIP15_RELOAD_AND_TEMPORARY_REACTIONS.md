# WIP15 — 가변 장전·피격 동요·장비 일시 이상

> 2026-11-09 수정 구현 완료. 이 파일은 완료 안내이며 최신 기본 지시서는 [archive/instructions](../../archive/instructions/TACTICAL_WIP15_RELOAD_AND_TEMPORARY_REACTIONS.md)에 보존한다.

WIP15 구현은 `feat/wip15-reload-reactions` 브랜치에서 진행했다. 5.98초 실제 장전, 연속 사격 피로, 피격 동요, 근접 비관통 HP 피해와 포탑 피격의 3~8초 일시 이상을 기존 관측·자동교전·피해 경로에 연결했다. 이후 관측 이상 동작은 [수정 지시서](TACTICAL_WIP15_OBSERVATION_FAULT_REVISION.md)에 따라 시야·표적 명령을 유지하면서 조준 속도와 정확도를 낮추도록 갱신했다.

구현 세부는 [RELOAD_AND_TEMPORARY_REACTIONS_WIP15.md](../RELOAD_AND_TEMPORARY_REACTIONS_WIP15.md), 실행 결과와 배포물은 [TACTICAL_RELEASE_WIP15.md](../../TACTICAL_RELEASE_WIP15.md), 기계 판독 기록은 [WIP15-validation.json](../../tests/releases/WIP15-validation.json)을 참고한다. 최종 `5a0b516`을 독립 재검증해 main에 통합했다. [병합 검토](../reviews/WIP15_MERGE_REVIEW_2026-11-09.md)를 참고한다.
