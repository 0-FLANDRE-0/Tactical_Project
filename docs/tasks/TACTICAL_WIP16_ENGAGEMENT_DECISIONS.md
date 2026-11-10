# WIP16 적 AI 교전 판단·표적 선택·행동 안정화

> 2026-11-10 구현·검증 완료. 원본 지시서는 [archive/instructions](../../archive/instructions/TACTICAL_WIP16_ENGAGEMENT_DECISIONS.md)에 보존한다.

자체 현재 관측·식별·사거리 안 접촉만 점수화하고, 선택 결과를 observation의 별도 `ai` 출처 인계와 실제 fire-control 표적에 연결했다. 수동 지정 우선, 2.25초 최소 유지, 0.20 초과 우위 2회, 기존 상실 유예와 2초 차폐 재선택 제한을 적용했다. 이동 유지/정차/동일 임무 복귀, 장전·일시 이상·탄약 소진과 정보 경계를 분리했다. `adda7bf` 검토에서 발견한 지속 차폐 반복과 사거리 밖 수동 소유권 불일치는 [보완 작업](TACTICAL_WIP16_REVIEW_CORRECTIONS_ADDA7BF.md)에서 수정했다.

세부 규칙·상태 전이·성능은 [구현 문서](../ENGAGEMENT_DECISIONS_WIP16.md), 검사와 배포물은 [릴리스 문서](../../TACTICAL_RELEASE_WIP16.md)와 [검증 JSON](../../tests/releases/WIP16-validation.json)을 참고한다.
