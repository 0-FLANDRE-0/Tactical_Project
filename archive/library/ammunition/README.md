# TACTICAL 탄약·미사일 라이브러리 — 정식 카탈로그

> **2026-11-19 5단계 전환 완료.** 탄종별 **관통력·기본 피해·속도**의 현행 데이터 진입점. 사용자 확정/잠정/미정 및 1989·후속 시대를 구별하고, [정본 소유권 규칙](../CANONICAL_RULES.md)에 따른다. 게임 코드는 변경하지 않았다.

## 전차포 / 화포 탄약

| 국적·구경 | 이관 문서 |
|---|---|
| 미국 105mm | [US 105mm](cannon/US_105.md) |
| 미국 120mm (1989) | [US 120mm — M829·M829A1·M830 (M829 계열 5거리 KE·탄속 확정)](cannon/US_120.md) |
| 서독 105mm | [West Germany 105mm](cannon/WEST_GERMANY_105.md) |
| 서독 120mm (1989) | [West Germany 120mm — DM33·DM33A1 5거리 KE·탄속 2026-11-20 갱신, DM33A1 피해 366 HP](cannon/WEST_GERMANY_120_1989.md) |
| 소련 125mm | [Soviet 125mm](cannon/SOVIET_125.md) |
| 동독 NVA 100/125mm | [NVA 탄약](cannon/NVA.md) |
| 전차별 기본 지급 탄종 | [NATO·소련 기본 탄종 연결](cannon/DEFAULT_TANK_AMMO.md) |

## 1989 자주대공포·기관포 탄약

- [서독 게파르트 **35mm KDA DM21 HEI / DM13A1 SAPHEI-T / DM23 APDS-T**](autocannon/GEPARD_35MM.md) — 6거리×3각도 KE 관통력 이미지 수치, DM21 지상·공중 별도 CE 피해곡선, DM13A1 신관·외부 폭발, DM23 과관통. [차량 정본](../vehicles/1989/air_defense/GEPARD.md) · [탄띠 프리셋](../presets/1989/GEPARD_BELTS.md).
- [미국 M163 20mm M168 AP-I](../vehicles/1989/air_defense/M163_VADS.md) — 해당 차량 정본에 관통력/속도/기본 피해 기록.

## 후속 시대 / 현대 APFSDS

- [현대 120mm 탄약 — DM53~DM73 · M829A2/A3/A4 · M830A1 (미국 A2/A3/A4 5거리 탄속·관통력·Anti-ERA 확정)](modern/APFSDS_120MM.md)
- [현대 러시아 125mm APFSDS — 3BM59/60 스비네츠 · 3BM69/70 바쿠움](modern/APFSDS_125MM.md) — 2km 0°/30°/60° KE, 기본 차량 HP, 포구초속 확정(3BM60 **1,660m/s**). **1989년 소련탄과 별도 관리**, Anti-ERA·10m KE·차량별 적재 미정.
- **Anti-ERA 최신 확정(2026-11-20):** 미국 M829A1은 **0%**, M829A2/A3/A4의 **Kontakt-5 38.5% / 74.8% / 89.8%**, **Relikt 18.6% / 47.6% / 62.5%**, **Malakhit 2.0% / 26.2% / 54.8%** 모두 확정. 이전 **A4×Relikt 67.5% 후보 폐기**. 효과는 ERA 추가 KE에만 적용하고, T-14M 측면 2겹은 최외곽 한 층만 감쇄한다. 기타 독일 현대탄·미지정 ERA 조합은 개별 미정. 수치·산식은 [Anti-ERA 시스템 정본](../systems/armor/ANTI_ERA.md), 말라킷 측면 계산은 [T-14M ERA 정본](../systems/armor/T14M_MALAKHIT_ERA.md) 참조.
- [근거리 0~10m KE 29종 3각도 이관본](references/NEAR_ZERO_10M_KE.md) — 원본 29종의 게임용 10m/2km 표와 추정·검토 메모 보존.

## 미사일

| 계열 | 이관 문서 | 주요 구분 |
|---|---|---|
| BGM-71 TOW A/B/C/D/E/F | [TOW 계열](missiles/TOW_FAMILY.md) | 2A 탠덤·2B 상부 전용 CE 240/535 HP |
| 소련 125mm 포발사 9M112/9M119 | [Soviet 125 ATGM](missiles/SOVIET_125_GUN_LAUNCHED.md) | 후기 9M119M 1989 제외, 9M124 선택 미정 |
| 서독 MILAN 1/2 | [MILAN](missiles/MILAN_1_2.md) | Marder 관련 |
| 소련 BMP 탑재 | [BMP ATGM](missiles/BMP_ATGM.md) | 차량별 호환 |
| 미국 AGM-114A | [Hellfire](missiles/AGM_114A_HELLFIRE.md) | AH-64A 관련 |
| 소련 Mi-24 탑재 | [Hind ATGM](missiles/MI24_ATGM.md) | 6종 제원, 희귀 도입 설정 구분 |

## 1989 적재·전투 규칙

- [검산한 32종 × 3 = 96개 프리셋](../presets/1989/README.md)
- [기존 탄약 전체 원본](../../ammo/README.md) — **레거시 출처·이력 검증용**.
- **관통 배율·HEP·ERA·장전·보급 공통 시스템**은 [시스템 카탈로그](../systems/README.md)를 우선한다.
