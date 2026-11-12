# English Daily

업무·면접 영어를 위한 개인용 학습 사이트. 아침에는 단어, 밤에는 회화.

- **아침 단어** (`morning/`): 하루 40단어(실전 회화 20 + 금융 20), 50일 과정. 카드 → 퀴즈 → 복습(Leitner 1/2/4/7일) → 듣기 모드.
- **밤 회화** (`night/night-english.html`): claude.ai 아티팩트로 돌아가는 10분 회화. 사용자 Claude 구독 한도를 쓰고, 호출을 줄인 토큰 절약판이다. 주소는 `config.js`의 `NIGHT_URL`.

빌드 단계 없는 정적 파일(vanilla HTML/CSS/JS, ES modules)이고, API 키나 서버가 없다.

## 구조

```
index.html                 홈: 오늘 N일차, 아침/밤 버튼, 이번 주 기록
morning/index.html         아침 단어 학습
assets/css, assets/js      공통 스타일과 스크립트 (core.js = 날짜·일차·복습 스케줄 순수 함수)
data/curriculum.md         50일 커리큘럼
data/words/day-01..50.json 단어장
scripts/validate-words.mjs 단어장 검증
tests/                     단위 테스트 (node:test)
night/night-english.html   밤 회화 토큰 절약판 (claude.ai 아티팩트 소스)
reference/                 기존 밤 회화 구현 (수정하지 않음)
config.js                  NIGHT_URL
manifest.webmanifest, sw.js  PWA, 단어 데이터 오프라인 캐시
```

## 로컬 실행

```bash
python3 -m http.server 8000
```

브라우저에서 `http://localhost:8000` 을 연다. ES modules와 fetch를 쓰므로 파일을 더블클릭해서 열면 동작하지 않는다.

테스트와 단어장 검증:

```bash
npm test
```

```bash
node scripts/validate-words.mjs
```

## GitHub Pages 배포

1. 저장소 **Settings → Pages**에서 Source를 **Deploy from a branch**, Branch를 **main / (root)** 로 고른다.
2. 몇 분 뒤 `https://<계정>.github.io/<저장소>/` 에서 열린다. 휴대폰에서는 "홈 화면에 추가"로 앱처럼 쓸 수 있다.
3. 파일을 고친 뒤에는 `sw.js`의 `VERSION`을 올려야 휴대폰 캐시가 확실히 바뀐다.

## 진도 백업

진도, 복습 큐, 기록은 브라우저 localStorage에만 저장된다. 아침 단어 → **설정 → 진도 백업**에서

- **내보내기**: JSON 파일로 저장한다.
- **가져오기**: 저장한 JSON을 불러와 현재 진도를 덮어쓴다.

휴대폰을 바꾸거나 브라우저 데이터를 지우기 전에 내보내 두자. 같은 화면에서 일차와 시작일도 바꿀 수 있다.

밤 회화 기록과 주간 Claude 호출 수는 아티팩트 쪽 브라우저 저장소에 있어서 밤 회화 첫 화면에 표시된다.

## 커리큘럼 수정

`data/curriculum.md`에서 `N. talk: ... · fin: ...` 줄을 고친다. 홈과 아침 화면은 이 줄을 그대로 주제로 보여 준다. 줄 형식(`숫자. 내용`)만 지키면 된다.

## 단어 추가·수정

`data/words/day-NN.json`의 `words` 배열을 고친다. 항목 형식:

```json
{ "word": "covenant", "pos": "n", "ko": "재무 약정", "ex": "The loan has a leverage covenant.", "set": "fin", "note": "선택" }
```

- `pos`: `n`, `v`, `adj`, `adv`, `phrv`(구동사), `phrase`
- `set`: `talk` 또는 `fin`, 하루에 각각 20개
- 뜻·예문이 확실하지 않으면 `"review": true`
- 예문(`ex`)에 표제어가 그대로 들어 있으면 빈칸 퀴즈에도 나온다.

고친 뒤에는 반드시 검증한다. 일차별 개수, 필수 필드, 50일 전체의 표제어 중복, `review` 개수를 확인하고 문제만 출력한다.

```bash
node scripts/validate-words.mjs
```

## 밤 회화 다시 게시

`night/night-english.html`을 고친 뒤 claude.ai 채팅이나 Claude Code에서 "이 파일을 NIGHT_URL 아티팩트에 다시 게시해 줘"라고 요청한다. 페이지가 쓰는 기능(sample, tts, dictation) 선언은 그대로 유지된다.
