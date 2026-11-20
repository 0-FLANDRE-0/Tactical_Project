# TACTICAL — 아카이브 / 게임 제원 라이브러리

> **2026-11-19 · 5단계 라이브러리 개편 완료.** 최신 게임 설계·장비·탄약의 **정식 탐색/수정 진입점은 [`archive/library/`](library/README.md)**이다. 과거 큰 README나 WIP 시제품은 근거·수정 이력을 보존하는 **레거시 자료**이며, 현재 실행 코드와 설계 확정은 별도다.

## 찾는 자료별 빠른 링크

| 자료 | 현행 라이브러리 | 핵심 정보 |
|---|---|---|
| **1989년 전차 32종** | [전차 목록 및 7구역 KE(CE)·HP](library/vehicles/tanks/1989/README.md) | 미국 5·서독 6·소련 14·동독 7종, 상부 7번째 구역 |
| **1992/1998 M1A2, 현대 M1A2C·Leopard 2A8** | [전체 차량 카탈로그](library/vehicles/README.md) | M1A2C 고정장갑·교체형 TUSK I/II, 2A8 1,450 HP·모듈러 증가장갑·Trophy HV |
| **전차포탄·현대 날탄·Anti-ERA** | [탄약 카탈로그](library/ammunition/README.md) | 미·독 105/120mm, 소련 125mm, 현대 DM53~DM73·M829A2/A3/A4 |
| **TOW 2A·2B 및 기타 ATGM** | [TOW 계열](library/ammunition/missiles/TOW_FAMILY.md) · [미사일 목록](library/ammunition/README.md) | 2A 탠덤, 2B 상부 CE 240 / 기본 피해 535 HP |
| **1989년 96개 적재 프리셋** | [차량별 프리셋](library/presets/1989/README.md) · [JSON](library/presets/1989/TANK_LOADOUTS_96.json) | 본편 32종×기본·대기갑·화력지원 3종 |
| **ERA·추가장갑·APS** | [장갑 시스템](library/systems/armor/README.md) · [Trophy HV](library/systems/aps/TROPHY_HV.md) | K1/K5·ARAT TUSK 소모, BDD/D-Tech·2A8 장갑 HP, Anti-ERA, 좌우 독립 요격 |
| **명중·관통·피해·장전** | [공통 시스템](library/systems/README.md) | APFSDS 과관통 곡선, 도탄, HEP/HE-FRAG, 모듈, 보급 |
| **IFV·APC·정찰차·헬기** | [차량별 상세](library/vehicles/README.md) | Bradley, BMP, Marder, APC, Mi-24, AH-64A |
| **자주대공포·35mm 탄약** | [M163·게파르트](library/vehicles/README.md) · [게파르트 35mm 탄약](library/ammunition/autocannon/GEPARD_35MM.md) · [3:1 탄띠](library/presets/1989/GEPARD_BELTS.md) | M163 기존 정본, 게파르트 650 HP·2문·유효 3.5/최대 4km, DM21 지상/공중 피해 분리 |
| **보병·전장 시스템** | [보병](library/units/README.md) · [지도/LOS/AI](library/systems/maps/LARGE_MAP_LOS_AND_AI.md) | 미정·시험값을 사용자 확정값과 분리 |
| **세계관·작업 이력** | [대체역사 원안](library/world/README.md) · [WIP/구형 이력 자료실](library/history/README.md) | 1989년 OOB 원안, WIP09~22 기록, 과거 시제품 보존 |

## 정본 관리 기준

- [**자료별 단일 책임·최신 사용자 결정·구현 상태 분리 규칙**](library/CANONICAL_RULES.md).
- 게임 설계 **확정 수치와 미정·잠정·역사 기록**을 구별한다. 새로운 현대/후속 전차·미사일을 1989년 본편에 자동 지급하지 않는다.
- **게임 코드·실행 빌드·1989년 기존 96개 실제 프리셋 데이터는 이번 문서 개편으로 수정되지 않았다.**

## 복구·검증·옛 원본

- [5단계 최종 검증/이관 보고서](library/migration/STAGE5_FINAL_VALIDATION_2026-11-19.md) · [단계별 작업·감사 기록](library/README.md)
- [정리 이전 보존 브랜치](https://github.com/0-FLANDRE-0/Tactical_Project/tree/archive-library-baseline-2026-11-19) — 기준 SHA `1593dc2`.
- **레거시 원본:** [구형 통합 전차 기준표](tanks/README.md) · [구형 통합 탄약 기준표](ammo/README.md) · [Bradley/TOW 옛 통합 문서](vehicles/USAREUR_IFV_CFV_ROSTER_PLAN_2026-11-12.md) · [과거 지시서](instructions/README.md). **전부 보존**, 새 정본으로 들어가는 안내를 제공한다.
- [원본 63개 파일 SHA 목록](library/migration/BASELINE_FILE_MANIFEST_2026-11-19.json) · [3단계 이관 파일 목록](library/migration/STAGE3_LIBRARY_MANIFEST_2026-11-19.json) · [4단계 이관 파일 목록](library/migration/STAGE4_SYSTEM_HISTORY_MANIFEST_2026-11-19.json).

> **원칙:** 한 데이터의 실제 수정은 [정본 소유권 규칙](library/CANONICAL_RULES.md)에 따라 수행하고, 다른 문서에서는 연결 링크만 갱신한다. 소스 원본·과거 시행착오를 사실 확인 없이 삭제하거나 미정 게임 수치를 임의로 채우지 않는다.
