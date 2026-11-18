# TACTICAL 라이브러리 개편 — 2단계 원본문서 감사·정본 책임 설계

> **작업일:** 2026-11-19 · **결과: 2단계 완료 / 총 5단계 중 2단계**  
> **기준 원본:** `archive-library-baseline-2026-11-19` @ [`1593dc2caab7c55af85c4df9acf748d2f2fe0706`](https://github.com/0-FLANDRE-0/Tactical_Project/commit/1593dc2caab7c55af85c4df9acf748d2f2fe0706)  
> **변경 경계:** 이번 단계에서는 **정본 선정·중복·충돌 위험만 조사**했다. 기존 `archive/` 원본문서의 숫자·본문·경로, 1989 프리셋, 실제 게임 코드 **수정·이동·삭제 없음**. 진행 문서와 라이브러리 색인만 신규/갱신.  
> **완전성:** 1단계 파일 manifest에 실린 **Markdown 46개 파일을 기준 브랜치에서 실제로 열어 내용과 문서 지위·절 구성을 확인**했다. 각 문서의 책임 영역을 전부 분류했다. **모든 수치의 행·열별 독립 재계산, 모든 상대 링크/앵커 검증, 실행 코드 대조는 아직 수행하지 않았다.** 본 단계의 핵심은 라이브러리 정본의 **책임 분리**이며, 숫자 검산·링크 검사는 3~5단계에서 계속한다.

## 1. 조사 범위·증빙

- 전체 기준 아카이브: **63개 파일 / 10개 기존 하위 폴더**, Git 트리 잘림 없음.  
- 조사한 Markdown: **46개**; 그 외 HTML/JS/PNG/SVG/ZIP/Python 등 **17개 바이너리·실행물·참조 자산은 이동/삭제 후보로 지정하지 않음**.
- 각 원본 문서의 **기준 Git Blob SHA, 역할, 책임 영역, 가상 이전 목적지, 1차 검토사항**을 다음 JSON으로 기록: [`STAGE2_SOURCE_OWNERSHIP_MAP_2026-11-19.json`](STAGE2_SOURCE_OWNERSHIP_MAP_2026-11-19.json).
- 원본 파일 전체 크기·SHA 목록: [1단계 manifest](BASELINE_FILE_MANIFEST_2026-11-19.json).
- 아래의 새 경로는 **미래 설계안**이지, 파일 이동 또는 새 스펙 문서 생성 완료를 의미하지 않는다.

| 소스 범주 | Markdown 수 | 역할과 보존 방식 |
|---|---:|---|
| `archive/` 최상위 | **3** | 현행 긴 목차, 당시 진행 로그, 구형 통합 문서 폐기 안내 |
| `air/` | **4** | 헬기 상세 제원 2, 헬기 색인 1, 항공 투입·방공 시스템 1 |
| `ammo/` | **2** | 대형 정본+96개 프리셋 1, 근거리 KE 참고표 1 |
| `combat/` | **6** | 명중·관통·피해·도탄·모듈·기관포·잔해 규칙의 확정/제안 혼합 |
| `infantry/` | **1** | 보병 방향·검토값·미정 백업 |
| `instructions/` | **20** | WIP 지시서/수정 19 + 당시 상태 목차 1 → **이력** |
| `performance/` | **1** | 지도·LOS·경로탐색·분대 AI의 구현 사실과 후속 제안 혼합 |
| `tanks/` | **2** | 대형 전차 정본 1 + 확정하지 않은 세부 장갑면 아이디어 1 |
| `vehicles/` | **6** | IFV/APC/정찰차량 상세와 차량에 섞인 미사일·기관포 데이터 |
| `world/` | **1** | 1989년 대체역사 보유량·편제 **원안**, 최종 채택 데이터 아님 |
| **합계** | **46** | 원본 전체를 책임도에 1:1 등록 |

## 2. 현재 기준 문서 → 미래 정본 책임

아래에서 ‘정본’은 **아직 기존 파일 기준의 현행 값 소유권**을 뜻한다. 실제 신규 라이브러리 정본 전환은 3~5단계의 검증 후에만 실행한다.

| 데이터·규칙 | 현재 우선 원본 | 제안할 단일 책임 영역 | 이전 유의점 |
|---|---|---|---|
| 본편 **1989년 전차 32종** 7구역 KE(CE), 차량 HP | [tanks/README.md](../../tanks/README.md) | `vehicles/tanks/1989/` | 미국 5·서독 6·소련 14·NVA 7형식 유지. 동일 KE와 CE를 분리 저장 |
| 후속 **M1A2 (1992/1998)** | [tanks/README.md §8~9](../../tanks/README.md) | `vehicles/tanks/post-1989/` | 본편 32종에 혼합 금지; SEP 별도 미정 |
| 현대 **Leopard 2A8** | [tanks/README.md §10](../../tanks/README.md) | `vehicles/tanks/modern/` | 차량 HP 1,450, 모듈러 증가장갑의 5부위 독립 HP와 Trophy는 서로 다른 상태 |
| 공통 7구역, ERA/K1·K5 피복 소모, BDD/D-Tech/2A8 모듈러 증가장갑 | [tanks/README.md §1~2, §10](../../tanks/README.md) | `systems/armor/` | ERA의 **피복률 감소** vs 증가장갑 **고정 피복률·독립 HP** vs Anti-ERA **추가 방호력 감쇄** 구분 |
| 1989년 전차 주포탄 KE/CE·기본 피해·발사 속도·기본탄 | [ammo/README.md](../../ammo/README.md) | `ammunition/cannon/` | **구경/국가/탄종 ID** 명확히 분리; 사용자 확정과 잠정 구분 |
| 현대 **DM53/DM53A1/DM63/DM63A1/DM73, M829A2, Anti-ERA** | [ammo/README.md §2·§4](../../ammo/README.md) | `ammunition/modern/` | DM73은 L55A1 전용, 감쇄율 수치 미정. KE/기본 피해와 Anti-ERA 별개 |
| **TOW 기본/I-TOW/2/2A/2B** | [vehicles/USAREUR... §2-B](../../vehicles/USAREUR_IFV_CFV_ROSTER_PLAN_2026-11-12.md), [ammo/README.md §14](../../ammo/README.md) | `ammunition/missiles/tow-family` | **하나의 탄종 정본**으로 합치고 Bradley에서 호환 링크만 둠. 2A 880/760/440·538 HP, 2B 상부 CE 240·535 HP |
| BMP/Marder/헬기 탑재 미사일(ATGM, MILAN, Hellfire 등) | [vehicles/](../../vehicles/), [air/](../../air/), [ammo/README.md](../../ammo/README.md) | `ammunition/missiles/` | 차량은 **발사기 호환·기본 배치**만 관리, 미사일 고유 성능은 미사일 정본에 |
| 전차 **32종×3=96개 적재 프리셋** | [ammo/README.md §11](../../ammo/README.md) | `presets/1989/` | **18개 편성 그룹×3=54개 표 행**을 32형식×3으로 펼쳐 검증. 그룹 공용값 유지 |
| 장전·보급·관통/치명·과관통·HEP/HE-FRAG·도탄·신관 | [ammo/README.md](../../ammo/README.md), [combat/](../../combat/) | `systems/combat/`, `systems/logistics/` | 탄약별 피해 기본값 vs 구경별 피해 배율/관통 실패 규칙 분리 |
| 항공기 4종·APC/IFV/CFV/정찰 | [air/](../../air/), [vehicles/](../../vehicles/) | `vehicles/1989/` | 장비 제원 채택, 임시 제안 무기, 보급·편성 미정 상태를 개별 필드로 유지 |
| 보병, 지도/LOS, 항공 진입/대공, 세계관 | [infantry/](../../infantry/), [performance/](../../performance/), [air/](../../air/), [world/](../../world/) | `units/`, `systems/`, `world/` | 대체역사 세계관의 추정/원안은 **확정 장비 성능**으로 승격시키지 않음 |
| WIP09~WIP22 지시서 및 당시 진행 메모 | [instructions/](../../instructions/), [NEXT_STEPS](../../NEXT_STEPS_2026-11-07.md) | `history/implementation/` | 요청 시점의 ‘구현 대기’와 최신 main의 ‘병합 완료’를 자동 동일시하지 않음 |
| 폐기·이전 설계·미확정 아이디어 | [구형 안내](../../TACTICAL_1989_NATO_ARMOR_AMMO_DESIGN_ARCHIVE_2026-11-06.md), [armor 아이디어](../../tanks/ARMOR_SUBZONES_AND_PROBABILITY_IDEAS_2026-11-07.md) | `history/legacy/`, `history/proposals/` | 새 확정 사양으로 복원·자동 반영 금지 |

## 3. 확인된 불일치·중복·주의사항 등록부

### A-01 [확인됨 · 표제 오기] 1989 NATO 차량 수 표제

- [탄약 원본 §11](../../ammo/README.md)의 표제는 **`### 미국·서독 NATO (10개 형식)`**이지만, 같은 문서의 앞부분 및 [전차 원본 §9](../../tanks/README.md)에 명시된 편성은 **미국 5 + 서독 6 = 11종**이다.
- 현재 96개 프리셋은 **32종×3**으로 기록됐고 표는 **18개 템플릿 그룹×3=54개 행**이다. 구조별 행 수를 확인하면 **소련 18, NATO 21, NVA 15 = 총 54행**이다. NATO 21행은 **7개 공유 그룹×3**에 해당하므로 차량 수 10개라는 표제와 다르다.
- **처리 계획:** 이관 후 표제를 ‘**미국·서독 NATO 11개 형식**’으로 바로잡되, **실제 탄약 발수·프리셋 수치는 절대 조정하지 않음**. 32개 실차 ID로 확장한 검산을 3단계에서 실행.

### A-02 [확인됨 · 앵커 불일치] TOW 2B 참조 링크

- [Bradley 원본](../../vehicles/USAREUR_IFV_CFV_ROSTER_PLAN_2026-11-12.md)에는 [탄약 §14](../../ammo/README.md)로 이어지는 **옛 절 제목 기반 링크** `#14-1990년-이후-미사일--tow-2b-별도-확장-2026-11-19`가 남아 있다.
- 실제 [탄약 원본 §14](../../ammo/README.md)는 **‘TOW 2A 개량형 및 1990년 이후 TOW 2B 확장’**으로 표제가 바뀌었다. **상대경로 파일은 존재해도 이 앵커는 현재 표제를 가리키지 못한다.**
- **처리 계획:** 3단계에 새 TOW 계열 정본을 만들면서 링크를 정본 링크로 교체. 숫자 변경 없음.

### A-03 [확인됨 · 의도적 이력 충돌] 영구 모듈 파괴

- [오래된 관통/피해 메모](../../combat/PENETRATION_DAMAGE_AND_VEHICLE_HP_CONCEPT_2026-11-07.md)에 당시 **영구 모듈 HP·완전 파괴/수리** 논의가 남아 있다.
- [2026-11-12 후속 결정](../../combat/TEMPORARY_MODULE_CREW_AMMO_DESIGN_UPDATE_2026-11-12.md)은 **영구적인 모듈 손상·파괴 미도입**, 일시 성능 저하 중심으로 명시했다.
- **처리 계획:** 새 시스템 정본에는 **후속 사용자 결정**만 반영하고 옛 구상은 역사 자료로 남김. WIP18/20의 M1A2_1998 전용 시험 구현은 별도 설명.

### A-04 [확인됨 · 중복 기록] TOW 미사일 데이터

- [Bradley 문서 §2-B](../../vehicles/USAREUR_IFV_CFV_ROSTER_PLAN_2026-11-12.md)와 [탄약 문서 §14](../../ammo/README.md)에 **TOW 2A/2B 제원·시대·특수 효과**가 반복돼 있다.
- **현재 값은 모순으로 판정하지 않음.** 2A는 **CE 880/760/440, 538 HP, ERA 추가 CE 감쇄(수치 미정)**; 2B는 **상부 CE 240, 535 HP, 1990년 이후**. 2B의 3,750m 사거리는 **후보/참고**, 확정 수치로 승격하지 않음.
- **처리 계획:** 미사일 정본 하나, Bradley는 발사 가능 탄종·미사일 탑재/호환만 참조.

### A-05 [구분 필요 · 제목 범위] 1989와 후속 시대 혼합

- [tanks/README.md](../../tanks/README.md)는 제목이 ‘TACTICAL 1989’인데 **M1A2 (1992/1998)와 현대 Leopard 2A8**이 함께 있다.
- [ammo/README.md](../../ammo/README.md)에는 **1989년 탄약·현대 독일 120mm·M829A2·TOW 2B**가 함께 있다.
- **처리 계획:** 게임 탄약 규칙은 공용으로 두되, **장비 엔트리의 시대 필드 및 1989년 프리셋 포함 여부**를 명확히 나눈다. 후속 장비가 존재한다고 1989년 부대에 자동 지급하지 않는다.

### A-06 [구분 필요 · 시간에 따른 상태 변경] WIP 지시서의 미구현 표기

- 원본 [WIP20 지시서](../../instructions/TACTICAL_WIP20_M1A2_AMMUNITION_INCIDENTS.md)에는 작성 당시 ‘구현·검증 대기’가 있고, [instructions/README.md](../../instructions/README.md)에는 **후속 2026-11-14 main 병합** 기록이 있다.
- WIP21/22는 [instructions/README.md](../../instructions/README.md)의 **2026-11-15 스냅샷에서 검증 완료/PR 검토 대기**로 표기한다. **현재 main 구현 여부는 이 과거 문구만으로 단정하지 않음.** 관련 `docs/tasks`, PR, 검증물과 실제 코드 재확인이 필요하다.
- **처리 계획:** 설계 상태 `approved/provisional`, 구현 상태 `main/test-only/not-implemented/unverified`, **근거 커밋**을 별도 필드로 저장.

### A-07 [승격 금지 · 확정과 제안 혼합]

- [Mi-24 로켓 4종](../../air/MI24_D_V_P_HIND_WEAPONS_AND_DAMAGE_2026-11-15.md)은 **어시스턴트 임시 제안/미확정**.
- [M919 기관포탄](../../combat/AUTOCANNON_PENETRATION_DAMAGE_POLICY_2026-11-13.md)은 사용자 논의의 **잠정 게임 시험값/조기투입 후보**이며, **기관포 치명타 없음·과관통 감쇄 방향**과 확정 수준이 다르다.
- [추가 APC의 M113G](../../vehicles/APC_ADDITIONAL_BTR60_M113G_FUCHS_BTR50_MTLB_2026-11-14.md)는 세부형식 확정 완료가 아니다.
- [1989 세계관 편제](../../world/WW3_1989_JUNE20_FORCE_INVENTORY_OOB_DRAFT_2026-11-13.md)는 **다른 채팅에서 작성한 원안 백업**이며 공식 최종 배치 수치로 자동 채택할 수 없다.
- **처리 계획:** 숫자가 기록된 사실만으로 **사용자 확정**으로 올리지 않는다. 출처와 결정 수준 보존.

### A-08 [별도 시스템 유지] ERA/Anti-ERA·모듈러 증가장갑·Trophy·Top Attack

- ERA **추가 KE/CE 보너스**, Kontakt 피복률 소모, 현대 날탄/TOW 2A **Anti-ERA 감쇄**, KVT/2A8 **비폭발성 증가장갑의 독립 HP**, 2A8 **Trophy HV 좌우 180° 독립 요격**은 서로 다른 계층.
- **TOW 2B의 상부 CE 240**은 제7구역 **상부 CE 판정 전용**, 기본 차량 피해 **535 HP**와 구분한다. Trophy와의 상부 요격 가능 여부는 아직 미정이므로 자동 우회·자동 요격을 선언하지 않음.
- **처리 계획:** 시스템 타입/상호작용 링크만 연결하고 검증되지 않은 피해율·확률·방호치 계산은 추가하지 않음.

## 4. 제안 라이브러리 데이터 형식 — 3단계 입력 계약

향후 새 엔트리를 만들 때 아래 **공통 메타 필드**를 사용한다. **제안 스키마**이며 현재 엔진 코드·실제 스펙 파일 형식 변경이 아니다.

```yaml
id: "vehicle.de.leopard2a8"   # 고유 내부 ID; 예시
kind: "vehicle"               # vehicle / ammunition / missile / system / preset / world
era: "modern"                 # 1989 / post-1989 / modern / cross-era
display_name: "Leopard 2A8"
nation: "DE"
design_status: "approved"     # approved / provisional / proposal / historical
implementation_status: "unverified" # implemented-main / test-only / not-implemented / unverified
implementation_evidence: null
source:
  path: "archive/tanks/README.md"
  section: "10"
  baseline_commit: "1593dc2caab7c55af85c4df9acf748d2f2fe0706"
unknowns: []                  # 미정인 개별 변수의 이름을 명시
references: []                # 참조 엔트리 ID
```

**종류별 최소 계약:**

| 엔트리 종류 | 필요한 필드 | 잘못 합치면 안 되는 데이터 |
|---|---|---|
| 차량 | 형식별 ID, 7구역 KE/CE, 차량 HP, 무장/탄약/방호시스템 참조 | 본체 HP vs 추가장갑 HP, 1989/현대 출전 여부 |
| 탄약/미사일 | 구경·탄종, 0°/30°/60° 조건(존재할 때), 기준 거리, KE/CE, 포구초속/미사일 속도, 기본 피해, 특수 효과 | 관통력 vs HP, **TOW 2B 상부 전용 단일 CE** vs 일반 고각 탄약 3개 열 |
| 추가장갑/ERA | 시스템 종류, 부위, 고정/소모 피복률, 추가 KE/CE, 별도 HP와 감쇄율(해당 시), 최저 잔존율 | ERA 피복률 소모와 증가장갑 HP 손실을 합산/혼용 금지 |
| APS | 좌/우 발사기별 요격탄·방어각·반응시간·재발사 간격, 미정인 상하각/탐지·명중 조건 | 양쪽 재고·재발사 시간을 공용 상태로 묶지 않음 |
| 프리셋 | 본편 차종 ID, 프리셋 이름, 탄약 구획별 탄종/수량, 합계 | 그룹 공유 템플릿 18개와 실제 차량 32개를 혼동하지 않음 |
| 규칙/세계관 | 범위, 상태, 적용 대상, 미정 변수, 사실·제안 출처 | 대체역사 원안이나 과거 지시서의 당시 상태를 현행 사실로 오인 |

**원칙:** 파일당 모든 숫자를 복제하지 않고, **데이터 값의 소유자는 하나**다. 차량은 탄약의 `id`를 참조하고, 미사일은 발사 플랫폼과 유도체계 호환 테이블에 의해 사용 가능 범위가 연결된다. 정본 표시는 단순 ‘최신 작성 날짜’가 아니라 **사용자 확정·후속 수정의 우선순위**로 결정한다.

## 5. 3단계 실행 경계 및 체크리스트

1. **주요 데이터 우선 이관:** `vehicles/tanks/`, `ammunition/cannon/`, `ammunition/missiles/`, `presets/1989/`의 정본 데이터를 신규 파일로 분리·인덱스화.
2. **프리셋 96개 검증:** 그룹행 54개를 차종 32개·프리셋 3개로 확장한 뒤 구획별 합계/종별 빈칸/원본 값을 대조; **값 변경 금지**.
3. **TOW 단일 정본:** BGM-71A/B/C/D/E/F를 하나의 계열 안에서 구분, 2A 탠덤 효과·2B 상부 CE 240 및 피해 535 분리.
4. **개별 상태 보존:** `approved`, `provisional`, `proposal`, `historical` 플래그를 항목 단위로 관리. WIP 완료 주장엔 근거 파일/커밋 확인.
5. **링크와 구형 문서:** 새 정본이 검증될 때까지 기존 문서를 삭제·리다이렉트하지 않음. A-01~A-08의 확인사항을 순차 해결.
6. **게임 코드 불변:** 실제 전투 엔진/테스트 데이터/런타임 HTML을 이관 작업에서 수정하지 않음.

### 완료 판정

- [x] 기준 브랜치 Markdown **46개** 전수 열람 및 역할/우선권 분류
- [x] 데이터 정본 책임 영역·가상 목적지 46개 1:1 매핑
- [x] TOW 중복, NATO 표제 10↔11, 수정된 앵커, 구형 모듈·구현상태 차이 등 위험 등록
- [x] 데이터 스키마 제안과 3단계 입력 계약 작성
- [ ] **3단계:** 신규 라이브러리에서 실제 수치 이관 및 원본과 행 단위 대조
- [ ] **5단계:** 전역 링크·수치 대조 및 구형 내용 최종 정리

**요약:** 이번 감사에서 **현행 원본 파일을 변경하거나 수치를 재설계하지 않았다.** 모든 지적 사항은 **확인된 오기/중복**, **과거·현재 상태 차이**, **미정/잠정**, **마이그레이션 위험**을 구별해 기록했다. 새 라이브러리의 실제 데이터 정본 선언은 3~5단계 검증 뒤에만 한다.
