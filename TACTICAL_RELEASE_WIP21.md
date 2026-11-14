# TACTICAL v0.4 WIP21 릴리스·검증

2026-11-14 기준 WIP21은 최신 main `be32d23ad4b95bc34aca95c793b0e3bbe7b81717`에서 만든 `feat/wip21-t80u-model-armor` 검토 브랜치에 구현했다. 수정 T-80U 도안, `T80U_1989` 피격 전용 프로파일, 고정 Kontakt-5 확률 피복과 배포 HTML의 방호시험 시나리오를 연결했다. main 병합과 공개 릴리스는 별도 검토 전에는 수행하지 않는다.

## 구현 결과

- 차량 레지스트리에 표적/기동/관측/사격/AI 능력을 분리했다. 기존 M1A2 운용 차량의 엄격한 검증은 유지하면서 T-80U는 HP·장갑·표적 제시·모델만 갖는 고정 피격 차량으로 생성한다.
- `T80U_1989`은 1,400 HP, 7개 구역의 독립 KE/CE 기본 방호와 Kontakt-5 KE +215/CE +560, 전면·측면·후면·상부별 0~95% 피복률을 소유한다. M1A2와 다른 프로파일에는 상속하지 않는다.
- 기존 명중·구역·도탄 뒤 사건당 한 번 `roll < coverage`를 판정한다. 피복 성공 때만 종류별 추가 방호를 한 번 더하며 소모·폭발·추가 피해는 없다. 결정적 ERA 난수는 기존 판정 키와 분리하고 공개 사건/접촉에는 roll과 실제 방호를 싣지 않는다.
- 공격탄 ID는 발사 사건에서만 받는다. M829A2의 기존 근접 비관통 규칙은 공격탄 데이터가 소유하고, M829A1/M830의 기존 관통·피해·도탄 정책은 바꾸지 않았다.
- 수정 `t80u-topview.js`를 다시 그리지 않고 게임 어댑터가 월드 절대 라디안을 원본의 부모 상대 도 단위로 바꾼다. 균일 축척, 차체 원점, 포탑 피벗·포구와 독립 차체/포탑/큐폴라 자세를 유지한다.
- 미식별 실제 외곽 실루엣, 식별 정상 도안, 고정 기억, T-80U 잔해와 차량별 충돌 반경을 연결했다. 접촉/기억은 도안·마지막 자세를 보존하지만 프로파일 ID와 ERA 내부를 공개하지 않는다.
- 배포 HTML의 `기본 전투 / T-80U 방호시험` 선택으로 고정 T-80U 세 대를 시험한다. 이동·임무·관측 장비·AI·직접/자동 사격은 무소비로 거절되고, M1A2의 관측·지정·실제 3종 탄 발사·HP·격파·잔해에는 정상 참여한다.
- 전환/reset은 Worker 세대, 접촉·선택·명령, AI, 탄·효과와 HP를 함께 초기화한다. 기본 전투는 기존 M1A2(1998) 5대 구성과 관측 비용을 유지한다.
- 차량/탄약 JSON과 schema v10 레지스트리, 빌드 스크립트/페이지 순서, 단일 HTML, 재현 가능한 ZIP, 구현·작업/아카이브 문서와 실제 브라우저 증거를 갱신했다.

세부 좌표 계약과 판정 순서는 [구현 문서](docs/T80U_MODEL_AND_ARMOR_WIP21.md)에 있다. 장갑·ERA·HP와 모든 확률은 게임 시험값이며 실제 장갑판 두께·방호 성능 검증이 아니다.

## 검증

- 비브라우저 전체 Node 회귀: **360/360 통과**.
- WIP21 전용 코어: **8/8 통과**. 프로파일/잘못된 설정, 7구역 KE/CE와 K5 비상속, 0/1/등가 피복 경계, 명중·도탄·빗나감, 결정성·중복·공개 경계, 도안 좌표, 고정 표적 명령 거절, 관측/기억/잔해·충돌을 확인했다.
- 실제 Chromium 156 브라우저 회귀: **77/77 통과**. 전체 기본 앱 31개, WIP12 효과 18개, WIP15 4개, WIP16 7개, WIP17 3개, WIP18 5개, WIP19 5개, WIP20 3개와 WIP21 시나리오 1개를 각각 새 프로세스로 실행했다.
- WIP21 실제 브라우저에서는 미식별 실루엣→식별 T-80U, 독립 자세/포구, 명령 경계, M829A2→M829A1→M830 실제 발사·비행·착탄·피해, 후속 정상 장전/사격에 의한 HP 0·단일 T-80U 잔해, reset/기본 전환 격리를 확인했다. 공개 combat에는 ERA 방호/roll이 없고 첫 세 탄 뒤 `U03`은 1,400에서 약 964.73 HP였다.
- Chromium 1440×900, 모바일 가로 844×390 DPR1/2, 세로 390×844 DPR2의 캔버스·선택기·가로 넘침 0·방향 차단을 캡처했다. 실제 휴대폰은 연결되지 않았다.
- Python 지형 판독성 **7/7**, `/usr/bin/python3`의 DEM 범위/마스크/0m/CRS **4/4**, 원본 자료 품질 **7/7 통과**.
- 독립 지도 **16/16**, fake DOM 입력 **42/42**, 시야 **12/12**, 차량/내장 Worker **9/9 통과**. 이들 독립 스크립트의 역사적 출력 버전 문자열은 WIP20이지만 현재 WIP21 소스와 빌드를 실제로 로드했다.
- 독립 최적화 LOS worker가 새 프로세스에서 현재 MapSpec을 직접 로드해 `/tmp/wip21-los.json` 3,570,321바이트를 정상 생성했다.
- 수정 JS·테스트·벤치마크와 Python 빌드/패키지 구문 검사를 통과했다. 내보내기·빌드·패키지를 각각 두 번 실행해 바이트 동일성, ZIP 단일 항목·CRC와 압축 해제 결과를 확인했다.

