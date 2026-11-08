# TACTICAL WIP09 지시서 — 물리 상태 기반 명중 확률 (탄착 좌표 없음)

> 작성: 2026-11-07 KST
> 기준 코드: `feat/wip08-aim-fire` @ `68a549b` (PR #4, main 미병합). 작업 시작 시 PR #4가 main에 병합돼 있으면 최신 main에서 시작한다. 시작 커밋을 릴리스 문서에 적는다.
> 작업 브랜치: `feat/wip09-hit-model` · 초안 PR로 올리고 main 병합·공개 배포는 하지 않는다.
> 산출물 이름: `Tactical_v0.4_WIP09.html` (기존 WIP08A 릴리스 형식 유지)

## 0. 반드시 지킬 설계 원칙 (아카이브 기준)

근거 문서: `archive/tanks/ARMOR_SUBZONES_AND_PROBABILITY_IDEAS_2026-11-07.md` 4~6절, `archive/tanks/README.md` 1절.

1. **탄착 좌표를 만들지 않는다.** 실제 탄도 비행, 충돌, 맞은 위치 추적을 구현하지 않는다. 물리 상태(거리, 자세, 노출, 운동, 조준 시간)를 **입력으로만** 써서 확률을 계산한다.
2. 판정 순서는 그대로 둔다. **① 명중 여부 → ② 맞았다는 전제로 7구역 중 하나.** 세부 부위(subzone)는 이번 범위가 아니다.
3. 명중 실패를 정규화로 명중 처리하지 않는다. 명중 확률과 조건부 구역 확률을 섞지 않는다.
4. **이중 적용 금지.**
   - 탐지·식별 품질(거리 가중, 숲 광학깊이, 중심 가중)을 명중 확률에 다시 곱하지 않는다. 명중은 "자기 포수 현재 관측" 조건만 요구한다.
   - 표적 이동은 명중 단계의 가로 오차에만 넣는다. 구역 확률에는 넣지 않는다.
   - 자차 이동은 안정화 오차 항에만 넣는다.
5. 숲: 보이는 표본은 숲 광학깊이와 무관하게 "제시된 표적"으로 취급한다. 수풀이 포탄을 막는 효과는 이번 범위가 아니다.
6. 아래 모든 수치는 **게임 튜닝값**이다. 실제 사통장치·탄도 성능 추정이 아니라고 코드 주석과 문서에 명시한다.
7. 결정성 유지: 승인된 단발마다 난수는 지금처럼 **명중 1회 + 구역 1회**만 소비한다. 거부된 입력, 렌더링, 패널 조회는 난수를 소비하지 않는다. 시드·차량 ID·발사 번호로 재현되는 기존 방식을 유지한다.

## 1. 범위

**이번에 하는 것**
- `fire-control.js`의 `estimate()` 명중 확률을 오차 예산 + 제시 크기 방식으로 교체
- 차체/포탑 명중 비율을 같은 계산에서 얻어 구역 분배에 사용 (`zoneWeights` 폐기)
- 조준 시간이 길어질수록 오차가 줄어드는 연속 조준 모델 (준비 게이트 1.2초는 유지)
- 관측 기반 표적 **속도 벡터** 추정 (지금은 속력 스칼라뿐)
- 노출 표본에 열·행 인덱스 추가
- 패널에 오차·제시 크기 요약 표시, 개발 snapshot에 상세 분해 노출

**이번에 안 하는 것**
관통·피해·파괴, 경사·도탄·신관, ERA 소모, 세부 부위, 상부(7번째) 피격 활성화, 탄종 다양화(시험탄 1종 유지), AI 자동 발사, 2발째 보정, HE 파편 범위, 오인사격, 실제 탄도 연출.

## 2. 계산 모델

### 2-1. 좌표와 기호

- 사수 `u`, 표적 자세 `pose`(발사 순간 freshSight의 pose, 미리보기는 접촉 pose)
- 거리 `R` = 두 중심 사이 수평 거리(m), 시선 방위 `β = atan2(pose.y-u.y, pose.x-u.x)`
- 시선에 수직인 가로 단위벡터 `e⊥ = (-sin β, cos β)`
- 높이 `z`는 지면 기준(m). 시선 고저차는 이번 범위에서 무시한다.

### 2-2. 오차 예산 (1σ, 밀 = mrad)

| 항 | 식 | 축 |
|---|---|---|
| 포·탄 산포 | `σ_disp = dispersionMrad` | 가로·세로 |
| 조준 | `σ_lay = layMinMrad + (layStartMrad − layMinMrad)·exp(−τ/layTauSeconds)` | 가로·세로 |
| 거리측정 | `σ_rng = 1000·g·rangeErrorM / (2·muzzleVelocity²)`, g = 9.81 | 세로만 |
| 리드 잔차 | `σ_lead = 1000·leadResidual·v⊥·ToF / R` | 가로만 |
| 표적 기동 | `σ_man = 1000·0.5·maneuverAccel·ToF² / R · min(1, |v_t|/maneuverReferenceSpeed)` | 가로만 |
| 자차 안정화 | `σ_own = stabMradPerMps·|u.speed|` | 가로·세로 |

- `ToF = R / (muzzleVelocity·velocityRetention)`
- `σx = √(σ_disp² + σ_lay² + σ_lead² + σ_man² + σ_own²)`
- `σz = √(σ_disp² + σ_lay² + σ_rng² + σ_own²)`
- `τ` = **연속 조준 시간**. 지금 `aimElapsed`가 리셋되는 조건과 똑같은 조건에서 0으로 리셋하되, `aimSeconds`에서 멈추지 않고 계속 증가한다. 준비 판정용 `aimProgress`는 기존처럼 `aimSeconds`로 상한을 둔다.
- `v_t` = 관측으로 추정한 표적 속도 벡터(2-4절), `v⊥ = |v_t · e⊥|`.

### 2-3. 제시 크기 (보이는 표적)

표적 실루엣을 시선에서 본 직사각형 최대 2개로 근사한다. 두 직사각형은 세로 범위가 겹치지 않는다.

**폭**
- 차체 상대각 `a_h = β − pose.heading`
  → `W_h = hullLength·|sin a_h| + width·|cos a_h|`
- 포탑 상대각 `a_t = β − pose.turret`
  → `W_t = turretLength·|sin a_t| + turretWidth·|cos a_t|`
- 포신은 무시한다.

**높이** (프로파일 `fireControl.presented`)
- 차체 띠 `[hullBottom, hullTop]`, 포탑 띠 `[hullTop, turretTop]`
- 초깃값: `hullBottom = model.groundClearance`(0.4826), `hullTop = 1.65`(게임 근사), `turretTop = model.roofHeight`(2.3749)

**노출 표본으로 보이는 부분 정하기**

`exposure()` 표본 순서는 차체 `hullAlong`(바깥 루프) × `hullHeights`(안쪽 루프), 그다음 포탑 `turretAlong`이다. 각 표본에 `along`(m), `z`(m), `col`, `row` 필드를 **추가**한다. LOS 계산, 표본 수, 순서, 캐시 키는 바꾸지 않는다.

차체:
- 보이는 열 = 그 열 표본 중 하나라도 보이면 보임
- 폭 비율 `fw_h = 보이는 열 수 / 3`
- 행 높이 구간: 인접 표본 높이의 중점으로 나눈다. `hullHeights [0.8, 1.4]`이면 0행 `[hullBottom, 1.1]`, 1행 `[1.1, hullTop]`
- 보이는 차체 세로 범위 = 보이는 행 구간들의 최소~최대
- 가로 중심 `c_h` = 보이는 열들의 `along·sin(pose.heading − β)` 평균

포탑:
- 폭 비율 `fw_t = 보이는 표본 수 / 3`
- 세로는 하나라도 보이면 포탑 띠 전체
- 가로 중심 `c_t = (회전축 월드 오프셋 · e⊥) + 보이는 표본들의 along·sin(pose.turret − β) 평균`
- 회전축 월드 오프셋 = `model.turretPivot`을 차체 방위로 회전한 벡터

직사각형:
- 차체 `x ∈ [c_h ± W_h·fw_h/2]`, `z ∈ 보이는 차체 범위`
- 포탑 `x ∈ [c_t ± W_t·fw_t/2]`, `z ∈ [hullTop, turretTop]`

보이는 표본이 없으면 직사각형이 없고, 명중 확률은 0이며 발사는 거부한다(기존 동작 유지).

### 2-4. 표적 속도 벡터

`previousSample`에 이미 x, y, time이 있다. 자기 포수 관측이 갱신될 때 `v_t = Δpos / Δt`로 벡터를 저장한다(스칼라 `targetMotion`은 호환용으로 `|v_t|`로 유지).
- `Δt`가 `queryPeriod × 5`를 넘으면 그 구간은 버리고 `v_t`를 0으로 둔다.
- 숨겨진 실제 표적 속도는 읽지 않는다.
- 표적 변경이나 리셋 조건에서는 함께 리셋한다.

### 2-5. 명중 확률

조준점 = 보이는 직사각형들의 **면적 가중 중심** `(μx, μz)`. 포수는 보이는 표적의 중앙을 겨눈다. 이번 단계에서 편향은 0이다.

각 직사각형:
```
P_rect = [Φ((x2−μx)/Sx) − Φ((x1−μx)/Sx)] · [Φ((z2−μz)/Sz) − Φ((z1−μz)/Sz)]
Sx = σx/1000·R,  Sz = σz/1000·R   (m)
```

- `P_hull`, `P_turret`를 구하고 `hitChance = P_hull + P_turret`(0~1로 clamp). 거리 `R > maxRange`면 0.
- `Φ`는 표준정규 누적분포. `erf` 근사(Abramowitz–Stegun 7.1.26, 최대오차 1.5e-7)로 구현하고 단위 테스트한다.

### 2-6. 구역 분배 (명중했을 때)

기존 `distribution()`의 구조는 유지하되, 차체/포탑 비중으로 `zoneWeights × 노출 비율` 대신 **`P_hull / hitChance`, `P_turret / hitChance`**를 쓴다. 각 묶음 안의 전/측/후 분배는 기존 방향 가중 그대로. `upper`는 0 유지. `fireControl.zoneWeights`는 프로파일과 검증에서 제거한다.

## 3. 프로파일 변경 (`vehicle-profiles.js` → `fireControl`)

**제거:** `accuracyNear`, `accuracyFar`, `selfMotionPenalty`, `targetMotionPenalty`, `motionReference`, `zoneWeights`

**유지:** `aimSeconds 1.2`, `alignmentTolerance 1.5°`, `maxRange 2000`, `fireHeight 2.2`, `shotIntervalSeconds 1`, `testRounds 42`

**추가 (게임 튜닝값):**

| 필드 | 값 | 뜻 |
|---|---:|---|
| `dispersionMrad` | 0.25 | 포·탄 산포 1σ |
| `layStartMrad` | 1.5 | 조준 시작 시 조준오차 |
| `layMinMrad` | 0.10 | 충분히 조준했을 때 남는 조준오차 |
| `layTauSeconds` | 0.6 | 조준오차가 줄어드는 시간 상수 |
| `rangeErrorM` | 5 | 레이저 거리측정 1σ(m) |
| `muzzleVelocity` | 1650 | 시험탄 포구속도(m/s) |
| `velocityRetention` | 0.94 | 평균 탄속 비율(비행시간 계산용) |
| `leadResidual` | 0.10 | 사통장치 리드 계산 잔차 비율 |
| `maneuverAccel` | 1.0 | 비행 중 예측 못 한 표적 가속(m/s²) |
| `maneuverReferenceSpeed` | 5 | 기동 오차가 최대가 되는 표적 속도(m/s) |
| `stabMradPerMps` | 0.03 | 자차 속도당 안정화 오차 |
| `presented` | `{hullBottom: 0.4826, hullTop: 1.65, turretTop: 2.3749}` | 2-3절 높이 띠 |

검증: 모든 값이 유한해야 한다. `layStartMrad ≥ layMinMrad > 0`, `hullBottom < hullTop < turretTop`, 나머지는 > 0(`leadResidual`, `stabMradPerMps`는 ≥ 0). `data/vehicles/M1A2.json`도 `node scripts/export_vehicle_profile.cjs`로 다시 내보낸다.

## 4. 코드 변경 위치

- `src/fire-control.js`
  - `normalCdf`, `errorBudget(...)`, `presentedRects(...)`, `rectProbability(...)` 추가
  - `estimate()` 교체: `{hitChance, zoneProbabilities, breakdown}` 반환. `breakdown = {range, tof, sigma: {disp, lay, rng, lead, man, own, x, z}, rects, aim: {x, z}, pHull, pTurret}`
  - 상태에 `layTime`(연속 조준 시간), `targetVelocity` 추가. 기존 `aimElapsed`/`aimProgress` 게이트는 유지.
  - 공개 export에 새 함수 추가(테스트용)
- `src/sim-core.js`: `exposure()` 표본에 `along`, `z`, `col`, `row` 추가. `freshSight` 결과에 표본 배열 포함.
- `src/observation.js`: `c.gunnerExposure`에 비율과 함께 표본 배열 사본을 둔다. 관측 확률·주기·품질 계산은 바꾸지 않는다.
- `src/app.js` 패널: "예상 명중률 76% · 오차 0.38밀 · 보이는 표적 3.7×1.9m · 차체/포탑 50/26%" 형식의 한 줄을 추가한다. 미식별·기억 접촉에는 지금처럼 숨긴다. snapshot에는 `breakdown`을 사본으로 노출한다.
- `docs/FIRE_CONTROL_WIP09.md`: 모델 설명, 수치표(5절) 포함. `FIRE_CONTROL_WIP08.md`의 확률 절에 "WIP09에서 교체됨" 한 줄만 추가.

## 5. 검증 기준표 (골든 값)

조건: 사수·표적 모두 M1A2, 사수 정지(별도 표기 제외), 조준 시간 τ = 1.2초(별도 표기 제외), 표적 속도 0(별도 표기 제외). 정면 = 표적 차체·포탑이 시선과 나란함(정면·후면은 같은 값), 측면 = 표적 차체가 시선에 90°이고 포탑도 차체와 같은 방향, 횡단 속도 10m/s는 시선에 수직. "차체 상단만" = 차체 1행(1.4m)만 보임. "포탑만" = 차체 표본 전부 가림.
`|기대값 − 결과| ≤ 0.002`이면 통과.

**hitChance**

| 상황 | 500m | 1000m | 1500m | 2000m | 3000m |
|---|---:|---:|---:|---:|---:|
| 정면·완전노출·정지 | 1.000 | 0.986 | 0.898 | 0.766 | 0.516 |
| 정면·차체 상단만 | 0.999 | 0.904 | 0.731 | 0.580 | 0.364 |
| 정면·포탑만(헐다운) | 0.942 | 0.656 | 0.470 | 0.353 | 0.210 |
| 측면·횡단 10m/s | 1.000 | 0.982 | 0.877 | 0.722 | 0.433 |
| 정면·자차 10m/s 기동 | 1.000 | 0.948 | 0.792 | 0.622 | 0.373 |
| 정면·조준 0.4s | 0.973 | 0.701 | 0.446 | 0.291 | 0.145 |
| 정면·조준 3s | 1.000 | 0.999 | 0.979 | 0.915 | 0.727 |

> "조준 0.4s"는 식 검증용 행이다. 준비 게이트가 1.2초라서 현재 게임에서는 이 상태로 발사할 수 없다. 3000m 행도 `maxRange` 2000을 넘으므로 실제 게임 값은 0이다. 식 검증 때만 `maxRange`를 늘려서 비교한다.

**2000m 분해**

| 상황 | P(차체) | P(포탑) | σx 밀 | σz 밀 |
|---|---:|---:|---:|---:|
| 정면·완전노출·정지 | 0.503 | 0.263 | 0.383 | 0.383 |
| 정면·차체 상단만 | 0.250 | 0.330 | 0.383 | 0.383 |
| 정면·포탑만(헐다운) | 0.000 | 0.353 | 0.383 | 0.383 |
| 측면·횡단 10m/s | 0.518 | 0.204 | 0.857 | 0.383 |
| 정면·자차 10m/s 기동 | 0.402 | 0.219 | 0.486 | 0.486 |
| 정면·조준 0.4s | 0.187 | 0.104 | 0.856 | 0.856 |
| 정면·조준 3s | 0.627 | 0.288 | 0.273 | 0.273 |

함께 전달하는 참고 구현 `wip09_hit_reference.py`(파이썬, 기준표 생성용)를 `tests/fixtures/`에 그대로 넣고, 생성 결과 JSON을 `tests/releases/WIP09-hit-table.json`으로 저장한다. JS 구현 결과와 자동 비교한다.

## 6. 테스트

**단위**
- `normalCdf`: Φ(0) = 0.5, Φ(1) = 0.841345, Φ(−2) = 0.022750 (±1e-6)
- 단조성: 거리 증가 → 명중률 감소 / 노출 감소 → 감소 / 조준 시간 증가 → 증가 / 횡단 속도 증가 → 감소 / 자차 속도 증가 → 감소
- `P_hull + P_turret = hitChance`. hitChance > 0이면 구역 확률 합 = 1, `upper` = 0
- 노출 0 → 0이고 발사 거부, 난수 미소비
- 대칭: 좌우 대칭 상황에서 결과 동일

**통합**
- 5절 기준표 전 항목 통과
- 같은 시드·명령 → 같은 발사 결과(기존 결정성 테스트 확장)
- 표본 인덱스 추가 전후로 LOS 결과·관측 결과·성능 비교 fixture가 동일
- 기존 Node 195개 + Chromium 15개 통과. 제거된 필드에 의존하던 테스트는 새 모델 기준으로 고치고, 변경 사유를 릴리스 문서에 적는다.

**브라우저**
- 패널 한 줄 표시, 콘솔 에러 0
- 390×844, 844×390, 데스크톱 스크린샷을 `tests/releases/WIP09-*.png`로 저장

## 7. 릴리스 문서

`TACTICAL_RELEASE_WIP09.md`: 시작 커밋, 변경 파일, 제거·추가 필드, 기준표 통과 결과, 테스트 수, 미실행 항목(실기기 Android, 전체 FPS), "모든 수치는 게임 튜닝값"이라는 명시, 체크섬(`SHA256SUMS_WIP09.txt`).

## 8. 판단이 애매할 때

- 이 지시서와 아카이브 원칙이 충돌하면 **아카이브 원칙이 우선**한다. 충돌 내용을 릴리스 문서에 적고 구현을 멈추지 말고 보수적으로 처리한다.
- 지형, LOS, 관측 확률, 길찾기, 도안은 건드리지 않는다. 바꿔야 할 것 같으면 바꾸지 말고 기록만 한다.
- 수치를 "더 현실적으로" 임의 조정하지 않는다. 표의 초깃값 그대로 쓴다.
