# TACTICAL 탄약·미사일 라이브러리 — 정식 카탈로그

> **2026-11-19 5단계 전환 완료.** 탄종별 **관통력·기본 피해·속도**의 현행 데이터 진입점. 사용자 확정/잠정/미정 및 1989·후속 시대를 구별하고, [정본 소유권 규칙](../CANONICAL_RULES.md)에 따른다. 게임 코드는 변경하지 않았다.

## 전차포 / 화포 탄약

| 국적·구경 | 이관 문서 |
|---|---|
| 미국 105mm | [US 105mm — M392A2·M728 APDS 및 M735·M774·M833 APFSDS 5거리 KE·비행속도 확정(2026-11-22), 기본 피해 346/358/342/338/347HP 유지](cannon/US_105.md) |
| 미국 120mm (1989) | [US 120mm — M829·M829A1·M830 (M829 계열 5거리 KE·탄속 확정)](cannon/US_120.md) |
| 서독 105mm | [West Germany 105mm](cannon/WEST_GERMANY_105.md) |
| 서독 120mm (1989) | [West Germany 120mm — DM33·DM33A1 5거리 KE·탄속 2026-11-20 갱신, DM33A1 피해 366 HP](cannon/WEST_GERMANY_120_1989.md) |
| 소련 125mm | [Soviet 125mm — 소련 APFSDS 6종 5거리 KE 관통력·비행속도(2026-11-22 최신), 피해 유지](cannon/SOVIET_125.md) |
| 동독 NVA 100/125mm | [NVA 탄약](cannon/NVA.md) |
| 전차별 기본 지급 탄종 | [NATO·소련 기본 탄종 연결](cannon/DEFAULT_TANK_AMMO.md) |

## 1989 자주대공포·기관포 탄약

- [서독 게파르트 **35mm KDA DM21 HEI / DM13A1 SAPHEI-T / DM23 APDS-T**](autocannon/GEPARD_35MM.md) — 6거리×3각도 KE 관통력 이미지 수치, DM21 지상·공중 별도 CE 피해곡선, DM13A1 신관·외부 폭발, DM23 과관통. [차량 정본](../vehicles/1989/air_defense/GEPARD.md) · [탄띠 프리셋](../presets/1989/GEPARD_BELTS.md).
- [소련 초기형 2S6 **30mm 2A38 AP-T 83HP / HEF-T 129HP / HEF-I 152HP**](autocannon/TUNGUSKA_30MM_2A38.md) — 워썬더 0° KE/CE 6거리 자료, **5,000RPM·1,936발·HEF-I→HEF-T→HEF-I→AP-T**; [퉁구스카 차량](../vehicles/1989/air_defense/2S6_TUNGUSKA.md) · [탄띠](../presets/1989/TUNGUSKA_2A38_BELT.md).
- [미국 M163 M168 20mm **AP-I 38HP + HEI-T 68HP / 쉴카 AZP-23 23mm API-T 55HP + HEFI-T 108HP**](autocannon/M163_SHILKA_AA_20_23MM.md) — 각 탄종 사용자 이미지/워썬더 거리별 KE/CE, **3 HE:1 AP 단일 고정 탄띠**. [M163](../vehicles/1989/air_defense/M163_VADS.md) · [쉴카](../vehicles/1989/air_defense/ZSU23_4_SHILKA.md) · [탄띠](../presets/1989/AA_FIXED_BELTS_M163_SHILKA.md).

## 후속 시대 / 현대 APFSDS

- [현대 120mm 탄약 — DM53~DM73 · M829A2/A3/A4 · M830A1 (미국 A2/A3/A4 5거리 탄속·관통력·Anti-ERA 확정)](modern/APFSDS_120MM.md)
- [현대 러시아 125mm APFSDS — 3BM59/60 스비네츠 · 3BM69/70 바쿠움](modern/APFSDS_125MM.md) — 2km 0°/30°/60° KE, 기본 차량 HP, 포구초속 확정(3BM60 **1,660m/s**). **1989년 소련탄과 별도 관리**, Anti-ERA·10m KE·차량별 적재 미정.
- **Anti-ERA 최신 확정(2026-11-20):** 미국 M829A1은 **0%**, M829A2/A3/A4의 **Kontakt-5 38.5% / 74.8% / 89.8%**, **Relikt 18.6% / 47.6% / 62.5%**, **Malakhit 2.0% / 26.2% / 54.8%** 모두 확정. 이전 **A4×Relikt 67.5% 후보 폐기**. 효과는 ERA 추가 KE에만 적용하고, T-14M 측면 2겹은 최외곽 한 층만 감쇄한다. 기타 독일 현대탄·미지정 ERA 조합은 개별 미정. 수치·산식은 [Anti-ERA 시스템 정본](../systems/armor/ANTI_ERA.md), 말라킷 측면 계산은 [T-14M ERA 정본](../systems/armor/T14M_MALAKHIT_ERA.md) 참조.
- [근거리 0~10m KE 29종 3각도 이관본](references/NEAR_ZERO_10M_KE.md) — 원본 29종의 게임용 10m/2km 표와 추정·검토 메모 보존.

