# TACTICAL v0.4 WIP24 릴리스

작업 브랜치는 `feat/wip24-armor-sync-era-depletion`, 비교 기준 main은 `907e2cc`다. 최신 라이브러리에 맞춰 Kontakt-5 추가 방호를 전 장착 구역에 KE +120 / CE +460으로 통일하고, M829A2의 추가 KE 감쇄율을 38.5%로 갱신했다. Kontakt-1/5 소모, M829A1의 관통 노드, M829A1/A2의 거리별 탄속도 반영했다. [구현과 정본](docs/ARMOR_SYNC_AND_ERA_DEPLETION_WIP24.md)

ZIP을 풀고 단일 HTML을 연 뒤 **T-80U 정지 교전시험**을 선택한다. 검증 seed 8의 첫 피복 명중은 6.35초에 피복률을 95%에서 80%로 줄이며 337.40 HP를 입혔다. 12.35초의 같은 구역 빈 지점 명중은 434.94 HP 피해를 줬다. 아군 ERA 차량을 선택하면 우측 HP 아래에 구역별 잔량이 표시된다. [ZIP 다운로드](Tactical_v0.4_WIP24.zip?raw=1) · [실제 Chromium 증거](tests/releases/WIP24-browser-evidence.json)

HTML과 `dist/index.html`은 8,553,725바이트로 동일하다. ZIP은 1,698,057바이트이고 내부 HTML CRC-32는 `168c38c8`이다. [SHA-256](SHA256SUMS_WIP24.txt)

명령별 결과와 구현 커밋은 검증 JSON에 기록했다. 네 시나리오의 90초 기준 비교, 틱·렌더 시간, 관측 질의, 착탄 및 생존 수는 성능 JSON에 있다. 씬을 렌더한 Chromium 환경은 1440×900 데스크톱과 모바일 가상 뷰포트를 사용했다. [검증 기록](tests/releases/WIP24-validation.json) · [성능 비교](tests/releases/WIP24-performance.json)

네 시나리오에서 두 빌드 중 더 이른 첫 착탄 전까지의 궤적과 사격 보류 상태가 일치했다. 정지 교전시험 seed 7의 첫 M829A2 착탄은 6.50초에서 6.45초로 앞당겨졌다. T-80U가 24.45초에 격파되면서 90초 동안의 전체 착탄은 24건에서 7건으로 줄었다.

새 탄속 표가 적용되면 같은 발사도 다른 고정 틱에 착탄할 수 있다. WIP12 지연 프레임 검사는 실제 예약 시각을 기준으로 착탄을 가로지르고, WIP22 잔해 검사에서는 전차장과 포탑 방위가 벌어진 시점에 발사한다. [검증 기록](tests/releases/WIP24-validation.json)
