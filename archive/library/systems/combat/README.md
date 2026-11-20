# 전투 시스템 세부 목차

| 시스템 | 문서 | 검토 기준 |
|---|---|---|
| APFSDS 과관통 | [구경별 공통 곡선](APFSDS_DAMAGE_CURVES.md) | 사용자 확정 게임 설계; 코드 전 탄종 적용 별도 |
| 경사관통·도탄·신관 | [각도 및 신관](ANGLE_RICOCHET_FUZE.md) | WIP 부분 구현과 미정 구분 |
| 발사·착탄 2단계 | [명중·구역 모델](TWO_STAGE_HIT.md) | 과거 설계와 후속 구현 구분 |
| 기관포 피해 | [기관포 원칙](AUTOCANNON_DAMAGE.md) | 치명타 없음·철갑탄 과관통 곡선 미정, 폭발성 SAPHEI 정상 기폭에 일반 과관통 감쇄 비적용 |
| **공중 유닛 직격 25% 하한** | [전 탄종 비관통·AP 과관통](AIR_TARGET_DAMAGE.md) | 2026-11-21 최종: **모든 공중장비·모든 탄종 비관통 직격**, **AP계열 과관통**도 기본 피해 최소 25%; 지상 제외, 코드 미구현 |
| HEP/HE-FRAG/APERS | [특수탄 피해](HEP_HEFRAG_APERS.md) | HEP CE≤30 파공 556, 비파공 420→100, 스폴 438 확정; 스폴 확률 미정 |
| 모듈·승무원·탄약고 | [상태·사고](MODULE_CREW_AMMO_INCIDENTS.md) | 영구 모듈 파괴 미도입, 시험 전용 구분 |
| 잔해 | [가시성·선택](WRECK_VISIBILITY.md) | 사용자 확정·WIP 당시 범위 |

- [초기 명중·입사각 후속 검토의 역사 기록](ARMOR_HIT_FUTURE_NOTES.md) — 현행 확정 규칙보다 우선하지 않음

[전체 시스템 색인](../README.md). **2026-11-19 최종 정본 우선순위는 [라이브러리 규칙](../../CANONICAL_RULES.md)을 따른다.**

**게파르트 35mm 탄약의 DM21 지상·공중 별도 고폭곡선 및 DM13A1 신관/DM23 KE 곡선:** [35mm 탄약 정본](../../ammunition/autocannon/GEPARD_35MM.md). HEP/HESH 스폴 피해 규칙을 자동 상속하지 않음.
