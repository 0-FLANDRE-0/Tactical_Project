# WIP17 가변 맵 크기 지원 기반 — 완료 안내

> 2026-11-12 구현, 2026-11-13 최종 `624d80d` 추가 수정·독립 재검증 통과 후 main 통합. 원본 지시서는 [archive/instructions](../../archive/instructions/TACTICAL_WIP17_VARIABLE_MAP_FOUNDATION.md)에 보존한다.

2m 고도·4m 지표·16m 길찾기 계약을 유지한 공통 지도 규격 검증, 가로/세로 독립 인덱스, 지도별 파생 캐시 검증, 설정/CLI 기반 생성·빌드 경로를 연결했다. 기본 실행 지도와 배포물은 기존 라스도르프 4×4km이며, 테스트에서만 실제 해상도의 합성 8×8km와 8×4.096km 직사각형을 순차 생성해 Node·단일 HTML·내장 Worker·실제 Chromium을 검증했다.

이번 완료는 **새 크기의 지도를 넣을 수 있는 기반**이다. 실제 8×8km DEM/OSM 지도, 지도 선택 UI, 스트리밍·계층형 길찾기, 모바일 성능 보장은 포함하지 않는다.

[구현 설명](../VARIABLE_MAP_FOUNDATION_WIP17.md) · [릴리스·검증](../../TACTICAL_RELEASE_WIP17.md) · [기계 판독 결과](../../tests/releases/WIP17-validation.json) · [병합 검토](../reviews/WIP17_MERGE_REVIEW_2026-11-13.md)
