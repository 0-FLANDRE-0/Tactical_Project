# TACTICAL 장비·전투 데이터 라이브러리 (전환 준비 중)

> **2026-11-19 상태:** 단계적 개편 **4/5단계 완료**. 현재 폴더는 **이관 작업의 진입점**이며 아직 새로운 정식 수치 데이터베이스가 아니다. **정본 데이터는 기존 [archive 목차](../README.md)의 원본 문서**에 남아 있다.

## 이관 진행

| 단계 | 작업 | 상태 |
|---|---|---|
| **1** | 정리 전 원본 브랜치 백업·전체 인벤토리 | **완료** |
| **2** | 기존 Markdown 46개 본문 감사·정본 책임·불일치/미정 분류 | **완료** |
| **3** | 차량·탄약·미사일·96개 프리셋 이관 및 검산 | **완료** |
| **4** | 공통 방호·APS·피해·보급·지도·보병·세계관·이력 분리 | **완료** |
| **5** | 링크·수치·누락 검증 후 구형 기록 안내/중복 정리 | 예정 |

## 1단계 기록

- [**백업 기준점·전체 파일 목록·계획**](migration/STAGE1_BASELINE_AND_INVENTORY_2026-11-19.md)
- [**기계 판독형 원본 63개 파일 목록(JSON)**](migration/BASELINE_FILE_MANIFEST_2026-11-19.json)
- [**정리 이전 보존 브랜치**](https://github.com/0-FLANDRE-0/Tactical_Project/tree/archive-library-baseline-2026-11-19)
- **기준 커밋:** `1593dc2caab7c55af85c4df9acf748d2f2fe0706`

## 2단계 감사 및 정본 책임

- [**2단계 원본문서 감사 보고서·불일치 목록·제안 스키마**](migration/STAGE2_CANONICAL_SOURCE_AUDIT_2026-11-19.md)
- [**46개 문서 정본 책임도(JSON)**](migration/STAGE2_SOURCE_OWNERSHIP_MAP_2026-11-19.json)
- **정리 필요:** 탄약 §11의 NATO 10/11 표제 오기, TOW 2B의 오래된 절 앵커, 과거 모듈 영구 손상 구상, WIP 지시서와 최신 구현 상태의 시점 차이
- **경계:** 제안된 새 파일 경로들은 아직 존재하지 않으며, `tanks/README.md`, `ammo/README.md`, `vehicles/` 등의 **기존 문서가 계속 정본**임

## 3단계 — 실제 제원 라이브러리 이관 완료

- [**차량 제원 카탈로그**](vehicles/README.md): 1989 전차 32종, 후속 M1A2 2종, 현대 Leopard 2A8, IFV/APC/정찰차/공격헬기
- [**탄약·미사일 카탈로그**](ammunition/README.md): 국가·구경별 전차포, 현대 날탄 Anti-ERA, TOW·MILAN·Hellfire·소련 미사일 등
- [**1989년 전차 96개 프리셋 (셀 단위 검산 완료)**](presets/1989/README.md) · [정형 JSON](presets/1989/TANK_LOADOUTS_96.json)
- [**3단계 이관·검증 보고서**](migration/STAGE3_MIGRATION_VERIFICATION_2026-11-19.md) · [새 파일 36개 전체 SHA manifest](migration/STAGE3_LIBRARY_MANIFEST_2026-11-19.json)

> **정본 전환 전:** 이관 후보 문서 **36개 생성**. 기존 원본 63개 파일은 삭제하지 않았고 데이터/게임 코드 수정 없음. **공통 시스템·보급·역사 기록 정규화는 4단계**, 링크·전체 수치 최종 감사와 구형 원본 정리는 5단계. 지금은 기존 정본과 신규 이관본을 병행한다.

## 4단계 — 공통 시스템·이력 라이브러리 구축

- [**전투·방호·APS·보급·지도 시스템 색인**](systems/README.md): ERA 피복률 소모, 증가장갑 독립 HP, 현대 Anti-ERA, Trophy HV, APFSDS 공통 피해곡선, HEP/HE-FRAG, 기관포·모듈·잔해·장전·항공/LOS
- [**보병 및 개별 유닛**](units/README.md) · [**1989 대체역사 세계관 원안**](world/README.md)
- [**WIP/구형 통합본/장갑 미채택 아이디어 이력 자료실**](history/README.md) · [헬기 4종 색인](indexes/AIRCRAFT_1989.md)
- [**4단계 검증 보고서**](migration/STAGE4_SYSTEM_HISTORY_AUDIT_2026-11-19.md) · [**신규 28개 파일 Git SHA/원본 계보**](migration/STAGE4_SYSTEM_HISTORY_MANIFEST_2026-11-19.json)

> **4단계 완료 범위:** 신규 28개 시스템·자료실 파일 생성, 3단계 36개 이관 파일 SHA 불변, 원본 63개 삭제 없음, 신규 내부 파일 링크 **237개 대상 파일 존재 검사 통과**. 아직 GitHub 제목 앵커·모든 외부 URL·모든 수치의 전역 재검산은 5단계에서 실행. 기존 정본·게임 코드는 유지.

## 남은 정리 방향 (5단계)

| 라이브러리 범주 | 향후 담당 데이터 |
|---|---|
| `vehicles/` | 1989 본편·후속 시대·현대 전차, IFV/CFV/APC/정찰차, 헬기 |
| `ammunition/` | 국가·구경·시대별 포탄, 미사일, Anti-ERA 속성 |
| `systems/` | 장갑 7구역·ERA/증가장갑·APS·관통/피해·장전·명중 규칙 |
| `presets/` | 전차 32종×3=96개 적재 프리셋 및 후속 시대 별도 편성 |
| `history/` | 과거 WIP 지시서·스크린샷·시제품·폐기/이전 상태 |

**원칙:** 수치는 정본 하나, 다른 문서는 링크로 연결. 기존 확정 게임 수치와 미정 항목, 코드 구현 상태를 각각 분리. 원본의 손실 없는 대조 전에는 중복 문서·미디어를 삭제하지 않음. 정리 작업은 아카이브에만 적용하고 게임 코드/밸런스 값은 사용자 지정 없이 변경하지 않는다.
