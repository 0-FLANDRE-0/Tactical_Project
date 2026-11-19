# WIP24 장갑 동기화와 Kontakt ERA 소모

시작 시 main은 `1132251`이었다. 작업 중 main에 추가된 `d214d08`의 포탑 전면 장갑과 `44b9443`의 Anti-ERA 재계산을 포함해 `551aa9a09a5661ba65bc142a45aba39aba1663f3`을 구현 및 비교 기준으로 사용했다. 원본 지시서의 포탑 전면 수치에는 이 후속 결정을 적용했다. [정본 우선순위](../archive/library/CANONICAL_RULES.md) · [원본 지시서](../archive/instructions/TACTICAL_WIP24_ARMOR_SYNC_AND_ERA_DEPLETION.md)

## 적용한 게임 수치

| 항목 | WIP23 | WIP24 |
|---|---|---|
| M1A2(1998) 차체 측면 KE/CE | 120/280 | 90/130 |
| T-80U(1989) 차체 측면 KE/CE | 115/120 | 75/85 |
| T-80U(1989) 포탑 전면 KE/CE | 575/740 | 530/730 |
| T-80U 차체 측면 Kontakt-5 추가 KE/CE | +215/+560 | +110/+560 |
| M829A2 10m, 0°/30°/60° | 675/570/390 | 630/530/365 |
| M829A2 2,000m, 0°/30°/60° | 635/535/365 | 600/505/345 |
| M829A2가 Kontakt-5 피복 지점에 맞았을 때 추가 KE 감쇄율 | 미적용 | 50.2% |

M829A2의 거리·입사각 보간은 공용 선형 보간을 사용한다. 1,005m의 0°/30°/60° 값은 615/517.5/355다. [미국 120mm 정본](../archive/library/ammunition/cannon/US_120.md)

T-80U의 피복 지점에서 M829A2에 대한 유효 추가 KE는 차체 측면 54.78, 나머지 장착 구역 107.07이다. 이 값과 각 구역의 기본 KE를 더하면 포탑 전면은 637.07, 차체 전면은 607.07이다. 0° 차체 전면은 1.5km에서 관통하고 1.6km에서 비관통한다. 그 외 탄종·ERA 조합의 감쇄율은 미정이다. [Anti-ERA 정본](../archive/library/systems/armor/ANTI_ERA.md)

HP와 나머지 구역 장갑은 각 차량 정본을 따르며, 현대 전차와 다른 1989년 전차 및 IFV는 아카이브 데이터로만 관리한다. [M1A2](../archive/library/vehicles/tanks/post-1989/M1A2_1992_1998.md) · [T-80U](../archive/library/vehicles/tanks/1989/SOVIET.md) · [상부장갑](../archive/library/vehicles/tanks/1989/UPPER_ARMOR.md) · [1989년 전차 색인](../archive/library/vehicles/tanks/1989/README.md)

## 상태와 착탄 처리

차량 생성 시 초기 피복률을 차량별 7구역 상태로 복사한다. 착탄 중복 검사와 도탄 판정 뒤 기존 seed·착탄 ID 난수로 피복 여부를 한 번 정한다. 소모 전 방호로 피해를 계산하고, 착탄이 확정되면 피격 구역에만 소모량을 적용한다. 발사한 탄은 발사 당시 탄종을 소유하고, 각 착탄은 앞선 착탄까지 반영한 차량 상태를 읽는다.

Kontakt-1/5 소모 정책은 HEAT/ATGM, APFSDS/APDS, HEP/HESH, HE/HE-FRAG를 명시적으로 구분한다. 피복과 빈 지점의 손실은 각각 다른 고정 %p다. 빈 지점에 맞은 날탄은 피복을 줄이지 않고, 도탄에는 피복 추첨이나 소모가 없다. K5 날탄 피복 소모는 24%p다. [공용 규칙 정본](../archive/library/systems/armor/SEVEN_ZONE_AND_KONTAKT_ERA.md) · [정책 JSON](../data/vehicles/era-policies.json)

아군 선택 정보는 구역별 피복을 보여 준다. 적 접촉·공개 피해·효과 이벤트에는 피복률, 추첨값, 정확한 방호량 및 이를 역산할 수 있는 잔여 관통비를 내보내지 않는다. 내부 기록은 명시적으로 계측을 활성화한 코어에서 복사본으로 조회한다.

## 라스도르프 고정 교전 기록

시나리오 `t80u-fire`, seed 7. M1A2 `A11`은 (550, 2750)에서 동쪽을, T-80U `U01`은 (950, 2750)에서 서쪽을 향한다. 양측 자동 사격의 관측·확보·발사 경로를 그대로 실행했다.

| 시뮬레이션 시각 | 탄종과 구역 | 피복 전후 | 관통 | HP 피해 |
|---|---|---|---|---:|
| 6.50초 | M829A2, 포탑 전면 | 95% → 71%, 피복 명중 | 비관통 | 0 |
| 12.50초 | M829A2, 포탑 전면 | 71% → 71%, 빈 지점 명중 | 관통 | 434.94 |

코어에서는 44.60초에 T-80U가 격파됐다. 초기 Contact 판정 및 양측의 발사·장전을 포함한 90초 구간, 실제 브라우저의 두 착탄과 아군 선택 패널은 증거 파일에 기록했다. [코어 및 렌더 계측](../tests/releases/WIP24-performance.json) · [Chromium 증거](../tests/releases/WIP24-browser-evidence.json)
