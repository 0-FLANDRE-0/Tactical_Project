# WIP22 T-80U 관측·인계·선회 완료 안내

원본 지시서는 [archive/instructions](../../archive/instructions/TACTICAL_WIP22_T80U_OBSERVATION_AND_TRAVERSE.md)에 보존했다.

구현 `2363c92`를 독립 검토하고 격파 시 전차장 방위 보존과 탐색 캡처를 보완해 main에 통합한다. 새 관측시험에서 정지 T-80U가 자체 탐지·식별→전차장 인계→24°/s 포탑 선회→포수 자체 확보·추적을 수행한다. 큐폴라 상한은 40°/s이고 수치는 2차 자료 채택/게임 시험값으로 구분한다. 기존 방호시험은 관측 비활성 표적을 유지하며 T-80U 발사·기동·자동장전·교전 AI는 후속 범위다.

[독립 병합 검토](../reviews/WIP22_MERGE_REVIEW_2026-11-15.md) · [구현 문서](../T80U_OBSERVATION_AND_TRAVERSE_WIP22.md) · [릴리스·검증](../../TACTICAL_RELEASE_WIP22.md) · [검증 JSON](../../tests/releases/WIP22-validation.json)
