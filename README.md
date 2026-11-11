# Daily Report — Super Productivity 플러그인

체크(완료)한 **날짜 기준**으로 태스크·서브태스크를 월간 캘린더에 보여 주는 Super Productivity 플러그인입니다.
기본 History 화면처럼 기록 시간이 아니라 "그날 무엇을 끝냈는지"를 봅니다.

- 대상 앱: Super Productivity **v20.0.0 이상** (데스크톱에서 확인)
- 저장소: https://github.com/riverandeye/super-productivity-daily-report
- 설치 파일: [`release/daily-report-1.0.0.zip`](release/daily-report-1.0.0.zip)

## 기능

- **월간 캘린더**: 날짜 칸마다 그날 완료한 태스크·서브태스크 수를 표시합니다.
  - 칸 배경은 그날 가장 많이 한 프로젝트의 색이고, 이번 달에서 많이 한 날일수록 진해집니다(4단계, 그 달의 최다일 기준).
  - 칸 아래쪽 막대와 점은 프로젝트별 비율·개수입니다.
  - `‹` / `›` 버튼(또는 ← / → 키)으로 이전·다음 달, `오늘` 버튼으로 오늘로 이동합니다.
  - 위쪽에 이번 달 완료 개수와 활동한 날 수를 보여 줍니다.
- **날짜 클릭 → 그날 완료 목록**: 완료 시각 순으로 `프로젝트 › 상위 태스크 › 서브태스크` 경로와 체크한 시각을 보여 줍니다.
  예: `영어 공부 › 리딩 교재 끝내기 › Unit 2 · Inference`
- **프로젝트 필터**: 위쪽 칩을 눌러 프로젝트를 켜고 끕니다(여러 개 선택 가능). `전체`를 누르면 필터가 풀립니다. 칩 옆 숫자는 전체 기간의 완료 수입니다.
- **여는 방법**
  - 왼쪽 메뉴의 플러그인 항목 **Daily Report**(앱이 자동으로 추가)
  - 상단 헤더의 캘린더 아이콘 버튼
  - 키보드 단축키: Settings → Keyboard Shortcuts의 Plugin Shortcuts에서 "Daily Report 열기"에 원하는 키를 지정
- **자동 갱신**: 태스크 완료·수정·삭제, 프로젝트 변경, 동기화(`dataChanged` 훅), 날짜 변경 시 다시 그립니다.

## 설치

1. 앱에서 **Settings → Plugins → Install Plugin**(버전에 따라 "Choose Plugin File"/"Upload Plugin")을 누릅니다.
2. `release/daily-report-1.0.0.zip`을 고릅니다. 신뢰 경고가 나오면 확인합니다.
3. 플러그인 목록에서 **Daily Report**가 켜져 있는지 확인한 뒤 메뉴나 헤더 버튼으로 엽니다.

같은 `id`(`daily-report`)로 다시 올리면 기존 플러그인을 교체합니다.

## 데이터 기준

- `PluginAPI.getTasks()`(현재 태스크)와 `getArchivedTasks()`(보관된 태스크)를 합쳐서 씁니다. 같은 태스크가 양쪽에 있으면 현재 쪽을 씁니다.
- `isDone`이 `true`이고 `doneOn`(완료 시각, ms)이 있는 항목만 셉니다. **"하지 않음(won't do)"으로 닫은 항목은 제외**합니다.
- `doneOn`을 로컬 날짜로 바꿔 날짜를 정합니다. 앱 설정에서 "다음 날 시작 시각"을 바꿨다면(예: 새벽 4시) 그 오프셋을 반영해, 새벽 1시에 체크한 것은 전날로 셉니다(`getDayContext()`가 있는 버전).
- 상위 태스크와 서브태스크를 **각각 1개로** 셉니다. 서브태스크를 다 끝내서 상위 태스크도 완료되면 둘 다 그날에 나옵니다.
- 프로젝트 이름·색은 `getAllProjects()`의 `title`, `theme.primary`를 씁니다. 프로젝트가 없는 태스크는 "프로젝트 없음", 삭제된 프로젝트의 보관 태스크는 "(삭제된 프로젝트)"로 나옵니다.
- 이 플러그인은 데이터를 읽기만 하고, 어떤 데이터도 바꾸거나 외부로 보내지 않습니다.

## 한계

- **체크를 풀면 `doneOn`이 지워지고, 다시 체크하면 그 시점의 날짜로 바뀝니다.** 앱이 완료 이력을 따로 남기지 않기 때문에, 예전에 끝낸 항목을 실수로 풀었다가 다시 체크하면 캘린더에서 오늘로 옮겨집니다.
- 태스크를 삭제하면 캘린더에서도 사라집니다(보관/아카이브는 남습니다).
- 반복 태스크는 각 회차가 별도 태스크이므로 회차마다 셉니다.
- 주는 일요일부터 시작합니다.

## 라이선스

MIT — [LICENSE](LICENSE)

## 개발

의존성 없이 Node.js(18+)와 시스템 `zip` 명령만 씁니다.

```bash
npm test        # src/lib.js 단위 테스트 (node:test)
npm run build   # dist/ 생성 + release/daily-report-<version>.zip
```

구조:

| 파일 | 역할 |
| --- | --- |
| `src/manifest.json` | 플러그인 메타데이터 (`iFrame: true`, `minSupVersion: 20.0.0`) |
| `src/plugin.js` | 헤더 버튼·단축키 등록 (앱 렌더러에서 실행) |
| `src/index.html` | 캘린더 UI (iframe). 빌드 때 `lib.js`가 인라인됩니다 |
| `src/lib.js` | 날짜 변환·인덱스·그리드 계산 (DOM 없음, 테스트 대상) |
| `scripts/build.mjs` | 빌드·ZIP 스크립트 |

iframe 플러그인에는 ZIP의 다른 파일이 제공되지 않아서, `lib.js`를 빌드 단계에서 `index.html`에 넣습니다.
버전을 올릴 때는 `src/manifest.json`의 `version`을 바꾸고 다시 빌드하세요.
