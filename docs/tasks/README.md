# 작업 지시서

예정·진행 중인 작업의 요구사항과 완료 기준을 보관한다. 지시서가 있다는 사실은 구현 완료를 뜻하지 않는다. 실제 구현 상태는 작업 브랜치의 코드와 해당 버전의 완료 보고·검증 기록으로 확인한다.

## 현재 작업

| 작업 | 지시서 | 상태 |
|---|---|---|
| WIP13 경량 구동·자동변속·제동·조향 | [작업 지시서](TACTICAL_WIP13_LIGHTWEIGHT_MOBILITY.md) | 사용자 확정 · 지시서 등록 · 구현 대기 |
| WIP12 사격 이펙트·미관측 사격 표시·입사각/도탄 확장 | [완료 안내](TACTICAL_WIP12_EFFECTS_AND_RICOCHET.md) · [원본 지시서](../../archive/instructions/TACTICAL_WIP12_EFFECTS_AND_RICOCHET.md) | 최종 수정·재검증 완료 · main 통합 6e5a510 |
| WIP11E 9표본 LOS 중복 조회 최적화 | [완료 안내](TACTICAL_WIP11E_LOS_OPTIMIZATION.md) · [원본 지시서](../../archive/instructions/TACTICAL_WIP11E_LOS_OPTIMIZATION.md) | 재검증 통과 · PR #10 main 통합 |
| WIP11D 지형 판독성 개선·WIP11C 공개 체력 병합 검증 | [완료 지시서](../../archive/instructions/TACTICAL_WIP11D_TERRAIN_READABILITY.md) | 구현·재검증 완료 · main 통합 |

WIP11E는 main `a01ae8b`에서 만든 새 브랜치에서 구현하고 재검증 후 통합했다. 같은 수평 경로를 쓰는 차체의 두 높이 표본만 묶어 정적 조회를 공유하며 9표본·2m 격자·차폐 결과와 기존 캐시 계약을 유지한다. [구현 문서](../LOS_OPTIMIZATION_WIP11E.md), [작성자 검증](../../tests/releases/WIP11E-validation.json), [병합 검토](../reviews/WIP11E_MERGE_REVIEW_2026-11-08.md)를 참고한다. 완료한 작업을 다시 구현하지 않는다.

WIP12는 main `687c624`에서 새 브랜치로 구현하고, 최종 `0314f7c`를 재검증한 뒤 `6e5a510`으로 main에 통합했다. [구현 문서](../COMBAT_EFFECTS_AND_RICOCHET_WIP12.md), [릴리스·검증](../../TACTICAL_RELEASE_WIP12.md), [검증 JSON](../../tests/releases/WIP12-validation.json)을 참고한다.

다음 작업은 사용자 확정 WIP13이다. 기존 0.05초 고정 틱에 맞춘 경량 구동 모델로 전후진 즉시 반전을 고치고 자동변속·제동·조향을 연결한다. Tank_Project는 개발 참고 자료이며 적 이동 AI는 후속 작업이다. 구현 AI는 [WIP13 지시서](TACTICAL_WIP13_LIGHTWEIGHT_MOBILITY.md)부터 읽는다.

## 관리 방법

- 요구사항은 이 폴더의 지시서에서 관리하고, 구현 설명·테스트 결과는 별도 문서에 남겨 지시서와 연결한다.
- 변경된 요구사항은 지시서에 반영한다. 실제로 실행하지 않은 검사를 통과로 적지 않는다.
- 작업 완료 후에는 최종 지시서를 [archive/instructions](../../archive/instructions/README.md)에 보관하고 이 목차의 상태와 링크를 갱신한다. 완료 전에는 같은 지시서의 여러 사본을 따로 편집하지 않는다.
- 아카이브의 과거 지시서·제안은 현재 작업을 자동으로 추가하는 명령으로 취급하지 않는다.
