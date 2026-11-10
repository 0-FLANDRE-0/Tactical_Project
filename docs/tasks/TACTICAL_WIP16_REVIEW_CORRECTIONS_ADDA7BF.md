# WIP16 검토 보완 완료

> 2026-11-10 구현·검증 완료. 원본 보완 지시는 [archive/instructions](../../archive/instructions/TACTICAL_WIP16_REVIEW_CORRECTIONS_ADDA7BF.md)에 보존한다.

지속 차폐 재시도와 교전 종료 시계를 분리하고, 같은 실패 기하를 제한 대기 뒤 포기해 원 임무로 한 번 복귀하도록 수정했다. 수동 지정의 observation 소유권과 AI의 현재 교전 가능 여부도 분리해 사거리 밖 `manual/waiting/range` 명령을 보존하면서 이동을 영구 차단하지 않는다.

단일·복수 차폐, 차폐선 변화, 새 대안, 자동 인계 거절, 수동 취소·자연 만료·사거리 재진입을 순수 상태·실제 코어·실제 Chromium에서 확인했다. 상세 결과는 [구현 문서](../ENGAGEMENT_DECISIONS_WIP16.md)와 [릴리스 문서](../../TACTICAL_RELEASE_WIP16.md)에 기록했다.
