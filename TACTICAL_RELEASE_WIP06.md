# TACTICAL v0.4 WIP06

## 기준과 변경 범위

- 기준 소스: [main 병합 커밋 4eaedbe6dd1d7eb4f2799b3b629ac9a6aa419402](https://github.com/0-FLANDRE-0/Tactical_Project/commit/4eaedbe6dd1d7eb4f2799b3b629ac9a6aa419402).
- PR #1의 UI 갱신 정리와 PR #2의 시선 둘러보기·방향 유지·시간 만료 연출을 함께 보관하는 버전이다.
- 이 패키징에서 실행 코드의 변경은 화면 버전 문구 3곳과 개발용 버전 메타데이터 1곳의 `WIP05` → `WIP06`뿐이다. 병합본의 게임 로직·지도·차량 데이터는 변경하지 않았다.
- `Tactical_v0.4_WIP06.html`, `dist/index.html`, `archive/Tactical_v0.4_WIP06.html`은 모두 동일한 8,232,258바이트다. 기존 archive 파일은 그대로 유지했다. 병합본을 과거 WIP05 원본이라는 이름으로 다시 만들지 않았다.
- HTML SHA-256: `b091f0455051677aab416e551edd5532cf1d0ab6674559814ff122e2aaa214a6`.
- 버전 HTML은 고정 스냅샷이다. 일반 `python3 build.py`는 `dist/index.html`만 갱신한다.

## 이번 버전에서 실행한 검사

2026-11-06, Node v24.22.1 / Python 3.12.14 / Linux x64.

| 명령 | 결과 |
|---|---|
| `node scripts/export_vehicle_profile.cjs` | 성공, 생성된 차량 데이터·도안이 기준 소스와 동일 |
| `python3 build.py` | 성공, 재빌드한 HTML이 배포 스냅샷과 동일 |
| `node --test tests/look-animation.test.cjs tests/ui-cache.test.cjs` | 26/26 통과 |
| `node tests/input.test.cjs` | 30/30 통과 |
| `node tests/map.test.cjs` | 16/16 통과 |
| `node tests/visibility.test.cjs` | 12/12 통과 |
| `node tests/vehicle.test.cjs` | 9/9 통과 |
| 실행에 사용한 JavaScript 소스·스크립트·검사 파일 21개의 `node --check` | 통과 |

총 **93/93 통과**. 기계 판독용 요약은 `tests/releases/WIP06-validation.json`에 있다. 일부 기존 검사 스크립트의 출력에는 예전 `0.4-WIP05` 라벨이 하드코딩되어 있으나, 위 결과는 이번 WIP06 빌드에 대해 다시 실행한 결과다. 기존 결과 JSON을 새 버전 결과인 것처럼 덮어쓰지 않았다.

HTML의 모든 실행 코드·데이터는 기준 병합본과 비교하여 버전 문자열 4곳 이외에 바이트 차이가 없음을 확인했다. 루트·dist·archive 사본의 SHA-256 일치와 반복 빌드의 재현성도 확인했다.

## 실행과 검증 한계

HTML 한 파일을 내려받아 브라우저에서 연다. 실행 데이터와 코드가 포함되어 있으며 별도 서버나 외부 라이브러리가 필요하지 않다. 모바일에서는 가로 화면을 권장한다.

- 이번 패키징에서 실제 브라우저 시각 검사, 모바일 viewport 검사, 실제 휴대폰 검사는 실행하지 않았다. 입력 검사는 가짜 DOM·렌더러를 사용하므로 실제 렌더링이나 터치 품질을 증명하지 않는다.
- 기존 WIP04/WIP05의 Chromium·모바일 viewport 기록은 역사적 결과다. 새 시선 연출 UI의 현재 브라우저 검증을 뜻하지 않는다.
- 멀티터치, 메모리·발열, 지속 프레임률, 전체화면·방향 고정은 실기기 검증이 필요하다.
- 원본 데이터/GDAL 대조 7개와 성능 벤치마크는 이번 패키징에서 재실행하지 않았다. 기존 UI 합성 벤치마크 수치는 게임 전체 FPS가 아니다.
- 이번 작업은 저장소 버전 보관·다운로드 파일 정리다. 사이트 배포는 수행하지 않았다.