실행 명령은 다음과 같다.

```text
node --test $(rg --files tests | rg '\.test\.cjs$' | rg -v 'browser' | sort)
node tests/browser.test.cjs
node tests/wip12-effects-browser.test.cjs
node tests/wip15-browser.test.cjs
node tests/wip16-browser.test.cjs
node tests/wip17-browser.test.cjs
node tests/wip18-browser.test.cjs
node tests/wip19-browser.test.cjs
node tests/wip20-browser.test.cjs
node tests/wip21-browser.test.cjs
python3 -m unittest tests.terrain_readability_test
/usr/bin/python3 -m unittest tests.battlefield_dem_validation_test
/usr/bin/python3 tests/source_quality.py
node tests/input.test.cjs
node tests/map.test.cjs
node tests/visibility.test.cjs
node tests/vehicle.test.cjs
node scripts/benchmark_los_shared_compare.cjs --worker optimized /tmp/wip21-los.json
node scripts/benchmark_wip21.cjs --scenario default
node scripts/benchmark_wip21.cjs --scenario t80u-armor
```

기계 판독 결과는 [WIP21-validation.json](tests/releases/WIP21-validation.json), [브라우저 증거](tests/releases/WIP21-browser-evidence.json), [기준 성능](tests/releases/WIP21-performance-baseline.json), [기본 성능](tests/releases/WIP21-performance-default.json), [방호시험 성능](tests/releases/WIP21-performance-armor.json)에 있다.

## 성능

Node 24.22.1 / AMD EPYC 9V74 환경에서 seed 7, 100회 예열 뒤 800개 0.05초 스텝을 측정했다.

| 장면 | 코어 중앙값 / P95 | 관측 query / ray | Chromium 180프레임 중앙값 / P95 |
|---|---:|---:|---:|
| main `be32d23` 기본 | 0.3040 / 0.9476ms | 2,250 / 27,537 | 16.7 / 16.7ms |
| WIP21 기본 | 0.2918 / 0.9309ms | 2,250 / 27,537 | 16.7 / 16.8ms |
| WIP21 방호시험 | 0.0841 / 0.8869ms | 450 / 2,106 | 16.7 / 16.7ms |

기본 전투의 candidates/samples 3,682와 rayCacheHits 5,601도 기준과 같았다. 세 장면 모두 일시정지 뒤 60개 렌더 프레임에서 관측 통계가 변하지 않았다. 20,000개 착탄 배치는 별도 측정했으며 ERA는 착탄당 상수 크기 처리다. 짧은 단일 프로세스의 headless 측정이라 전체 FPS나 물리 모바일 지속 성능을 보장하지 않는다.

## 배포물

| 파일 | 바이트 | SHA-256 |
|---|---:|---|
| `dist/index.html` | 8,537,604 | `f3c6ac7bb4fe1cae516d1784f86cdfdd9308463f2b16046b89c1c2b60afa005b` |
| `Tactical_v0.4_WIP21.html` | 8,537,604 | `f3c6ac7bb4fe1cae516d1784f86cdfdd9308463f2b16046b89c1c2b60afa005b` |
| `Tactical_v0.4_WIP21.zip` | 1,692,841 | `234ac77ac92e80857e85ce7f69d25d7dc4d3ce43887d72874a9b87b65aefc733` |

ZIP에는 `Tactical_v0.4_WIP21.html` 한 항목만 있다. 압축 전 8,537,604바이트, 압축 데이터 1,692,695바이트, CRC-32 `7f213c80`이며 압축 해제 바이트는 `dist/index.html`과 같다. 체크섬 파일은 `SHA256SUMS_WIP21.txt`다.

## 명시적 제외

T-80U 기동·관측 장비·AI·125mm 무장·자동장전, 승무원·장비·탄약고 피해, ERA 블록 소모·폭발·파편·추가 도탄, 실제 블록 좌표 충돌, 새 상부 공격 무기와 장갑/차량 편집 UI는 포함하지 않았다. 물리 휴대폰 장시간 메모리·발열·지속 프레임률도 실행하지 않았다.
