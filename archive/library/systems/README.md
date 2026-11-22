# 공통 시스템 라이브러리 — 정식 카탈로그

> **2026-11-19 5단계 정본 전환 완료.** 방호·전투·보급·지도 **설계 규칙의 공식 탐색/수정 진입점**. 수치 확정/잠정/미구현 상태를 분리하며, [정본 책임 규칙](../CANONICAL_RULES.md)을 따른다. 엔진 코드는 변경하지 않았다.

## 장갑·APS
- [7구역 / Kontakt ERA 피복률 %p 손실](armor/SEVEN_ZONE_AND_KONTAKT_ERA.md)
- [BDD·D-Tech 비폭발성 증가장갑 독립 HP](armor/NON_EXPLOSIVE_ADDON_ARMOR.md)
- [2A8 모듈러 증가장갑(하한 42.5%)](armor/LEOPARD_2A8_MODULAR_ARMOR.md)
- [Anti-ERA 탄종·ERA별 감쇄 및 다층 ERA 최외곽만 적용](armor/ANTI_ERA.md)
- [Trophy HV 좌우 독립 APS](aps/TROPHY_HV.md)
- [T-90M Arena-M APS — 포탑 추종 4구획×3발·총 12발·140ms·차탄 0.25초·45~1,000m/s](aps/ARENA_M_T90M.md)
- [T-14M Afghanit APS — 포탑 전방 ±60°·좌우 5발·90ms·차탄 0.2초·50~1,700m/s·KE 관통력 최대 38% 감쇄](aps/AFGHANIT_T14M.md)

## 전투·피해
- [105/120/125mm APFSDS 피해·과관통 곡선과 APDS 예외](combat/APFSDS_DAMAGE_CURVES.md)
- [지상 입사각·도탄·HEAT 신관 / **모든 공중장비 입사각 생략·거리별 0°값**](combat/ANGLE_RICOCHET_FUZE.md)
- [발사→착탄 2단계와 장갑구역](combat/TWO_STAGE_HIT.md)
- [**모든 탄약 2km 이후 거리별 관통력 감쇄**](combat/RANGE_PENETRATION_EXTRAPOLATION.md) — 기존 노드와 0~2km 감쇄 추세 기반 원거리 강화 감쇄, **거리무관 개별 탄종 예외** 및 수치 함수 미정
- [기관포 피해 정책](combat/AUTOCANNON_DAMAGE.md)
- [모든 공중장비·모든 탄종 **비관통 직격**, AP계열 **과관통** 시 기본 피해 최소 25%](combat/AIR_TARGET_DAMAGE.md)
- [HEP 30mm 파공·30~120mm 스폴/비파공 감쇄, HE-FRAG·APERS 피해 경로](combat/HEP_HEFRAG_APERS.md)
- [게파르트 DM21 지상/공중 폭발 피해곡선, DM13A1 신관·DM23 KE](../ammunition/autocannon/GEPARD_35MM.md) — HEP와 구분
- [퉁구스카 **30mm 2A38 탄약**](../ammunition/autocannon/TUNGUSKA_30MM_2A38.md) · [9M311 SAM](../ammunition/missiles/9M311_SAM.md) — 기본 HP 및 CE, 직격/근접신관 분리·신관 확률 미정
- [M163·쉴카 **20/23mm AP·HE 탄약 정본**](../ammunition/autocannon/M163_SHILKA_AA_20_23MM.md) — **AP-I 38/HEI-T 68/API-T 55/HEFI-T 108HP**, 3:1 고정 탄띠, 공중 최소 피해/정확한 CE 매핑 미정
- [IFV 고폭탄 공통 **지상 급감·공중 완만 감쇄** 곡선](combat/IFV_HE_DAMAGE_CURVES.md) — **20/25/30mm 기관포 HE 적용**, **73mm 그롬 OG-15V 제외**, 탄종별 기본 HP·CE값 불변, 상세 매핑 미정
- [모듈·승무원·탄약고 사고](combat/MODULE_CREW_AMMO_INCIDENTS.md)
- [잔해·관측/선택](combat/WRECK_VISIBILITY.md)

## 운용·지도·항공
- [장전·탄약 이동·보급/비용/편성](logistics/RELOAD_AMMO_SUPPLY.md)
- [1989 전차 96개 프리셋](../presets/1989/README.md)
- [공중 레이더 수색·탐지·추적 공통 정본](air/RADAR_SEARCH_TRACKING.md) — **엔진 전지적 위치와 유닛 인식 분리**; 표적별 피탐지 기반값, 레이더별 거리·LOS·성능 보정, **게파르트 15km**, 추적/광학 정보·명중률 분리
- [**항공 플레어 저항성(%)·IRCCM 0~3단계 기만확률 감쇄율(%)·ECCM 설계**](air/COUNTERMEASURES_FLARE_IRCCM_ECCM.md) — **플레어 발당 독립 판정** 유지. 램프형 Lipa·AN/ALQ-144 감쇄 전 기본 90%, IRCCM **0단계=0%, 1단계=40~60%, 2/3단계 램프형=100% 감쇄**. **1단계 개별 확정: 9M37 IR 45%, MIM-72C/E 55%**. 3단계 레이저 DIRCM 저항 미정, 광학 명암비 채널 별도 구별. 실행 코드 미구현.
- [**Mi-24 ASO-2V 소구경 플레어·Lipa 능동 IR 교란**](air/MI24_FLARE_LIPA.md) — D **4×32=128발·Lipa 없음**, V/P **6×32=192발·Lipa 기본 장착**, 소구경 플레어 **18.5%/발**. Lipa **감쇄 전 기본 90%**, 적 미사일별 IRCCM 등급 감쇄 적용. 일반 **2발×4회=8발**, 긴급 **2발×8회=16발**.
- [**AH-64A 중구경 플레어·AN/ALQ-144 디스코볼**](air/AH64A_FLARE_ALQ144.md) — 중구경 플레어 **30발·34.6%/발**, ALQ-144 **감쇄 전 기본 90%**에 적 미사일 IRCCM 감쇄 적용. 2D 평면 360°, 미사일당 장비별 최대 1회. 살포 일반 **3발**, 긴급 **5발**.
- [자주대공포 **발당 명중률 잠정 시험안**](air/AA_GUN_HIT_PROBABILITY.md) — **게파르트 500m~4km 제안 범위**, M163 근거리 안정성·거리/오차 민감도(정량 미정); 사격·탐지·점사 확률 구분, 코드 미구현
- [항공 투입·방공·레이더 LOS](air/AIR_ENTRY_RADAR_AA.md)
- [지도 크기·LOS·경로탐색·분대 AI](maps/LARGE_MAP_LOS_AND_AI.md)

**피복률 손실과 추가장갑 HP 감소, Anti-ERA, APS 재고는 서로 다른 상태.** 관통력·기본 피해·피해 배율·증가장갑 충격 HP도 각각 분리. WIP의 시험 구현은 전체 차량 범용 구현의 증거가 아님.
