# 아카이브 라이브러리 전환 — 1단계 백업 및 파일 인벤토리 (2026-11-19)

> **상태: 1단계 완료.** 이 문서는 라이브러리형 개편에 앞서 **정리 이전의 파일 위치와 Git Blob 식별자**를 보존하는 작업 기준서다. 아직 본문 정규화·원본 이동·기존 데이터 삭제를 수행하지 않았다. 아래 파일 수는 **백업 기준 커밋** 시점의 값이며, 이 파일 자체를 포함한 이후 신규 파일 수와 구분한다.

## 1. 복구 지점 및 조사 범위

- **GitHub 저장소:** [0-FLANDRE-0/Tactical_Project](https://github.com/0-FLANDRE-0/Tactical_Project)
- **정리 이전 원본:** `main`의 커밋 [`1593dc2caab7c55af85c4df9acf748d2f2fe0706`](https://github.com/0-FLANDRE-0/Tactical_Project/commit/1593dc2caab7c55af85c4df9acf748d2f2fe0706)
- **보존 브랜치:** [`archive-library-baseline-2026-11-19`](https://github.com/0-FLANDRE-0/Tactical_Project/tree/archive-library-baseline-2026-11-19) — 위 커밋에서 생성했고 최초 HEAD가 정확히 일치함. **이 브랜치는 라이브러리 작업용으로 쓰거나 업데이트하지 않는다.** 브랜치 보호 설정은 없으며, 기준 커밋 SHA 자체도 반드시 기록한다.
- **조사 범위:** `archive/**`의 Git 추적 파일 전체. **폴더 10개 / 파일 63개 / 총 32.46 MiB.** Markdown **46**, HTML **7**, JavaScript **4**, SVG **2**, Python **2**, PNG **1**, ZIP **1**.
- **기계 판독용 목록:** [`BASELINE_FILE_MANIFEST_2026-11-19.json`](BASELINE_FILE_MANIFEST_2026-11-19.json) — 파일 **전체 상대 경로·크기·전체 Git Blob SHA** 보존. 향후 옮겨진 파일의 본문·누락 여부 대조에 사용.
- **범위 한계:** Git 트리 목록은 **모든 파일의 존재와 식별자**를 확인하는 데 사용했다. **46개 Markdown 본문 전체의 확정·잠정·상충 문구에 대한 행별 전수 검사는 아직 하지 않았으며 2단계 작업이다.** 소스 코드 전체 및 `archive/` 외부 파일의 전수조사도 이번 범위에 포함하지 않음.

## 2. 초기 확인된 정리 대상과 위험

| 발견 | 원본 위치 | 2단계에서 할 일 |
|---|---|---|
| 탄약·프리셋·피해곡선·현대 날탄·TOW가 하나의 문서에 중첩 | `archive/ammo/README.md` (조사 시 약 775줄) | 탄종 데이터, 규칙, 프리셋의 **정본 위치** 분리; 수치는 복사 전후 대조 |
| 1989년 제목 안에 후속 M1A2와 현대 Leopard 2A8, Trophy HV 혼재 | `archive/tanks/README.md` (약 599줄) | 시대별 차량 프로필과 공용 방호 체계 분리, **32 + 후속 M1A2 2 + 별도 2A8**의 범위 보존 |
| TOW 원본은 Bradley 문서, TOW 2A/2B 추가는 탄약 문서에도 존재 | `vehicles/USAREUR_IFV_CFV_ROSTER_PLAN_2026-11-12.md` + `ammo/README.md` | TOW 2A **880/760/440·538 HP**와 TOW 2B **상부 CE 240·535 HP**의 정본 1개 지정, 다른 문서 링크화 |
| 목차에 수치와 설명이 길게 반복 | `archive/README.md` | 간단한 색인(시대·범주·문서·상태)으로 축약하고 본문은 개별 데이터 링크 |
| 설계 확정·시험 코드 적용·미구현·미정이 한 문서에 혼재 | `tanks/`, `ammo/`, `vehicles/`, `combat/` | **설계값 / 구현 상태 / 검증 상태**를 개별 필드로 분리 |
| WIP 아카이브가 규모가 크고 과거 상태 문구가 섞일 수 있음 | `archive/Tactical_v0.4_WIP*.html`, `instructions/`, `NEXT_STEPS_2026-11-07.md` | 코드·HTML·지시서는 **역사 자료 보존**; 메인 게임 코드의 현행 상태로 단정하지 않음 |
| 기존 구형 통합 문서 안내 파일 존재 | `archive/TACTICAL_1989_NATO_ARMOR_AMMO_DESIGN_ARCHIVE_2026-11-06.md` | 삭제보다 **폐기 표식과 이력 참조** 유지가 안전한지 평가 |
| 여러 Markdown 간 상대경로 의존 | `archive/**` | 파일 이동 전후 상대 링크·앵커 검사; 원본 링크를 한꺼번에 제거하지 않음 |

## 3. 단계별 실행 계획

| 단계 | 내용 | 완료 기준 |
|---|---|---|
| **1. 기준점 백업·전체 파일 인벤토리** | 기존 main 정확한 커밋에서 보존 브랜치 생성, `archive/` 파일 목록·해시·원본 위치 기록 | **완료 — 63개 파일 / 10개 폴더 확인, 원본 이동·삭제 0건** |
| **2. 본문 전수 확인·정본 설계** | 46개 Markdown의 확정/잠정/폐기/구현 구분, 중복·상충 수치 확인, 시대·장비·탄약·시스템 식별자와 정본 경로 정함 | 데이터 책임표, 충돌/미정 목록, 새 폴더 스키마 작성. **값 임의 수정 금지** |
| **3. 차량·탄약·미사일 라이브러리 구축** | 1989/후속/현대 차량을 분리하고 탄약·미사일은 범용 정본화. 장비에서 보유탄 링크만 참조 | 핵심 차량·탄약 스펙 누락 없고 1989년 **32종 × 3 = 96개** 프리셋 원본 보존 |
| **4. 공통 시스템·프리셋·역사 자료 정리** | ERA·추가장갑·APS·관통·피해·장전 규칙은 시스템 문서로, 보급·적재는 프리셋으로. WIP 실행물과 설계 문서 구분 | 규칙 중복 최소화, 구현 여부와 미정 구분, 이력/스냅샷 보존 |
| **5. 링크·수치 대조 및 구형 정리** | 전체 참조 검사, 기준 커밋·manifest와 데이터 비교, 새 색인 확정, 구문서 리다이렉트/폐기 안내 또는 중복 정리 | 무손실 검증 성공 후에만 구형 본문 정리. **대량 삭제는 별도 검토** |

## 4. 전환 시 불변 조건

1. **사용자 확정 수치가 우선.** 최신 설계값을 구조 정리 명목으로 재해석·균등화·추측하지 않음.
2. **1989년 본편 32종과 96개 적재 프리셋을 유지.** M1A2(1992/1998), 현대 Leopard 2A8, TOW 2B 등은 현재 시대 분류 그대로 관리.
3. **탄약 관통력·기본 HP 피해·공통 과관통 곡선과 장갑 KE/CE를 혼동하지 않음.** CE 240인 TOW 2B의 기본 피해는 별도 **535 HP**.
4. **ERA 피복률 소모·Anti-ERA 방호 효과 감쇄·비폭발성 증가장갑 독립 HP·Trophy HV 좌우 독립 요격은 서로 다른 시스템.**
5. **미정값을 임의로 채우지 않음.** 승인된 설계 제원과 현재 코드 구현·시험 결과를 분리.
6. 모든 대형 HTML/JS/이미지/ZIP/Python 이력 자산은 별도 검증 없이 변경·삭제하지 않음.
7. **GitHub 실제 게임 코드와 1989년 전투 프리셋을 1단계에서 변경하지 않음.**

## 5. 정리 이전 파일 전체 목록 (63개)

다음 표는 **백업 기준 커밋의 Git 트리**에서 수집했음. 이름·크기·Blob SHA는 이 파일의 역사적 기준으로 고정된다. 향후 `library/` 파일은 아래 기존 63개에 포함되지 않음.

### archive/ 최상위 — 14개

기존 인덱스, 진행 기록, WIP 실행 스냅샷·도면

| 원본 파일 | 용량 | Blob SHA 앞 12자리 |
|---|---:|---|
| [`M1A2_before_proportion_fix.svg`](../../M1A2_before_proportion_fix.svg) | 32.5 KiB | `c74e1c4cb129` |
| [`M1A2_WIP04_top_view.svg`](../../M1A2_WIP04_top_view.svg) | 31.1 KiB | `e3b8e11ee2f6` |
| [`NEXT_STEPS_2026-11-07.md`](../../NEXT_STEPS_2026-11-07.md) | 42.6 KiB | `5e3d82fe34d2` |
| [`README.md`](../../README.md) | 20.2 KiB | `ac443d60d62b` |
| [`TACTICAL_1989_NATO_ARMOR_AMMO_DESIGN_ARCHIVE_2026-11-06.md`](https://github.com/0-FLANDRE-0/Tactical_Project/blob/archive-cleanup-baseline-2026-11-21/archive/TACTICAL_1989_NATO_ARMOR_AMMO_DESIGN_ARCHIVE_2026-11-06.md) | 0.9 KiB | `ef8710751c10` |
| [`Tactical_v0.4_WIP01_source_and_backup.zip`](../../Tactical_v0.4_WIP01_source_and_backup.zip) | 93.1 KiB | `34499961ad7f` |
| [`Tactical_v0.4_WIP01.html`](../../Tactical_v0.4_WIP01.html) | 60.7 KiB | `fa9a2d6fc754` |
| [`Tactical_v0.4_WIP02.html`](../../Tactical_v0.4_WIP02.html) | 7503.7 KiB | `ab4e702c9250` |
| [`Tactical_v0.4_WIP03.html`](../../Tactical_v0.4_WIP03.html) | 7985.6 KiB | `823eac8df97d` |
| [`Tactical_v0.4_WIP04.html`](../../Tactical_v0.4_WIP04.html) | 8035.3 KiB | `e201fb957750` |
| [`Tactical_v0.4_WIP06.html`](../../Tactical_v0.4_WIP06.html) | 8039.3 KiB | `82c85a625e2a` |
| [`WIP02_terrain_renderer.js`](../../WIP02_terrain_renderer.js) | 4.7 KiB | `10520c016679` |
| [`WIP04_initial_m1a2-art.js`](../../WIP04_initial_m1a2-art.js) | 11.1 KiB | `d8613cdde044` |
| [`WIP04_m1a2-art.js`](../../WIP04_m1a2-art.js) | 11.1 KiB | `2c13d906a3b3` |

### archive/air/ — 4개

공격헬기 및 항공 투입·방공

| 원본 파일 | 용량 | Blob SHA 앞 12자리 |
|---|---:|---|
| [`air/AH64A_APACHE_WEAPONS_AND_DAMAGE_2026-11-14.md`](../../air/AH64A_APACHE_WEAPONS_AND_DAMAGE_2026-11-14.md) | 8.8 KiB | `8766b7b8520b` |
| [`air/AIR_ENTRY_AIR_DEFENSE_IFV_AA_RULES_2026-11-14.md`](../../air/AIR_ENTRY_AIR_DEFENSE_IFV_AA_RULES_2026-11-14.md) | 10.1 KiB | `7fe0c5ed3fd9` |
| [`air/HELICOPTER_ROSTER_OVERVIEW_2026-11-15.md`](../../air/HELICOPTER_ROSTER_OVERVIEW_2026-11-15.md) | 5.4 KiB | `9d1058ae48af` |
| [`air/MI24_D_V_P_HIND_WEAPONS_AND_DAMAGE_2026-11-15.md`](../../air/MI24_D_V_P_HIND_WEAPONS_AND_DAMAGE_2026-11-15.md) | 13.0 KiB | `8e17f7f8beff` |

### archive/ammo/ — 2개

탄약 기본제원·적재 프리셋 및 근거리 KE 표

| 원본 파일 | 용량 | Blob SHA 앞 12자리 |
|---|---:|---|
| [`ammo/NEAR_ZERO_10M_KE_PENETRATION_2026-11-08.md`](../../ammo/NEAR_ZERO_10M_KE_PENETRATION_2026-11-08.md) | 8.4 KiB | `095aea25e2ae` |
| [`ammo/README.md`](../../ammo/README.md) | 112.1 KiB | `caeea18bbb55` |

### archive/art/ — 4개

Abrams 도면 뷰어·JS·이미지

| 원본 파일 | 용량 | Blob SHA 앞 12자리 |
|---|---:|---|
| [`art/abrams-topview.js`](../../art/abrams-topview.js) | 24.4 KiB | `a87cfbd3ba67` |
| [`art/M1_Abrams_TopView.html`](../../art/M1_Abrams_TopView.html) | 52.0 KiB | `06a99a015fbb` |
| [`art/ring_overlay_7916.png`](../../art/ring_overlay_7916.png) | 533.8 KiB | `e7cf85812851` |
| [`art/viewer.template.html`](../../art/viewer.template.html) | 27.7 KiB | `3e99a1aecd18` |

### archive/combat/ — 6개

피격·관통·피해 및 명중 시스템

| 원본 파일 | 용량 | Blob SHA 앞 12자리 |
|---|---:|---|
| [`combat/ANGLE_PENETRATION_RICOCHET_AND_HEAT_FUZE_RULES_2026-11-08.md`](../../combat/ANGLE_PENETRATION_RICOCHET_AND_HEAT_FUZE_RULES_2026-11-08.md) | 15.0 KiB | `f64cdf4fd695` |
| [`combat/AUTOCANNON_PENETRATION_DAMAGE_POLICY_2026-11-13.md`](../../combat/AUTOCANNON_PENETRATION_DAMAGE_POLICY_2026-11-13.md) | 6.4 KiB | `b365db02d755` |
| [`combat/PENETRATION_DAMAGE_AND_VEHICLE_HP_CONCEPT_2026-11-07.md`](../../combat/PENETRATION_DAMAGE_AND_VEHICLE_HP_CONCEPT_2026-11-07.md) | 38.6 KiB | `14fa45f3fb8f` |
| [`combat/TEMPORARY_MODULE_CREW_AMMO_DESIGN_UPDATE_2026-11-12.md`](../../combat/TEMPORARY_MODULE_CREW_AMMO_DESIGN_UPDATE_2026-11-12.md) | 6.0 KiB | `4643ac50ff21` |
| [`combat/TWO_STAGE_HIT_AND_360_ARMOR_RESOLUTION_DESIGN_2026-11-07.md`](../../combat/TWO_STAGE_HIT_AND_360_ARMOR_RESOLUTION_DESIGN_2026-11-07.md) | 14.1 KiB | `f08f94d7020b` |
| [`combat/WRECK_VISIBILITY_AND_SELECTION_RULES_2026-11-08.md`](../../combat/WRECK_VISIBILITY_AND_SELECTION_RULES_2026-11-08.md) | 4.1 KiB | `4b410e9abd6a` |

### archive/infantry/ — 1개

보병 관련 디자인 메모

| 원본 파일 | 용량 | Blob SHA 앞 12자리 |
|---|---:|---|
| [`infantry/INFANTRY_DESIGN_NOTES_2026-11-08.md`](../../infantry/INFANTRY_DESIGN_NOTES_2026-11-08.md) | 7.9 KiB | `0fc2fb130169` |

### archive/instructions/ — 22개

과거 WIP 지시서·검증용 스크립트

| 원본 파일 | 용량 | Blob SHA 앞 12자리 |
|---|---:|---|
| [`instructions/README.md`](../../instructions/README.md) | 4.9 KiB | `e94d83950720` |
| [`instructions/TACTICAL_WIP09_HIT_PROBABILITY_INSTRUCTIONS.md`](../../instructions/TACTICAL_WIP09_HIT_PROBABILITY_INSTRUCTIONS.md) | 14.4 KiB | `0c8c717bec3a` |
| [`instructions/TACTICAL_WIP10_FLIGHT_IMPACT_INSTRUCTIONS.md`](../../instructions/TACTICAL_WIP10_FLIGHT_IMPACT_INSTRUCTIONS.md) | 18.1 KiB | `514c93494c4f` |
| [`instructions/TACTICAL_WIP11D_TERRAIN_READABILITY.md`](../../instructions/TACTICAL_WIP11D_TERRAIN_READABILITY.md) | 24.8 KiB | `c6099ef59670` |
| [`instructions/TACTICAL_WIP11E_LOS_OPTIMIZATION.md`](../../instructions/TACTICAL_WIP11E_LOS_OPTIMIZATION.md) | 17.2 KiB | `d9f9de07aa40` |
| [`instructions/TACTICAL_WIP12_EFFECTS_AND_RICOCHET.md`](../../instructions/TACTICAL_WIP12_EFFECTS_AND_RICOCHET.md) | 20.4 KiB | `75f5b3fc62df` |
| [`instructions/TACTICAL_WIP13_LIGHTWEIGHT_MOBILITY.md`](../../instructions/TACTICAL_WIP13_LIGHTWEIGHT_MOBILITY.md) | 18.2 KiB | `b6fa7d2fd872` |
| [`instructions/TACTICAL_WIP14_ENEMY_AI_AND_FIRE_MOVEMENT.md`](../../instructions/TACTICAL_WIP14_ENEMY_AI_AND_FIRE_MOVEMENT.md) | 19.2 KiB | `732d7534a489` |
| [`instructions/TACTICAL_WIP15_OBSERVATION_FAULT_REVISION.md`](../../instructions/TACTICAL_WIP15_OBSERVATION_FAULT_REVISION.md) | 5.8 KiB | `ca064e109c43` |
| [`instructions/TACTICAL_WIP15_RELOAD_AND_TEMPORARY_REACTIONS.md`](../../instructions/TACTICAL_WIP15_RELOAD_AND_TEMPORARY_REACTIONS.md) | 21.3 KiB | `1a5c96a6bb2c` |
| [`instructions/TACTICAL_WIP16_ENGAGEMENT_DECISIONS.md`](../../instructions/TACTICAL_WIP16_ENGAGEMENT_DECISIONS.md) | 17.8 KiB | `682a67e3a940` |
| [`instructions/TACTICAL_WIP16_HALT_PROBE_CORRECTION_2D68725.md`](../../instructions/TACTICAL_WIP16_HALT_PROBE_CORRECTION_2D68725.md) | 0.8 KiB | `9a1520241473` |
| [`instructions/TACTICAL_WIP16_REVIEW_CORRECTIONS_ADDA7BF.md`](../../instructions/TACTICAL_WIP16_REVIEW_CORRECTIONS_ADDA7BF.md) | 1.6 KiB | `975a06eb3740` |
| [`instructions/TACTICAL_WIP16_RIDGE_CACHE_CORRECTION_311EC5B.md`](../../instructions/TACTICAL_WIP16_RIDGE_CACHE_CORRECTION_311EC5B.md) | 0.8 KiB | `4a64ffc86e68` |
| [`instructions/TACTICAL_WIP17_VARIABLE_MAP_FOUNDATION.md`](../../instructions/TACTICAL_WIP17_VARIABLE_MAP_FOUNDATION.md) | 14.7 KiB | `e9d9218ca583` |
| [`instructions/TACTICAL_WIP18_HIT_REACTIONS_AND_CREW_INJURIES.md`](../../instructions/TACTICAL_WIP18_HIT_REACTIONS_AND_CREW_INJURIES.md) | 22.3 KiB | `ba1211cabec5` |
| [`instructions/TACTICAL_WIP19_AMMUNITION_AND_COMMAND_PANEL.md`](../../instructions/TACTICAL_WIP19_AMMUNITION_AND_COMMAND_PANEL.md) | 23.6 KiB | `c6fd9ad3903e` |
| [`instructions/TACTICAL_WIP20_M1A2_AMMUNITION_INCIDENTS.md`](../../instructions/TACTICAL_WIP20_M1A2_AMMUNITION_INCIDENTS.md) | 19.0 KiB | `f762e01c71c7` |
| [`instructions/TACTICAL_WIP21_T80U_MODEL_AND_ARMOR.md`](../../instructions/TACTICAL_WIP21_T80U_MODEL_AND_ARMOR.md) | 19.0 KiB | `7073a30882cf` |
| [`instructions/TACTICAL_WIP22_T80U_OBSERVATION_AND_TRAVERSE.md`](../../instructions/TACTICAL_WIP22_T80U_OBSERVATION_AND_TRAVERSE.md) | 20.0 KiB | `1ba1b24ac9d1` |
| [`instructions/wip09_hit_reference.py`](../../instructions/wip09_hit_reference.py) | 3.6 KiB | `aeb3f31cd999` |
| [`instructions/wip10_hit_reference.py`](../../instructions/wip10_hit_reference.py) | 4.7 KiB | `2b098f381f68` |

### archive/performance/ — 1개

지도·최적화·분대 AI

| 원본 파일 | 용량 | Blob SHA 앞 12자리 |
|---|---:|---|
| [`performance/LARGE_MAP_PATHFINDING_LOS_AND_SQUAD_AI_2026-11-08.md`](../../performance/LARGE_MAP_PATHFINDING_LOS_AND_SQUAD_AI_2026-11-08.md) | 15.7 KiB | `2eac163a145d` |

### archive/tanks/ — 2개

전차 장갑·HP·현대전차 및 장갑 아이디어

| 원본 파일 | 용량 | Blob SHA 앞 12자리 |
|---|---:|---|
| [`tanks/ARMOR_SUBZONES_AND_PROBABILITY_IDEAS_2026-11-07.md`](../../tanks/ARMOR_SUBZONES_AND_PROBABILITY_IDEAS_2026-11-07.md) | 10.3 KiB | `86280628ea20` |
| [`tanks/README.md`](../../tanks/README.md) | 60.8 KiB | `cbad97448b1f` |

### archive/vehicles/ — 6개

IFV/APC/정찰차량 및 TOW/MILAN 등

| 원본 파일 | 용량 | Blob SHA 앞 12자리 |
|---|---:|---|
| [`vehicles/APC_ADDITIONAL_BTR60_M113G_FUCHS_BTR50_MTLB_2026-11-14.md`](../../vehicles/APC_ADDITIONAL_BTR60_M113G_FUCHS_BTR50_MTLB_2026-11-14.md) | 5.7 KiB | `8a4fdcd3abfb` |
| [`vehicles/APC_M113_BTR_AND_MACHINEGUN_DESIGN_NOTES_2026-11-14.md`](../../vehicles/APC_M113_BTR_AND_MACHINEGUN_DESIGN_NOTES_2026-11-14.md) | 8.6 KiB | `a7fc40ce05ce` |
| [`vehicles/BUNDESWEHR_MARDER_1A2_1A3_SPEC_2026-11-13.md`](../../vehicles/BUNDESWEHR_MARDER_1A2_1A3_SPEC_2026-11-13.md) | 9.0 KiB | `c761d32cb9c9` |
| [`vehicles/RECON_BRDM2_LUCHS_M3_BRM1K_2026-11-14.md`](../../vehicles/RECON_BRDM2_LUCHS_M3_BRM1K_2026-11-14.md) | 5.1 KiB | `40d665648d66` |
| [`vehicles/SOVIET_BMP_1_1P_2_SPEC_2026-11-13.md`](../../vehicles/SOVIET_BMP_1_1P_2_SPEC_2026-11-13.md) | 9.6 KiB | `f2d80f006862` |
| [`vehicles/USAREUR_IFV_CFV_ROSTER_PLAN_2026-11-12.md`](../../vehicles/USAREUR_IFV_CFV_ROSTER_PLAN_2026-11-12.md) | 23.1 KiB | `e6a56b9d6974` |

### archive/world/ — 1개

1989년 세계관·보유량

| 원본 파일 | 용량 | Blob SHA 앞 12자리 |
|---|---:|---|
| [`world/WW3_1989_JUNE20_FORCE_INVENTORY_OOB_DRAFT_2026-11-13.md`](../../world/WW3_1989_JUNE20_FORCE_INVENTORY_OOB_DRAFT_2026-11-13.md) | 17.5 KiB | `fa900ea49fc3` |

## 6. 1단계 체크리스트

- [x] 현행 main 정리 전 커밋 확인
- [x] 커밋 `1593dc2caab7c55af85c4df9acf748d2f2fe0706`에서 보존 브랜치 생성 및 동일 HEAD 재확인
- [x] `archive/**` 폴더·파일 전량 트리 수집(63파일 / 10폴더 / 응답 잘림 없음)
- [x] 파일 전체 경로·크기·Git blob SHA 기록
- [x] 중요 중복 위치와 구조상 위험의 1차 식별
- [ ] **2단계:** 46개 Markdown 본문 전수 검사·정본 확정 및 충돌 기록
- [ ] **3~5단계:** 데이터 이전·링크 검증·구형 내용 정리

> **주의:** 이 문서는 라이브러리 개편을 위한 작업 기록이다. **정식 전차·탄약·미사일 수치의 현행 원본은 아직 기존 문서**에 있으며, 2단계 완료 이전부터 `library/`를 최신 데이터 정본으로 취급하지 않는다.
