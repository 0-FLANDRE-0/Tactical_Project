# TACTICAL 탄약·미사일 라이브러리 — 정식 카탈로그

> **2026-11-19 5단계 전환 완료.** 탄종별 **관통력·기본 피해·속도**의 현행 데이터 진입점. 사용자 확정/잠정/미정 및 1989·후속 시대를 구별하고, [정본 소유권 규칙](../CANONICAL_RULES.md)에 따른다. 게임 코드는 변경하지 않았다.

## 전차포 / 화포 탄약

| 국적·구경 | 이관 문서 |
|---|---|
| 미국 105mm | [US 105mm](cannon/US_105.md) |
| 미국 120mm | [US 120mm — M829~M829A4 (A3/A4 2026-11-19 확정)](cannon/US_120.md) |
| 서독 105mm | [West Germany 105mm](cannon/WEST_GERMANY_105.md) |
| 서독 120mm (1989) | [West Germany 120mm](cannon/WEST_GERMANY_120_1989.md) |
| 소련 125mm | [Soviet 125mm](cannon/SOVIET_125.md) |
| 동독 NVA 100/125mm | [NVA 탄약](cannon/NVA.md) |
| 전차별 기본 지급 탄종 | [NATO·소련 기본 탄종 연결](cannon/DEFAULT_TANK_AMMO.md) |

## 후속 시대 / 현대 APFSDS

- [DM53 / DM53A1 / DM63 / DM63A1 / DM73 · M829A2/A3/A4 Anti-ERA](modern/APFSDS_120MM.md)
- [현대 러시아 125mm APFSDS — 3BM59/60 스비네츠 · 3BM69/70 바쿠움](modern/APFSDS_125MM.md) — 2km 0°/30°/60° KE, 기본 차량 HP, 포구초속 확정(3BM60 **1,660m/s**). **1989년 소련탄과 별도 관리**, Anti-ERA·10m KE·차량별 적재 미정.
- **Anti-ERA:** 탄약이 ERA의 추가 KE 방호력을 일부 감쇄하는 능력; ERA 피복률 소모와 별개. DM53~DM63은 Kontakt-5급, DM63A1은 Relikt급에도 부분 대응, DM73은 한 단계 더 높은 대응. **M829A1은 Anti-ERA 없음(감쇄율 0%)**, **M829A2×Kontakt-5 38.5%**, **M829A3×Kontakt-5 74.8%**, **M829A2×Relikt 18.6%**, **M829A3×Relikt 47.6%**가 사용자 확정됐으며 [시스템 정본](../systems/armor/ANTI_ERA.md)을 따른다. **M829A4×K5 89.8%·×Relikt 67.5%는 검토 후보(미확정)**이고, 그 외 탄약×ERA 조합의 정량 감쇄율·범위는 미정이다.
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
