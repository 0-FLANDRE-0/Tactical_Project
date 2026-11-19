# 공통 시스템 라이브러리 — 정식 카탈로그

> **2026-11-19 5단계 정본 전환 완료.** 방호·전투·보급·지도 **설계 규칙의 공식 탐색/수정 진입점**. 수치 확정/잠정/미구현 상태를 분리하며, [정본 책임 규칙](../CANONICAL_RULES.md)을 따른다. 엔진 코드는 변경하지 않았다.

## 장갑·APS
- [7구역 / Kontakt ERA 피복률 %p 손실](armor/SEVEN_ZONE_AND_KONTAKT_ERA.md)
- [BDD·D-Tech 비폭발성 증가장갑 독립 HP](armor/NON_EXPLOSIVE_ADDON_ARMOR.md)
- [2A8 모듈러 증가장갑(하한 42.5%)](armor/LEOPARD_2A8_MODULAR_ARMOR.md)
- [Anti-ERA 추가 방호력 감쇄 (숫자 미정)](armor/ANTI_ERA.md)
- [Trophy HV 좌우 독립 APS](aps/TROPHY_HV.md)
- [T-14M Afghanit APS — 포탑 전방 ±60°·좌우 5발·225ms·50~1,700m/s·KE 관통력 최대 38% 감쇄](aps/AFGHANIT_T14M.md)

## 전투·피해
- [105/120/125mm APFSDS 피해·과관통 곡선과 APDS 예외](combat/APFSDS_DAMAGE_CURVES.md)
- [입사각·도탄·HEAT 신관](combat/ANGLE_RICOCHET_FUZE.md)
- [발사→착탄 2단계와 장갑구역](combat/TWO_STAGE_HIT.md)
- [기관포 피해 정책](combat/AUTOCANNON_DAMAGE.md)
- [HEP·HE-FRAG·APERS 피해 경로](combat/HEP_HEFRAG_APERS.md)
- [모듈·승무원·탄약고 사고](combat/MODULE_CREW_AMMO_INCIDENTS.md)
- [잔해·관측/선택](combat/WRECK_VISIBILITY.md)

## 운용·지도·항공
- [장전·탄약 이동·보급/비용/편성](logistics/RELOAD_AMMO_SUPPLY.md)
- [1989 전차 96개 프리셋](../presets/1989/README.md)
- [항공 투입·방공·레이더 LOS](air/AIR_ENTRY_RADAR_AA.md)
- [지도 크기·LOS·경로탐색·분대 AI](maps/LARGE_MAP_LOS_AND_AI.md)

**피복률 손실과 추가장갑 HP 감소, Anti-ERA, APS 재고는 서로 다른 상태.** 관통력·기본 피해·피해 배율·증가장갑 충격 HP도 각각 분리. WIP의 시험 구현은 전체 차량 범용 구현의 증거가 아님.
