# TACTICAL — 게임 설계 정본 라이브러리

> **현재 제원·규칙의 공식 진입점.** 숫자는 각 차량·탄약·시스템 파일 한 곳에서 관리하며 색인에는 중복 기재하지 않는다. [정본 책임과 우선순위](CANONICAL_RULES.md).

## 분야별 탐색

| 자료 | 정본 |
|---|---|
| 차량·1989 전차 32종·현대 전차·헬기·대공차량 | [차량 카탈로그](vehicles/README.md) |
| 전차포탄·대공포탄·미사일 | [탄약 카탈로그](ammunition/README.md) |
| ERA·APS·레이더·명중·관통·피해·보급 | [시스템 카탈로그](systems/README.md) |
| 1989 전차 96개 적재 편성 | [프리셋](presets/1989/README.md) · [JSON](presets/1989/TANK_LOADOUTS_96.json) |
| 보병·개별 유닛 | [유닛](units/README.md) |
| 1989 대체역사 | [세계관](world/README.md) |
| WIP·구형 수치·폐기 제안 | [이력](history/README.md) |
| 항공기 비교 | [보조 색인](indexes/AIRCRAFT_1989.md) |

## 1989 자주대공포·대공 미사일 바로가기

- **기관포 차량:** [게파르트](vehicles/1989/air_defense/GEPARD.md) · [M163](vehicles/1989/air_defense/M163_VADS.md) · [쉴카](vehicles/1989/air_defense/ZSU23_4_SHILKA.md) · [퉁구스카](vehicles/1989/air_defense/2S6_TUNGUSKA.md)
- **미사일 차량:** [스트렐라-10M2](vehicles/1989/air_defense/STRELA_10M2.md) · [채퍼럴](vehicles/1989/air_defense/M48_CHAPARRAL.md) · [롤란드 2](vehicles/1989/air_defense/ROLAND_2_MARDER.md)
- **대공 포탄:** [20/23mm](ammunition/autocannon/M163_SHILKA_AA_20_23MM.md) · [35mm](ammunition/autocannon/GEPARD_35MM.md) · [30mm](ammunition/autocannon/TUNGUSKA_30MM_2A38.md)
- **대공 미사일:** [9M311](ammunition/missiles/9M311_SAM.md) · [9M37/9M37M](ammunition/missiles/9M37_9M37M_STRELA10.md) · [MIM-72](ammunition/missiles/MIM72_A_C_E_G_CHAPARRAL.md) · [롤란드 2/3](ammunition/missiles/ROLAND_2_3_SAM.md)

## 공통 전투 판정 바로가기

- [수색·추적 레이더](systems/air/RADAR_SEARCH_TRACKING.md) · [플레어·IRCCM](systems/air/COUNTERMEASURES_FLARE_IRCCM_ECCM.md) · [대공포 명중률](systems/air/AA_GUN_HIT_PROBABILITY.md)
- [공중 표적 피해](systems/combat/AIR_TARGET_DAMAGE.md) · [IFV HE 피해](systems/combat/IFV_HE_DAMAGE_CURVES.md) · [도탄·입사각](systems/combat/ANGLE_RICOCHET_FUZE.md) · [2km 이후 관통력](systems/combat/RANGE_PENETRATION_EXTRAPOLATION.md)

## 읽을 때 주의할 것

- KE/CE 관통·방호, 차량 최대 HP, 탄약 기본 피해 HP, 추가장갑 HP 및 ERA %p는 별개.
- **사용자 확정·잠정·미정·이력**과 **게임 코드 실제 구현**은 별도. 1989·후속·현대는 구별한다.
- [2026-11-19 원본 이관 검증](migration/STAGE5_FINAL_VALIDATION_2026-11-19.md) · [2026-11-21 1단계 이전 백업](https://github.com/0-FLANDRE-0/Tactical_Project/tree/archive-cleanup-baseline-2026-11-21) · [2단계 이전 백업](https://github.com/0-FLANDRE-0/Tactical_Project/tree/archive-cleanup-stage2-baseline-2026-11-21)
- [구형 전차 문서 안내](../tanks/README.md) · [구형 탄약 문서 안내](../ammo/README.md): 과거 원문은 2단계 백업에서 조회.
