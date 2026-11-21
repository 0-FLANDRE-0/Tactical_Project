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
| **1989 자주대공포** | [게파르트](vehicles/1989/air_defense/GEPARD.md) · [M163](vehicles/1989/air_defense/M163_VADS.md) · [쉴카](vehicles/1989/air_defense/ZSU23_4_SHILKA.md) | 게파르트 기존 고유 탄띠 유지; **M163/쉴카 3 HE:1 AP 단일 고정 탄띠**, [20/23mm 탄약 정본](ammunition/autocannon/M163_SHILKA_AA_20_23MM.md), [고정 탄띠](presets/1989/AA_FIXED_BELTS_M163_SHILKA.md) |
| **2026-11-21 스트렐라-10M2 차량·미사일 기본 명중률** | [9K35M2 차량 정본](vehicles/1989/air_defense/STRELA_10M2.md) · [9M37/9M37M 미사일 정본](ammunition/missiles/9M37_9M37M_STRELA10.md) | **차량 7구역 15/10/5/5/5/5/5 RHAe·325HP**, 즉응 **4발+예비 4발=8발**; 무기동·약한 기동 시 **9M37 명중률 75~100%, 9M37M 85~100%**. 급기동 시 추가 감쇄(수치 미정). **9M37/9M37M 25 CE·직격 375HP·근접 기본 140~245HP** 채택; [9M311 조건부 신관](ammunition/missiles/9M311_SAM.md)과 같은 판정 구조, 신관 반경·발동률·감쇄곡선은 개별 미정, 코드 미구현 |
| **2026-11-21 스트렐라-10 시커 광학/IR 모드·저고도 추적** | [9M37/9M37M](ammunition/missiles/9M37_9M37M_STRELA10.md) · [플레어·IRCCM 공통](systems/air/COUNTERMEASURES_FLARE_IRCCM_ECCM.md) | 발사 전 자동 선택·발사 후 모드 고정, 야간 IR. **플레어 저항성** 광학: 9M37 **74~88%·ON**, 9M37M **80~95%·ON**; IR: 9M37 **15~35%·OFF**, 9M37M **30~60%·ON**. ON/OFF는 **Lipa 면역용 IRCCM**. 광학 모드 저고도 하강 시 **8~16% 명중률 및 추적 실패 가능**, 세부 판정 미정. 코드 미구현 |
| **2026-11-21 항공 플레어·Lipa·IRCCM/ECCM 설계** | [플레어 발당 독립 판정 및 명칭 분리](systems/air/COUNTERMEASURES_FLARE_IRCCM_ECCM.md) · [Mi-24 기만체/Lipa](systems/air/MI24_FLARE_LIPA.md) | **플레어 저항성(%)=발당 기만확률 곱셈 감쇄**, **IRCCM ON/OFF=Lipa 면역 여부**, ECCM 레이더 대응 미정. **Mi-24 D 소구경 128발, V/P 192발, 발당 18.5%**. **Lipa 90% 초기 시험 후보**, 상시/수평360° 방향, 적 IRCCM OFF일 때 미사일당 1회 기만. 기상 비행 중 변화 미구현·세부 각/쿨타임 미정. 코드 미구현 |
| **2026-11-21 공중 레이더 최신 정본** | [수색·탐지·추적 공통 규칙](systems/air/RADAR_SEARCH_TRACKING.md) · [게파르트](vehicles/1989/air_defense/GEPARD.md) | 수색 존재 인지 vs 추적/광학 정밀 정보, 항공유닛 피탐지 기반값+관측자/LOS 보정, **게파르트 15km 수색**, 거리별 탐지율 감소; 코드 미구현 |
| **2026-11-21 초기형 퉁구스카·9M311 SAM 정본** | [2S6 차량](vehicles/1989/air_defense/2S6_TUNGUSKA.md) · [30mm 2A38 탄약](ammunition/autocannon/TUNGUSKA_30MM_2A38.md) · [9M311 미사일](ammunition/missiles/9M311_SAM.md) | **30mm 5,000RPM·1,936발·3/4km, 3종 탄약 83/129/152HP**, 9M311 **4발·30 CE 고정·직격 415HP·근접신관 185~285HP**; [고정 탄띠](presets/1989/TUNGUSKA_2A38_BELT.md). **차량 7구역 KE(CE) 15/10/10/15/10/10/15 RHAe·425HP 확정**(알루미늄은 재질 설명만), 신관 확률/구체 피해곡선 미정, 코드 미구현 |
| **2026-11-21 모든 탄약 2km 이후 관통력 방향** | [공통 장거리 관통력 외삽 설계](systems/combat/RANGE_PENETRATION_EXTRAPOLATION.md) | **0~2km 탄별 감쇄 추세 연장·원거리 강화 감쇄**, 원래 각 탄종 표 보존; 거리무관 확정탄은 예외, 수식·계수는 미정 |
| **2026-11-21 대공포 발당 명중률·쉴카 정본** | [게파르트/M163 명중률 잠정안](systems/air/AA_GUN_HIT_PROBABILITY.md) · [ZSU-23-4](vehicles/1989/air_defense/ZSU23_4_SHILKA.md) | 게파르트 거리별 발당 명중률 시험범위, M163 명중률 수치는 미정. **쉴카 450HP/7구역/탄약 55·108HP 채택**, **쉴카 900RPM×4=3,600RPM, 유효 2.5km·최대 3km 확정**, M163보다 낮은 명중 안정성·신뢰성(정성 방향). **쉴카 500발×4=총 2,000발 전량 즉응탄(HE 1,500/API 500)**, 탐지/명중 수치·고장률·재보급 시간 미정, 코드 미반영 |
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
