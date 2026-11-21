# TACTICAL — 아카이브

> **현행 제원은 [정식 라이브러리](library/README.md)에서 찾는다.** 구형 이력보다 [정본 책임 규칙](library/CANONICAL_RULES.md)과 최신 사용자 결정을 우선한다.

## 바로 찾기

| 자료 | 위치 |
|---|---|
| 1989 전차 32종·HP | [전차 색인](library/vehicles/tanks/1989/README.md) |
| 기타 차량·현대 전차·헬기·자주대공포 | [차량 카탈로그](library/vehicles/README.md) |
| 전차포탄·대공탄·미사일 | [탄약 카탈로그](library/ammunition/README.md) |
| 1989 전차 96개 적재 | [프리셋](library/presets/1989/README.md) · [JSON](library/presets/1989/TANK_LOADOUTS_96.json) |
| ERA·APS·레이더·피해·장전 | [시스템 카탈로그](library/systems/README.md) |
| 보병·세계관 | [유닛](library/units/README.md) · [세계관](library/world/README.md) |
| 과거 작업·WIP·미채택 제안 | [이력 자료실](library/history/README.md) |

## 구형 자료·복구

- **1단계:** 구형 안내·쉴카 준비표 2개 제거. [정리 시작 전 백업](https://github.com/0-FLANDRE-0/Tactical_Project/tree/archive-cleanup-baseline-2026-11-21).
- **2단계:** 중복 수치가 섞인 구형 [전차](tanks/README.md)·[탄약](ammo/README.md) 거대 문서를 정본 안내 페이지로 축소. [2단계 이전 원본 백업](https://github.com/0-FLANDRE-0/Tactical_Project/tree/archive-cleanup-stage2-baseline-2026-11-21) · [이관 검증](library/migration/STAGE5_FINAL_VALIDATION_2026-11-19.md).
- **3단계:** WIP 작업지시서 목차는 [`instructions/README.md`](instructions/README.md) 한 곳으로 통합. 중복 진행표 제거, 과거 원문은 [3단계 백업](https://github.com/0-FLANDRE-0/Tactical_Project/tree/archive-cleanup-stage3-baseline-2026-11-21)에 보존.
- **4단계:** 오래된 [진행 기록](NEXT_STEPS_2026-11-07.md)·[장갑 세부면 아이디어](tanks/ARMOR_SUBZONES_AND_PROBABILITY_IDEAS_2026-11-07.md)의 라이브러리 내 중복 사본 2개 삭제. [4단계 백업](https://github.com/0-FLANDRE-0/Tactical_Project/tree/archive-cleanup-stage4-baseline-2026-11-21).
- **5단계 최종 감사:** [5단계 이전 백업](https://github.com/0-FLANDRE-0/Tactical_Project/tree/archive-cleanup-stage5-baseline-2026-11-21). 아카이브 Markdown 149개에서 Markdown 링크 **1,448건(수정 전)**을 정적 검사하고, **실제 파일 경로 오류 32곳과 구형 통합 문서의 사라진 절 연결 5곳을 수정**했다. 수정 문서 17개의 상대 링크 176개를 재검사해 오류 0. **1989 프리셋 32종×3종=96건**, 중복 및 적재 합계 오류 0. 롤란드 2·3, T-14M 요약·차량·APS 주요 수치도 표본 대조했다.
- **보류:** 구형 HTML 7개·ZIP 1개는 서로 다른 Git Blob이지만 **내용이 중복인지 완전히 비교하지 않았으므로 보존**한다. 원래 이관 manifest/진행 기록에 적힌 날짜·경로·'정본 전환 전' 표기는 **작성 시점 이력**이며 현재 파일 목록이나 코드 검증 상태가 아니다. 이번 링크 검사는 Markdown 링크 대상의 파일 존재 확인 중심이며, 외부 웹사이트의 생존 여부·모든 절 앵커·실제 실행 동작까지 전수 검증한 것은 아니다.
- [과거 WIP 지시서](instructions/README.md) · [예전 Bradley/TOW 계획](vehicles/USAREUR_IFV_CFV_ROSTER_PLAN_2026-11-12.md)은 원본 보존 자료이며 현행 제원이 아니다.

**주의:** 확정/잠정/미정/과거 기록, 코드 구현 여부와 1989/후속/현대 시대를 섞지 않는다.
