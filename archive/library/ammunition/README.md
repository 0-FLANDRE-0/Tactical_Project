# TACTICAL 탄약·미사일 라이브러리 — 3단계 이관본

> **정본 전환 이전 이관 자료.** 사용자 확정/임시/미정과 1989년 정상탄/후속탄 구분을 보존. 장갑 관통력(KE/CE)과 기본 차량 HP 피해는 별개의 값이며, 원본 값·코드·프리셋을 임의 변경하지 않음.

## 전차포 / 화포 탄약

| 국적·구경 | 이관 문서 |
|---|---|
| 미국 105mm | [US 105mm](cannon/US_105.md) |
| 미국 120mm | [US 120mm, M829A2 후기형 정보 포함](cannon/US_120.md) |
| 서독 105mm | [West Germany 105mm](cannon/WEST_GERMANY_105.md) |
| 서독 120mm (1989) | [West Germany 120mm](cannon/WEST_GERMANY_120_1989.md) |
| 소련 125mm | [Soviet 125mm](cannon/SOVIET_125.md) |
| 동독 NVA 100/125mm | [NVA 탄약](cannon/NVA.md) |
| 전차별 기본 지급 탄종 | [NATO·소련 기본 탄종 연결](cannon/DEFAULT_TANK_AMMO.md) |

## 후속 시대 / 현대 APFSDS

- [DM53 / DM53A1 / DM63 / DM63A1 / DM73 · M829A2 Anti-ERA](modern/APFSDS_120MM.md)
- **Anti-ERA:** 탄약이 ERA의 추가 KE 방호력을 일부 감쇄하는 능력; ERA 피복률 소모와 별개. DM53~DM63은 Kontakt-5급, DM63A1은 Relikt급에도 부분 대응, DM73은 한 단계 더 높은 대응. **숫자 감쇄율 미정**.
- [원본 근거리 10m 29종 KE 표](../migration/STAGE2_CANONICAL_SOURCE_AUDIT_2026-11-19.md) — 해당 자료는 별도 `archive/ammo/NEAR_ZERO_10M_KE_PENETRATION_2026-11-08.md`로 보존, 별도 이관 검증 예정.

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
- [기존 탄약 전체 원본](../../ammo/README.md) — **최종 전환 전에는 아직 이 원본이 공식 기준**.
- **관통 배율·HEP·ERA·장전·보급 등 공통 시스템은 4단계에 분리 예정.**
