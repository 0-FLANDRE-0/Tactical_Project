# WIP15 수정 — 관측 유지·조준 속도 및 정확도 저하

> 2026-11-09 수정 구현·재검증 완료. 원본 수정 지시서는 [archive/instructions](../../archive/instructions/TACTICAL_WIP15_OBSERVATION_FAULT_REVISION.md)에 보존한다.

전차장·포수 관측 이상은 정상 LOS·거리·시야각·탐지·식별·확보를 계속 검사하며 기존 `current/acquired`, 표적 명령과 조준 진행률을 지우지 않는다. 두 이상 중 하나 이상이 활성화되면 프로파일의 초기 시험값인 조준 진행 0.70배와 유효 오차 표준편차 1.25배를 한 번만 적용한다. 사통 이상은 기존처럼 조준과 새 발사를 멈추고 장전은 계속한다.

독립 코어와 실제 Chromium에서 seed 79의 7.2266초 포수 이상을 포함해 관측·지정 유지, 이상 중 발사, 추가 만료·12초 재시도 없음, 타이머 종료 후 정상 배율 복원을 확인했다. 상세 구현·전체 검사·배포물은 [구현 문서](../RELOAD_AND_TEMPORARY_REACTIONS_WIP15.md), [릴리스 문서](../../TACTICAL_RELEASE_WIP15.md), [검증 JSON](../../tests/releases/WIP15-validation.json)을 참고한다.
