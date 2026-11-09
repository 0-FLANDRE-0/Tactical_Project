# WIP15 — 가변 장전·피격 동요·장비 일시 이상

> 2026-11-09 구현 완료. 이 파일은 완료 안내이며 원본 지시서는 [archive/instructions](../../archive/instructions/TACTICAL_WIP15_RELOAD_AND_TEMPORARY_REACTIONS.md)에 보존한다.

WIP15 구현은 `feat/wip15-reload-reactions` 브랜치에서 진행했다. 5.98초 실제 장전, 연속 사격 피로, 피격 동요, 근접 비관통 HP 피해, 포탑 피격의 사통·전차장·포수 일시 이상과 새 관측 기반 복구를 기존 관측·자동교전·피해 경로에 연결했다.

구현 세부는 [RELOAD_AND_TEMPORARY_REACTIONS_WIP15.md](../RELOAD_AND_TEMPORARY_REACTIONS_WIP15.md), 실행 결과와 배포물은 [TACTICAL_RELEASE_WIP15.md](../../TACTICAL_RELEASE_WIP15.md), 기계 판독 기록은 [WIP15-validation.json](../../tests/releases/WIP15-validation.json)을 참고한다. main 병합 여부는 별도 검토에서 결정한다.