## 미사일

- **스트렐라-10 9M37/9M37M 발사 전 고정 2채널 시커 모드 및 플레어 저항성:** [미사일 정본](missiles/9M37_9M37M_STRELA10.md) — 광학 모드 **9M37 74~88%·IRCCM ON / 9M37M 80~95%·ON**; IR 모드 **9M37 15~35%·OFF / 9M37M 30~60%·ON**. 발사 **전** 자동 선택·**후** 전환 없음, 야간 IR 모드. 광학 모드 표적 저고도 하강 시 명중률 **8~16%** 및 추적 실패 가능. 정상 기본 명중률 **75~100% / 85~100%**(무/약기동), 급기동 추가 감쇄. [차량 정본](../vehicles/1989/air_defense/STRELA_10M2.md): 325HP·15/10/5/5/5/5/5 RHAe·즉응4+예비4=8발. [Mi-24 플레어/Lipa](../systems/air/MI24_FLARE_LIPA.md)·[공통 판정](../systems/air/COUNTERMEASURES_FLARE_IRCCM_ECCM.md). **9M37·9M37M 공통 25 CE·직격 375HP·근접 기본 140~245HP 확정**. [9M311](missiles/9M311_SAM.md)과 같은 조건부 신관/CE·거리 감쇄 구조, **근접 감지반경·성공률·폭발거리 피해 감쇄곡선은 별도 미정**. CE 비행거리 변화·재장전·저고도 임계값 미정, 코드 미구현.
- **채퍼럴 MIM-72A/C/E/G 미사일 사용자 게임값:** [미사일 정본](missiles/MIM72_A_C_E_G_CHAPARRAL.md) — 기본 명중률 **A 65~98 / C 75~100 / E 80~100 / G 85~100%**, 플레어 저항성 **22.5 / 55 / 60 / 80.5%**, **IRCCM A/C/E OFF·G ON**, **A 후방+제한적 측면 / C/E/G 전방위 락온**, 저연모터 **E/G**. **25 CE 공통**, 직격 **A 345HP / C·E·G 360HP**, 근접폭발 기본 **A 110~280 / C·E·G 130~245HP**. [M730 차체](../vehicles/1989/air_defense/M48_CHAPARRAL.md) **285HP·5/0/0/5/5/5/0·즉응4+예비8=12발**. 신관 작동률/반경·폭발거리 감쇄 함수, G형 1989 보급률 미정; 코드 미구현.
- **서독 Roland 2/3 자주방공 미사일 사용자 게임값:** [Roland 미사일 정본](missiles/ROLAND_2_3_SAM.md) — 최대 사거리 **6,300m/8,000m**, 거리무관 **30/35 CE**, 정상 직격 **395/420HP**, 근접신관 성공 시 기본 폭발피해 **155~295/180~325HP**. 레이더/광학 지상 추적+무선 지령유도, [9M311](missiles/9M311_SAM.md) 직격/조건부 근접신관 분기 재활용(롤란드는 레이더 근접신관, 세부 자체 미정), CE·폭발거리 감쇄 및 중복 합산 금지. [Roland 2 마르더 차체](../vehicles/1989/air_defense/ROLAND_2_MARDER.md) **525HP·7구역 35/25/20/10/5/5/5 KE(CE)·즉응2+예비8=10발**. 기본 명중률·추적 능력·신관 확률/작동거리·1989 Roland 3 공급 여부 미정. 코드 미구현.
- **최초 본격 1989 방공미사일 설계:** [초기형 **9M311 SAM**](missiles/9M311_SAM.md) — **30 CE 거리 무관, 직격 415HP, 근접신관 성공 시 185~285HP 기본 폭발 피해**, 대상 CE 방호·폭발 거리 감쇄, 조건부 근접신관 발동 확률(수치 미정), **SACLOS/무선 지령 유도**, 초기 2S6 **4발**. [차량 정본](../vehicles/1989/air_defense/2S6_TUNGUSKA.md).

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
