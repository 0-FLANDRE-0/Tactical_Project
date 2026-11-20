# TACTICAL 차량 제원 라이브러리 — 정식 카탈로그

> **2026-11-19 5단계 정본 전환 완료.** 사용자 확정·잠정·미정 구분을 보존한 **현행 차량 스펙 진입점**. 과거 원본과 런타임 코드는 수정 없이 보존하며, [정본 책임 규칙](../CANONICAL_RULES.md)을 적용한다.

## 1989년 본편 전차

- [**32종 전차 검색 색인과 HP 표**](tanks/1989/README.md) — 미국 5·서독 6·소련 14·NVA 7
- [1989 전차 통합 상부장갑·ERA 상부 피복률](tanks/1989/UPPER_ARMOR.md)
- 국가별 상세: [미국](tanks/1989/US.md) · [서독](tanks/1989/WEST_GERMANY.md) · [소련](tanks/1989/SOVIET.md) · [동독 NVA](tanks/1989/NVA.md)
- [1989 본편 96개 탄약 적재 프리셋](../presets/1989/README.md)

## 후속 시대 / 현대 전차

- [M1A2 (1992·1998) 2종](tanks/post-1989/M1A2_1992_1998.md) — 1989년 본편에 포함하지 않음
- [M1A2C (SEP v3)](tanks/modern/M1A2C.md) — 7구역 고정장갑, TUSK I/II 교체형 ARAT, 최대 HP 미정
- [Leopard 2A8](tanks/modern/LEOPARD_2A8.md) — 1,450 HP, 모듈러 증가장갑, Trophy HV 좌·우 독립
- [T-90M (2026)](tanks/modern/T-90M_2026.md) — **1,450 HP**, 기본장갑 7구역, Relikt 전면/상부 +240(+560), **차체·포탑 측면 2겹 +220(+1020)**, 부위별 피복률·AP/HEAT/HE 소모율 확정, **측면 Anti-ERA 최외곽만 적용**, [Arena-M APS](../systems/aps/ARENA_M_T90M.md) **4방향×3발·140ms·0.25초·45~1,000m/s**, 교차 방어 가능(구획별 상세각·성공률 미정)
- [T-14M 아르마타](tanks/modern/T-14M.md) — **1,500 HP**, 기본장갑 7구역·증가장갑 4구역 KE/CE·피복률·독립 HP(**1,150/700/250/550**)·탄종별 감쇄·**잔존 38.5%**, **Malakhit ERA** 일반형 +275(+630)·차체 측면 이중층 **+260(+1210)**·피복률 및 **바깥층만 Anti-ERA 적용** 확정. **증가장갑 → ERA 판정**, [명중 계층별 소모 규칙](../systems/armor/T14M_MALAKHIT_ERA.md). [Afghanit APS](../systems/aps/AFGHANIT_T14M.md) 전방 ±60°·좌우 5발·90ms·0.2초 차탄 대기·50~1,700m/s·KE 관통력 최대 38% 감쇄 및 **무인포탑 차량 HP 피해 50% 감쇄**

## 1989 장갑차·정찰

| 종류 | 개별 이관 문서 |
|---|---|
| 미국 IFV/CFV | [M2·M2A1·M2A2 Bradley](1989/ifv/BRADLEY.md) · [TOW 미사일 정본 후보](../ammunition/missiles/TOW_FAMILY.md) |
| 서독 IFV | [Marder 1A2/1A3](1989/ifv/MARDER_1A2_1A3.md) · [MILAN](../ammunition/missiles/MILAN_1_2.md) |
| 소련 IFV | [BMP-1·1P·2](1989/ifv/BMP_1_1P_2.md) · [BMP 탑재 ATGM](../ammunition/missiles/BMP_ATGM.md) |
| APC 기본형 | [M113A2/A3·BTR-70/80](1989/apc/APC_BASE_AND_MACHINEGUNS.md) |
| APC 추가형 | [BTR-60PB·M113G·Fuchs·BTR-50PK·MT-LB](1989/apc/APC_ADDITIONAL.md) |
| 정찰차량 | [BRDM-2·Luchs·BRM-1K·M3/M3A1 Bradley](1989/recon/RECON_VEHICLES.md) |

## 1989 자주대공포

- [**미국 M163 VADS — M113A2 차체·20mm M168 단일 AP-I·AI 가변 점사·대공 사거리 1.2/1.5km**](1989/air_defense/M163_VADS.md) — 2026-11-20 확정 설계값, 레이더 세부 수치·포탑 방호는 후속

## 1989 공격헬기

- [AH-64A Apache](1989/air/AH64A.md) · [AGM-114A Hellfire](../ammunition/missiles/AGM_114A_HELLFIRE.md)
- [Mi-24D·V·P Hind](1989/air/MI24_D_V_P.md) · [Mi-24 탑재 대전차유도미사일](../ammunition/missiles/MI24_ATGM.md)

**공통 전투 시스템 정본**은 [시스템 카탈로그](../systems/README.md), **구형 자료**는 [이력 자료실](../history/README.md)에서 구분한다. 게임 코드 구현 사실은 별도 확인.
