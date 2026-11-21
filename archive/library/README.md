# TACTICAL — 정식 장비·탄약·전투 시스템 라이브러리

> **개편 완료: 2026-11-19 · 5/5단계.** 이곳이 **게임 설계 제원·규칙의 현행 정식 탐색/수정 진입점**이다. 과거 단계 문서의 ‘정본 전환 전/이관본’은 **발행 당시 진행 상태**를 뜻한다. 상세한 충돌·미정/잠정/코드 상태는 [정본 우선순위](CANONICAL_RULES.md)를 따른다.

## 데이터 카탈로그

| 영역 | 바로가기 | 주요 내용 |
|---|---|---|
| **차량** | [vehicles/](vehicles/README.md) | 1989 전차 32종, 후속 M1A2 2종, 현대 M1A2C·2A8·T-90M(2026)·T-14M, IFV/APC/정찰·헬기 |
| **탄약·미사일** | [ammunition/](ammunition/README.md) | 1989 미·독·소·동독 탄약, 현대 날탄, TOW/MILAN/Hellfire 등 |
| **전투·방호 시스템** | [systems/](systems/README.md) | ERA·Anti-ERA·TUSK I/II ARAT·모듈러 증가장갑·Trophy, 관통/피해곡선/도탄/장전 |
| **96개 적재 프리셋** | [presets/](presets/README.md) | 1989 32종×3개, 원본 공유 템플릿 54행 검산본 |
| **보병·개별 유닛** | [units/](units/README.md) | 보병/분대 설계·검토값 |
| **세계관** | [world/](world/README.md) | 1989년 6월 20일 대체역사 개전·전력 편제 원안 |
| **역사 자료실** | [history/](history/README.md) | WIP 지시서·구형 제원·폐기 아이디어·초기 시제품 |
| **보조 색인** | [indexes/ 공격헬기](indexes/AIRCRAFT_1989.md) | 헬기 현황·비교 자료 |
| **1989 자주대공포** | [게파르트 차량](vehicles/1989/air_defense/GEPARD.md) · [M163 VADS](vehicles/1989/air_defense/M163_VADS.md) | 35mm KDA 탄약·[실제 혼합 탄띠](presets/1989/GEPARD_BELTS.md), M168 AP-I, 공중 표적 규칙 |
| **2026-11-21 공중 레이더 최신 정본** | [수색·탐지·추적 공통 규칙](systems/air/RADAR_SEARCH_TRACKING.md) · [게파르트](vehicles/1989/air_defense/GEPARD.md) | 수색 존재 인지 vs 추적/광학 정밀 정보, 항공유닛 피탐지 기반값+관측자/LOS 보정, **게파르트 15km 수색**, 거리별 탐지율 감소; 코드 미구현 |
| **2026-11-21 최신 공통 피해** | [공중 비관통 최소 25%](systems/combat/AIR_TARGET_DAMAGE.md) | **모든 공중장비·전 탄종 비관통 직격 / AP 과관통 최소 25%**; HEP 고유 스폴과 별개 |
| **2026-11-21 IFV HE·공중 입사각 최신 확정** | [IFV 공통 고폭곡선](systems/combat/IFV_HE_DAMAGE_CURVES.md) · [공중 입사각 생략](systems/combat/ANGLE_RICOCHET_FUZE.md) | 35mm DM21의 지상/공중 감쇄 형태 공유, 모든 공중장비는 0° KE/CE 판정; 본편 코드 미구현 |

## 반드시 구분할 사항

- **게임용 KE·CE 관통력, 탄약별 기본 차량 피해 HP, 실제 차량 최대 HP, 추가장갑 독립 HP**는 각각 다른 수치.
- **ERA 피복률 %p 소모**와 **Anti-ERA 방호 효과 감쇄**, **비폭발성 증가장갑 내구도**, **Trophy HV 요격탄·대기시간**은 별도 계층.
- **1989 본편 / 1990년 이후 / 현대 장비** 시대 분리, 실제 게임 코드와 사용자 설계 확정/잠정 분리.
- **미정은 절대로 임의 숫자로 채우지 않는다.** [정식 정본 소유권·우선순위](CANONICAL_RULES.md) 참고.

## 이관 검증·기록

| 단계 | 수행 내용 | 상태 |
|---|---|---|
| 1 | [정리 전 원본 63개 파일 백업·해시 인벤토리](migration/STAGE1_BASELINE_AND_INVENTORY_2026-11-19.md) | **완료** |
| 2 | [기존 Markdown 46개 역할·정본 책임·충돌 감사](migration/STAGE2_CANONICAL_SOURCE_AUDIT_2026-11-19.md) | **완료** |
| 3 | [차량·탄약·미사일·프리셋 36개 파일 이관](migration/STAGE3_MIGRATION_VERIFICATION_2026-11-19.md) | **완료** |
| 4 | [방호·전투 시스템, 세계관·이력 28개 파일 분리](migration/STAGE4_SYSTEM_HISTORY_AUDIT_2026-11-19.md) | **완료** |
| 5 | [최종 원본 대조·링크 복구·정본 전환·레거시 안내](migration/STAGE5_FINAL_VALIDATION_2026-11-19.md) | **완료** |

**원본 보존:** [변경 전 백업 브랜치](https://github.com/0-FLANDRE-0/Tactical_Project/tree/archive-library-baseline-2026-11-19) · [원본 SHA 목록](migration/BASELINE_FILE_MANIFEST_2026-11-19.json) · [5단계 최종 이관 목록](migration/STAGE5_FINAL_LIBRARY_MANIFEST_2026-11-19.json).

> **기존 원본문서와 시제품은 삭제하지 않았다.** 현재 사용자는 이 새 카탈로그를 사용하면 되고, 원본의 과거 수치/당시 구현 메모는 비교·증빙에만 이용한다. **게임 코드 및 원래 1989년 프리셋은 이번 정리로 변경되지 않았다.**
