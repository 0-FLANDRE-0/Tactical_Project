# 변경 이력·WIP·미채택 제안 자료실

> **4단계 이력 영역.** 구형 코드·HTML, 구현 지시서, 옛 제안은 **데이터베이스의 현행 확정 제원과 분리**하여 보존한다. 아래 역사 자료는 기준일 당시 상태·서술을 담은 **스냅샷**으로만 사용. 기준 백업 [`1593dc2`](https://github.com/0-FLANDRE-0/Tactical_Project/tree/archive-library-baseline-2026-11-19)에서 이전 상태 확인 가능.

## 이력 출입구

- [WIP09~22 지시서·과거 PR·당시 상태 목록](implementation/README.md) — 현재 main 구현 상태와 구별
- [2026-11-07 진행 기록·당시 미정](progress/NEXT_STEPS_2026_11_07.md) — 현재 진행도로 사용하지 않음
- [미채택 내부 장갑면 세분화 아이디어](proposals/ARMOR_SUBZONES.md) — 기본 7구역 확정값과 구별
- [구형 통합 전차·탄약 문서 폐기 안내](legacy/README.md)
- [최종 96개 프리셋 이전의 구형 대기갑 단일 편성](legacy/OLD_ANTITANK_PRESETS.md)
- [방호·관통·피해 최신 시스템 이관본](../systems/README.md)

## 원본 WIP 실행 스냅샷·도면·참조 스크립트 17개

다음 파일들은 **1단계 원본 manifest를 기준으로 보존 중인 비-Markdown 자산**이다. **지금 라이브러리에 바이트 복제하거나 코드 재빌드를 수행한 것이 아니라 기존 Git 파일로 연결**한다. 수치의 현행 정본/실제 게임 작동 결과라고 단정하지 않는다.

| 원본 파일 | 원본 크기 | 원본 Blob SHA 앞 12자리 |
|---|---:|---|
| [`art/abrams-topview.js`](https://github.com/0-FLANDRE-0/Tactical_Project/blob/main/archive/art/abrams-topview.js) | 24.4 KiB | `a87cfbd3ba67` |
| [`art/M1_Abrams_TopView.html`](https://github.com/0-FLANDRE-0/Tactical_Project/blob/main/archive/art/M1_Abrams_TopView.html) | 52.0 KiB | `06a99a015fbb` |
| [`art/ring_overlay_7916.png`](https://github.com/0-FLANDRE-0/Tactical_Project/blob/main/archive/art/ring_overlay_7916.png) | 533.8 KiB | `e7cf85812851` |
| [`art/viewer.template.html`](https://github.com/0-FLANDRE-0/Tactical_Project/blob/main/archive/art/viewer.template.html) | 27.7 KiB | `3e99a1aecd18` |
| [`instructions/wip09_hit_reference.py`](https://github.com/0-FLANDRE-0/Tactical_Project/blob/main/archive/instructions/wip09_hit_reference.py) | 3.6 KiB | `aeb3f31cd999` |
| [`instructions/wip10_hit_reference.py`](https://github.com/0-FLANDRE-0/Tactical_Project/blob/main/archive/instructions/wip10_hit_reference.py) | 4.7 KiB | `2b098f381f68` |
| [`M1A2_before_proportion_fix.svg`](https://github.com/0-FLANDRE-0/Tactical_Project/blob/main/archive/M1A2_before_proportion_fix.svg) | 32.5 KiB | `c74e1c4cb129` |
| [`M1A2_WIP04_top_view.svg`](https://github.com/0-FLANDRE-0/Tactical_Project/blob/main/archive/M1A2_WIP04_top_view.svg) | 31.1 KiB | `e3b8e11ee2f6` |
| [`Tactical_v0.4_WIP01_source_and_backup.zip`](https://github.com/0-FLANDRE-0/Tactical_Project/blob/main/archive/Tactical_v0.4_WIP01_source_and_backup.zip) | 93.1 KiB | `34499961ad7f` |
| [`Tactical_v0.4_WIP01.html`](https://github.com/0-FLANDRE-0/Tactical_Project/blob/main/archive/Tactical_v0.4_WIP01.html) | 60.7 KiB | `fa9a2d6fc754` |
| [`Tactical_v0.4_WIP02.html`](https://github.com/0-FLANDRE-0/Tactical_Project/blob/main/archive/Tactical_v0.4_WIP02.html) | 7503.7 KiB | `ab4e702c9250` |
| [`Tactical_v0.4_WIP03.html`](https://github.com/0-FLANDRE-0/Tactical_Project/blob/main/archive/Tactical_v0.4_WIP03.html) | 7985.6 KiB | `823eac8df97d` |
| [`Tactical_v0.4_WIP04.html`](https://github.com/0-FLANDRE-0/Tactical_Project/blob/main/archive/Tactical_v0.4_WIP04.html) | 8035.3 KiB | `e201fb957750` |
| [`Tactical_v0.4_WIP06.html`](https://github.com/0-FLANDRE-0/Tactical_Project/blob/main/archive/Tactical_v0.4_WIP06.html) | 8039.3 KiB | `82c85a625e2a` |
| [`WIP02_terrain_renderer.js`](https://github.com/0-FLANDRE-0/Tactical_Project/blob/main/archive/WIP02_terrain_renderer.js) | 4.7 KiB | `10520c016679` |
| [`WIP04_initial_m1a2-art.js`](https://github.com/0-FLANDRE-0/Tactical_Project/blob/main/archive/WIP04_initial_m1a2-art.js) | 11.1 KiB | `d8613cdde044` |
| [`WIP04_m1a2-art.js`](https://github.com/0-FLANDRE-0/Tactical_Project/blob/main/archive/WIP04_m1a2-art.js) | 11.1 KiB | `2c13d906a3b3` |

**보존 원칙:** WIP HTML/JS/ZIP/SVG/PNG/Python을 단순히 과거 버전이라는 이유로 삭제하지 않는다. 현재 소스 코드와 비교는 5단계에서 별도 검토하며, 이전 대화에서 제안한 가상의 확률/스펙을 사용자 채택값으로 승격하지 않는다.
