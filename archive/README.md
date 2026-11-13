# TACTICAL — archive 데이터 목차

> 업데이트: 2026-11-14 | 전차·탄약 기준 데이터 및 후속 게임 설계 관리

전차 방호력과 탄약 편성은 **별도 최신 기준 문서**에서 관리한다. 기존 통합 문서의 중복·구형 데이터는 폐기하고, 이전 내역은 Git 기록에서만 확인한다. 최신 수치가 필요한 경우 반드시 아래 두 README를 참조한다.

| 데이터 범위 | 최신 정리 문서 | 내용 |
|---|---|---|
| **1989-06-20 제3차 세계대전 세계관·4개 집단 보유량·부대 편제 원안 (2026-11-13)** | [world/WW3_1989_JUNE20_FORCE_INVENTORY_OOB_DRAFT_2026-11-13.md](world/WW3_1989_JUNE20_FORCE_INVENTORY_OOB_DRAFT_2026-11-13.md) | **초기 전차 14,440대 + 기타 장갑차 22,190대 = 36,630대**, 서독·주유럽미군·GSFG·NVA 세부 보유량. 항공·포병 추정, 방공 후보, 11th/2nd ACR·미군 사단, **소련 T-72 본토 후속 증원**을 구분해 기록. **다른 채팅 세계관 원안 백업 / 게임 공식 채택·구현 전** |
| **AH-64A Apache 초기형 장갑·무장·피해 (2026-11-14)** | [air/AH64A_APACHE_WEAPONS_AND_DAMAGE_2026-11-14.md](air/AH64A_APACHE_WEAPONS_AND_DAMAGE_2026-11-14.md) | **기체 300 HP / 20(20) 단일 장갑**. M230 M789 HEDP **50 CE·150 HP**, AGM-114A **1,100 CE·884 HP**, 관통 여유 10% 이상 시 **치명 110%, 구역별 5/10/15/15%**, Hydra M247 **290 CE·288 HP**. 탄약고 유폭 즉사는 모든 탄종 공용의 별도 검토 시스템. 코드 미구현 |
| **항공 투입·외부 간략 작전지도·레이더 LOS·IFV 대공사거리 (2026-11-14)** | [air/AIR_ENTRY_AIR_DEFENSE_IFV_AA_RULES_2026-11-14.md](air/AIR_ENTRY_AIR_DEFENSE_IFV_AA_RULES_2026-11-14.md) | **사용자 확정 대공 경사거리 Rh 202 1,500m / M242 2,000m / 2A42 2,500m**. 항공·지상 투입 지점·방향·ETA, 고도 선택, 간략 외부 작전지도 안에 정밀 전술지도, 맵 안 중·장거리 SAM, 레이더 탐색 캐시/추적·유도 분리. 세부 구현·성능은 미정 |
| **현재 상태·다음 단계 (진행 관리)** | [NEXT_STEPS_2026-11-07.md](NEXT_STEPS_2026-11-07.md) | **WIP19 최종 5bf1bb5 독립 재검증 후 main 통합**. 3종 탄약·구획/장전·즉응탄 보충과 우측 패널, 예약탄/잔해·보충 순서·모바일 버튼 보완 완료. 실제 8×8 지도·화재·유폭·승무원 치료/교체는 후속 (최종 갱신 2026-11-14) |
| **모듈 일시 성능 저하·승무원 부상·탄약고 예외 (2026-11-12)** | [combat/TEMPORARY_MODULE_CREW_AMMO_DESIGN_UPDATE_2026-11-12.md](combat/TEMPORARY_MODULE_CREW_AMMO_DESIGN_UPDATE_2026-11-12.md) | **모듈 영구 손상·파괴 제외 [확정]**. 승무원 경상/중상은 WIP18에서 M1A2_1998 전용으로 구현·main 통합. 탄약고 즉시 격파는 **검토 중**. 기존 모듈 HP·영구 수리 구상보다 새로운 방향 우선 |
| **기관포 관통 피해 정책·M791/M919 시험값 (2026-11-13)** | [combat/AUTOCANNON_PENETRATION_DAMAGE_POLICY_2026-11-13.md](combat/AUTOCANNON_PENETRATION_DAMAGE_POLICY_2026-11-13.md) | **기관포 치명타 없음·과관통 피해 대폭 감쇄 [확정]**. M791 87HP·M919 78HP/모듈 일시 상태이상 확률 소폭 상향은 잠정 설계. 관통·속도값 별도 기록, 피해 배율 곡선·상태이상 확률 수치 미정, 미구현 |
| **주독미육군 IFV·CFV 라인업 (2026-11-12)** | [vehicles/USAREUR_IFV_CFV_ROSTER_PLAN_2026-11-12.md](vehicles/USAREUR_IFV_CFV_ROSTER_PLAN_2026-11-12.md) | IFV/CFV **별도 분류**. **M2·M2A1 550 HP, M2A2 650 HP**. M2A2 일시 기능이상·화재 위험 추가 저감 방향(정량 미정), 기본 장갑 7구역 초안 및 초기 ERA **+5(+335)**(장착 여부 미정). **M792 HEI-T 133 HP로 최신 갱신(기존 155)**. CFV 상세·실제 구현 미완료 |
| **기본 APC 4종·기관총 기본탄 (2026-11-14)** | [vehicles/APC_M113_BTR_AND_MACHINEGUN_DESIGN_NOTES_2026-11-14.md](vehicles/APC_M113_BTR_AND_MACHINEGUN_DESIGN_NOTES_2026-11-14.md) | **M113A2/A3 400/450HP, BTR-70/80 350/400HP·7구역 장갑**, 7.62/12.7/14.5mm 단일 기본탄 거리별 관통·피해 **7/15/23HP** 확정. 기관총 명중·사거리·승하차·기관총 사수는 후속 미정. 추가 APC·정찰 문서와 연결 |
| **추가 APC 5계열·기존 M113G 재활용 (2026-11-14)** | [vehicles/APC_ADDITIONAL_BTR60_M113G_FUCHS_BTR50_MTLB_2026-11-14.md](vehicles/APC_ADDITIONAL_BTR60_M113G_FUCHS_BTR50_MTLB_2026-11-14.md) | **BTR-60PB, TPz 1 Fuchs, BTR-50PK, MT-LB 장갑·HP 게임값 채택**, BTR-60PB HP 325는 기존 추천 유지·미세조정 가능. **서독 M113G 계열 HP 400은 아직 후보**, 개량형별 확정 미완료. 코드 미구현 |
| **정찰장갑차 BRDM-2·Luchs·BRM-1K·M3/M3A1 (2026-11-14)** | [vehicles/RECON_BRDM2_LUCHS_M3_BRM1K_2026-11-14.md](vehicles/RECON_BRDM2_LUCHS_M3_BRM1K_2026-11-14.md) | **BRDM-2 300HP, Luchs 425HP, BRM-1K 500HP 및 7구역 장갑 채택**, M3/M3A1은 기존 M2/M2A1 장갑·무장·HP 재활용. 정찰·관측 성능 수치와 실제 부대 배속은 추후 미정 |
| **서독 Marder 1A2·1A3 제원 (2026-11-13)** | [vehicles/BUNDESWEHR_MARDER_1A2_1A3_SPEC_2026-11-13.md](vehicles/BUNDESWEHR_MARDER_1A2_1A3_SPEC_2026-11-13.md) | **1A2 550 HP·1A3 600 HP, 장갑 7구역 확정**. Rh 202 20mm DM43·DM43A1·DM63 및 DM51A2·DM81A1 탄약, 표적별 **1,450/2,500m** 교전거리, **MILAN 1/2** 관통력·피해·기본 지급형, 상대 명중률. **아카이브 설계만 기록·코드 미구현** |
| **소련 BMP-1·BMP-1P·BMP-2 제원 (2026-11-13)** | [vehicles/SOVIET_BMP_1_1P_2_SPEC_2026-11-13.md](vehicles/SOVIET_BMP_1_1P_2_SPEC_2026-11-13.md) | **3형 모두 500 HP, 7구역 장갑 확정**. 2A28 73mm·2A42 30mm 탄약의 관통력·기본 피해, 말륫카/파곳/콩쿠르스 ATGM, 2A42 표적별 **2,000/4,000m** 교전거리·연사 명중률 저하 방향. **3UOF8 HEI 155 HP / 3UOR6 HE-T 133 HP로 최신 갱신**. **아카이브 설계만 기록, 코드 미구현** |
| **보병 설계 논의 백업** | [infantry/INFANTRY_DESIGN_NOTES_2026-11-08.md](infantry/INFANTRY_DESIGN_NOTES_2026-11-08.md) | 병사별 누적 부상·개별 파편 피격, AI/플레이어 역할, 보병 대전차탄 후보값, 재보급·프리셋 변경. **방향·예시·제안·미정 구분 / 코드 미구현** |
| **작업 지시서 백업** | [instructions/](instructions/) | 완료한 WIP09~WIP19 원본 지시서·기준표. 구현 설명·검증 결과·병합 검토는 각 버전 문서에서 관리 |
| **M1 계열 상면도 뷰어** | [art/M1_Abrams_TopView.html](art/M1_Abrams_TopView.html) | M1A2/M1A1/M1A1 HA 단독 뷰어·삽입용 HTML, 원본 JS, 포탑 링 실측 확인 이미지 |
| **전차 방호력·차량 HP (본편 32종 + 확장 2종)** | [tanks/README.md](tanks/README.md) | 7구역 KE(CE), ERA/BDD/D-Tech, **§9 차량 최대 HP 34종**, 계열·연식별 구분. **HP 확정 데이터 / 피해량·모듈 HP 미정** |
| **관통·피해·모듈 HP 설계** | [combat/PENETRATION_DAMAGE_AND_VEHICLE_HP_CONCEPT_2026-11-07.md](combat/PENETRATION_DAMAGE_AND_VEHICLE_HP_CONCEPT_2026-11-07.md) | M829A1 기준 피해 380 및 게임 피해 곡선. **M829A2는 A1형 배율 공유·100% 기준 405, WIP15에서 근접 비관통 시험 피해 적용**. M830은 시험 후보, 추가 탄속·영구 모듈 피해 미정 |
| **잔해 유지·식별·선택 규칙** | [combat/WRECK_VISIBILITY_AND_SELECTION_RULES_2026-11-08.md](combat/WRECK_VISIBILITY_AND_SELECTION_RULES_2026-11-08.md) | **잔해 영구 유지·선택 불가.** 미관측 격파도 이후 한 번 식별하면 계속 표시. 미확인 격파의 명령 반응 노출 방지. **WIP11B 구현 / WIP11D와 함께 main 통합** |
| **고각 관통·탄종별 도탄·HEAT 신관 설계** | [combat/ANGLE_PENETRATION_RICOCHET_AND_HEAT_FUZE_RULES_2026-11-08.md](combat/ANGLE_PENETRATION_RICOCHET_AND_HEAT_FUZE_RULES_2026-11-08.md) | **선택된 면의 입사각과 게임용 고각·도탄·HEAT 신관 설계**. WIP12에서 현재 M829A2 시험탄의 고각 보간·도탄을 main에 구현. 다른 탄종 전체 적용·HEAT 신관은 후속 |
| **전투 판정 2단계·360° 확률 구역 설계 (WIP10~WIP12 일부 구현)** | [combat/TWO_STAGE_HIT_AND_360_ARMOR_RESOLUTION_DESIGN_2026-11-07.md](combat/TWO_STAGE_HIT_AND_360_ARMOR_RESOLUTION_DESIGN_2026-11-07.md) | 발사·착탄 2단계·박스 투영 구역은 WIP10, M829A2 기본 관통·HP 피해는 WIP11A, 현재 시험탄 고각·도탄은 WIP12 구현. HEAT 신관과 다른 탄종 확장은 후속 |
| **장갑 세부 구획 검토 메모 (미확정)** | [tanks/ARMOR_SUBZONES_AND_PROBABILITY_IDEAS_2026-11-07.md](tanks/ARMOR_SUBZONES_AND_PROBABILITY_IDEAS_2026-11-07.md) | 7구역 내부 상/하부·포방패·좌우 뺨·측면 전후·지붕 분할 후보, LOS·이동 상태·사통/관측 확률 아이디어. **현재 미확정·미구현** |
| **탄약 및 적재 프리셋** | [ammo/README.md](ammo/README.md) | 탄종별 게임 관통력, 전차별 기본탄, **32종×3=96개** 적재 프리셋, 구획·장전·보급 설계 |
| **0~10m KE 3각도·5mm 기준표 (29종)** | [ammo/NEAR_ZERO_10M_KE_PENETRATION_2026-11-08.md](ammo/NEAR_ZERO_10M_KE_PENETRATION_2026-11-08.md) | 29종 0°/30°/60°의 5mm 근거리 게임값. 3BM32 505/425/275 버프, 3BM42 450/380/250 너프. 나머지 2km 값 유지 |
| **대형 단일 전장·포병 실체·최적화·보병 분대 AI** | [performance/LARGE_MAP_PATHFINDING_LOS_AND_SQUAD_AI_2026-11-08.md](performance/LARGE_MAP_PATHFINDING_LOS_AND_SQUAD_AI_2026-11-08.md) | **전역지도는 임시 보관**, 4×4 유지·8×8/9×12 확장 후보, 포병 실제 유닛, 경로탐색·LOS 현행/제안 구분, **분대 공통 관측·판단 / 병사별 피격·부상**. WIP17 가변 크기 기반 main 통합. 실지도·장기 최적화·분대 AI는 후속 |
| **폐기된 통합 문서 안내** | [TACTICAL_1989_NATO_ARMOR_AMMO_DESIGN_ARCHIVE_2026-11-06.md](TACTICAL_1989_NATO_ARMOR_AMMO_DESIGN_ARCHIVE_2026-11-06.md) | 구형 통합 데이터는 최신 기준에서 제외. 과거 내용은 Git 파일 이력에서 확인 |

## 데이터 유지 원칙

- **전차 변경:** 우선 `tanks/README.md` 갱신. 탄약 적재나 수량까지 바뀌면 `ammo/README.md`도 갱신.
- **탄약 변경:** 우선 `ammo/README.md` 갱신. 탄약 종류와 전차 모델별 호환 규칙을 혼동하지 않도록 유지.
- **구역 체계:** 차체 전/측/후, 포탑 전/측/후, 통합 상부 = **7구역**. 하부는 아직 미도입.
- **특수 추가장갑:** Kontakt는 사용 후 피복률 소모. BDD와 D-Tech는 **피복률과 내구도를 독립 관리**. 상세 내구도 수치는 미정.
- **구형 통합 데이터:** 현행 문서에서 폐기. 이전 값·미결정 문구를 현재 설정처럼 재사용하지 않으며, 필요하면 Git 이력에서 확인.

새로 확정되는 자료가 늘어나면 국가별·기종별 세부 파일로 추가 분리할 수 있다.
