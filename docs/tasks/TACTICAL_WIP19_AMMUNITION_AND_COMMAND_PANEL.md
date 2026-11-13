# WIP19 탄약 운용·명령 패널 완료 안내

원본 작업 지시서는 [archive/instructions](../../archive/instructions/TACTICAL_WIP19_AMMUNITION_AND_COMMAND_PANEL.md)에 보존했다.

최종 `5bf1bb5`의 예약탄 장전·AI 유지, 잔해 위협·보충 순서·모바일 지도 버튼 보완을 독립 재검증해 2026-11-14 main에 통합했다. 검증 결과와 한계는 [병합 검토](../reviews/WIP19_MERGE_REVIEW_2026-11-14.md)에 있다.

`feat/wip19-ammunition-command-panel` 브랜치에서 M1A2_1998 전용 M829A2/M829A1/M830 재고, 구획별 준비·장전·즉응탄 보충, 실제 장전탄 기반 비행/착탄, 우측 명령·선택 정보 패널과 아군 활성 상태 문구를 구현했다. 공통 M1A2와 다른 차량에는 혼합 적재 데이터를 상속하지 않는다.

현재 구현 계약은 [구현 문서](../AMMUNITION_AND_COMMAND_PANEL_WIP19.md), 실행·검증 결과는 [릴리스 문서](../../TACTICAL_RELEASE_WIP19.md)와 [검증 JSON](../../tests/releases/WIP19-validation.json)에서 확인한다. 혼합량·준비/보충 시간·탄종 성능은 실차 인증값이 아닌 조정 가능한 게임 시험값이다.
