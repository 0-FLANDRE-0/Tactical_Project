# TACTICAL — archive 데이터 목차

> 업데이트: 2026-11-08 | 전차·탄약 기준 데이터 및 후속 게임 설계 관리

전차 방호력과 탄약 편성은 **별도 최신 기준 문서**에서 관리한다. 기존 통합 문서의 중복·구형 데이터는 폐기하고, 이전 내역은 Git 기록에서만 확인한다. 최신 수치가 필요한 경우 반드시 아래 두 README를 참조한다.

| 데이터 범위 | 최신 정리 문서 | 내용 |
|---|---|---|
| **현재 상태·다음 단계 (진행 관리)** | [NEXT_STEPS_2026-11-07.md](NEXT_STEPS_2026-11-07.md) | WIP 진행 현황(WIP11D 지형 판독성 구현·검증), 다음 작업 순서, 결정 대기 항목, 정보 공개 방향, 아카이브 정리 목록. **새 전투 수치 확정 없음** (최종 갱신 2026-11-08) |
| **보병 설계 논의 백업** | [infantry/INFANTRY_DESIGN_NOTES_2026-11-08.md](infantry/INFANTRY_DESIGN_NOTES_2026-11-08.md) | 병사별 누적 부상·개별 파편 피격, AI/플레이어 역할, 보병 대전차탄 후보값, 재보급·프리셋 변경. **방향·예시·제안·미정 구분 / 코드 미구현** |
| **작업 지시서 백업** | [instructions/](instructions/) | WIP09·WIP10 지시서·기준표와 WIP11A~WIP11D 지시서 사본 목차 |
| **M1 계열 상면도 뷰어** | [art/M1_Abrams_TopView.html](art/M1_Abrams_TopView.html) | M1A2/M1A1/M1A1 HA 단독 뷰어·삽입용 HTML, 원본 JS, 포탑 링 실측 확인 이미지 |
| **전차 방호력·차량 HP (본편 32종 + 확장 2종)** | [tanks/README.md](tanks/README.md) | 7구역 KE(CE), ERA/BDD/D-Tech, **§9 차량 최대 HP 34종**, 계열·연식별 구분. **HP 확정 데이터 / 피해량·모듈 HP 미정** |
| **관통·피해·모듈 HP 설계** | [combat/PENETRATION_DAMAGE_AND_VEHICLE_HP_CONCEPT_2026-11-07.md](combat/PENETRATION_DAMAGE_AND_VEHICLE_HP_CONCEPT_2026-11-07.md) | M829A1 기준 피해 380 및 게임 피해 곡선. **M829A2는 A1형 배율 공유·100% 기준 405, WIP11 단일 시험탄**. M830은 시험 후보, 탄속·모듈 피해 미정 |
| **잔해 유지·식별·선택 규칙** | [combat/WRECK_VISIBILITY_AND_SELECTION_RULES_2026-11-08.md](combat/WRECK_VISIBILITY_AND_SELECTION_RULES_2026-11-08.md) | **잔해 영구 유지·선택 불가.** 미관측 격파도 이후 한 번 식별하면 계속 표시. 미확인 격파의 명령 반응 노출 방지. **WIP11B 구현 / WIP11D와 함께 main 통합** |
| **고각 관통·탄종별 도탄·HEAT 신관 설계** | [combat/ANGLE_PENETRATION_RICOCHET_AND_HEAT_FUZE_RULES_2026-11-08.md](combat/ANGLE_PENETRATION_RICOCHET_AND_HEAT_FUZE_RULES_2026-11-08.md) | **선택된 면의 입사각, 0/30/60/90° 탄약별 선형 관통력, 도탄 0/50/100% 선형 확률, M456A1 고각 신관 실패 차별화**. 새 고각·도탄·신관 규칙은 런타임 미구현 |
| **전투 판정 2단계·360° 확률 구역 설계 (WIP10/WIP11 일부 구현)** | [combat/TWO_STAGE_HIT_AND_360_ARMOR_RESOLUTION_DESIGN_2026-11-07.md](combat/TWO_STAGE_HIT_AND_360_ARMOR_RESOLUTION_DESIGN_2026-11-07.md) | 발사·착탄 2단계·박스 투영 구역은 WIP10, M829A2 기본 관통·HP 피해는 WIP11A 구현. 새 고각·도탄·신관은 미구현 |
| **장갑 세부 구획 검토 메모 (미확정)** | [tanks/ARMOR_SUBZONES_AND_PROBABILITY_IDEAS_2026-11-07.md](tanks/ARMOR_SUBZONES_AND_PROBABILITY_IDEAS_2026-11-07.md) | 7구역 내부 상/하부·포방패·좌우 뺨·측면 전후·지붕 분할 후보, LOS·이동 상태·사통/관측 확률 아이디어. **현재 미확정·미구현** |
| **탄약 및 적재 프리셋** | [ammo/README.md](ammo/README.md) | 탄종별 게임 관통력, 전차별 기본탄, **32종×3=96개** 적재 프리셋, 구획·장전·보급 설계 |
| **0~10m KE 3각도·5mm 기준표 (29종)** | [ammo/NEAR_ZERO_10M_KE_PENETRATION_2026-11-08.md](ammo/NEAR_ZERO_10M_KE_PENETRATION_2026-11-08.md) | 29종 0°/30°/60°의 5mm 근거리 게임값. 3BM32 505/425/275 버프, 3BM42 450/380/250 너프. 나머지 2km 값 유지 |
| **대형 단일 전장·포병 실체·최적화·보병 분대 AI** | [performance/LARGE_MAP_PATHFINDING_LOS_AND_SQUAD_AI_2026-11-08.md](performance/LARGE_MAP_PATHFINDING_LOS_AND_SQUAD_AI_2026-11-08.md) | **전역지도는 임시 보관**, 4×4 유지·8×8/9×12 확장 후보, 포병 실제 유닛, 경로탐색·LOS 현행/제안 구분, **분대 공통 관측·판단 / 병사별 피격·부상**. 성능 검증·코드 구현 전 |
| **폐기된 통합 문서 안내** | [TACTICAL_1989_NATO_ARMOR_AMMO_DESIGN_ARCHIVE_2026-11-06.md](TACTICAL_1989_NATO_ARMOR_AMMO_DESIGN_ARCHIVE_2026-11-06.md) | 구형 통합 데이터는 최신 기준에서 제외. 과거 내용은 Git 파일 이력에서 확인 |

## 데이터 유지 원칙

- **전차 변경:** 우선 `tanks/README.md` 갱신. 탄약 적재나 수량까지 바뀌면 `ammo/README.md`도 갱신.
- **탄약 변경:** 우선 `ammo/README.md` 갱신. 탄약 종류와 전차 모델별 호환 규칙을 혼동하지 않도록 유지.
- **구역 체계:** 차체 전/측/후, 포탑 전/측/후, 통합 상부 = **7구역**. 하부는 아직 미도입.
- **특수 추가장갑:** Kontakt는 사용 후 피복률 소모. BDD와 D-Tech는 **피복률과 내구도를 독립 관리**. 상세 내구도 수치는 미정.
- **구형 통합 데이터:** 현행 문서에서 폐기. 이전 값·미결정 문구를 현재 설정처럼 재사용하지 않으며, 필요하면 Git 이력에서 확인.

새로 확정되는 자료가 늘어나면 국가별·기종별 세부 파일로 추가 분리할 수 있다.
