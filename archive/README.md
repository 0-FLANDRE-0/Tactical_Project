# TACTICAL — archive 데이터 목차

> 업데이트: 2026-11-07 | 게임용 환산 방호력·관통력 및 전차 탄약 편성 관리

전차 방호력과 탄약 편성은 **별도 최신 기준 문서**에서 관리한다. 기존 통합 문서의 중복·구형 데이터는 폐기하고, 이전 내역은 Git 기록에서만 확인한다. 최신 수치가 필요한 경우 반드시 아래 두 README를 참조한다.

| 데이터 범위 | 최신 정리 문서 | 내용 |
|---|---|---|
| **현재 상태·다음 단계 (진행 관리)** | [NEXT_STEPS_2026-11-07.md](NEXT_STEPS_2026-11-07.md) | WIP 진행 현황, 다음 작업 순서, 결정 대기 항목, 아카이브 정리 목록. **새 수치 확정 없음** |
| **전차 방호력·차량 HP (본편 32종 + 확장 2종)** | [tanks/README.md](tanks/README.md) | 7구역 KE(CE), ERA/BDD/D-Tech, **§9 차량 최대 HP 34종**, 계열·연식별 구분. **HP 확정 데이터 / 피해량·모듈 HP 미정** |
| **관통·피해·모듈 HP 설계** | [combat/PENETRATION_DAMAGE_AND_VEHICLE_HP_CONCEPT_2026-11-07.md](combat/PENETRATION_DAMAGE_AND_VEHICLE_HP_CONCEPT_2026-11-07.md) | M829A1 영거리 380·10m KE598~2km KE560 거리표·연속 치명/과관통 및 근접 비관통 시험값 기록. M830 435·폭발 1m 시험 후보. 착탄속도 감쇠 계수 미정 |
| **전투 판정 2단계 설계 메모 (미구현)** | [combat/TWO_STAGE_HIT_AND_360_ARMOR_RESOLUTION_DESIGN_2026-11-07.md](combat/TWO_STAGE_HIT_AND_360_ARMOR_RESOLUTION_DESIGN_2026-11-07.md) | 발사·착탄 상태 평가, 최종 명중 추첨 1회 권장, 360° 구역 확률, 선택 면의 LOS/관통 판정 구상. **세부 공식·수치 미확정** |
| **장갑 세부 구획 검토 메모 (미확정)** | [tanks/ARMOR_SUBZONES_AND_PROBABILITY_IDEAS_2026-11-07.md](tanks/ARMOR_SUBZONES_AND_PROBABILITY_IDEAS_2026-11-07.md) | 7구역 내부 상/하부·포방패·좌우 뺨·측면 전후·지붕 분할 후보, LOS·이동 상태·사통/관측 확률 아이디어. **현재 미확정·미구현** |
| **탄약 및 적재 프리셋** | [ammo/README.md](ammo/README.md) | 탄종별 게임 관통력, 전차별 기본탄, **32종×3=96개** 적재 프리셋, 구획·장전·보급 설계 |
| **폐기된 통합 문서 안내** | [TACTICAL_1989_NATO_ARMOR_AMMO_DESIGN_ARCHIVE_2026-11-06.md](TACTICAL_1989_NATO_ARMOR_AMMO_DESIGN_ARCHIVE_2026-11-06.md) | 구형 통합 데이터는 최신 기준에서 제외. 과거 내용은 Git 파일 이력에서 확인 |

## 데이터 유지 원칙

- **전차 변경:** 우선 `tanks/README.md` 갱신. 탄약 적재나 수량까지 바뀌면 `ammo/README.md`도 갱신.
- **탄약 변경:** 우선 `ammo/README.md` 갱신. 탄약 종류와 전차 모델별 호환 규칙을 혼동하지 않도록 유지.
- **구역 체계:** 차체 전/측/후, 포탑 전/측/후, 통합 상부 = **7구역**. 하부는 아직 미도입.
- **특수 추가장갑:** Kontakt는 사용 후 피복률 소모. BDD와 D-Tech는 **피복률과 내구도를 독립 관리**. 상세 내구도 수치는 미정.
- **구형 통합 데이터:** 현행 문서에서 폐기. 이전 값·미결정 문구를 현재 설정처럼 재사용하지 않으며, 필요하면 Git 이력에서 확인.

새로 확정되는 자료가 늘어나면 국가별·기종별 세부 파일로 추가 분리할 수 있다.
