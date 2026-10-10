# DecisionFlow 프런트엔드

팀 할 일(우선순위 큐)과 의사결정 기록 앱의 화면. React + Vite + TypeScript, 설치형 PWA(iPhone 홈 화면 추가 지원).
API 서버는 `../server/decisionflow`(Spring Boot)이고, 설계와 규칙은 `../server/decisionflow/docs/`에 있다.

## 로컬에서 실행

1. API 서버를 `local` 프로필로 띄운다(포트 8080). 서버 쪽 환경변수 `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`이 필요하다.
2. 이 폴더에서:

```bash
npm install
npm run dev
```

3. 브라우저에서 http://localhost:5173 을 연다. `/api` 요청은 Vite가 localhost:8080으로 넘긴다.

### iPhone에서 시험하기

- PC와 iPhone을 같은 와이파이에 두고 `npm run dev`가 출력하는 `Network` 주소(예: `http://172.30.1.95:5173`)를 Safari로 연다.
- 서버의 refresh·logout은 Origin 허용 목록을 본다. 서버를 띄울 때 그 주소를 넣는다.

```bash
APP_ALLOWED_ORIGINS=http://localhost:5173,http://172.30.1.95:5173
```

- 로컬 프로필은 http에서도 쿠키가 저장되도록 refresh 쿠키의 Secure를 끈다. 운영은 켜져 있다.

## 명령

| 명령 | 하는 일 |
|---|---|
| `npm run dev` | 개발 서버(5173) |
| `npm run build` | 타입 검사 후 `dist/`로 빌드. PWA 서비스워커도 만든다 |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run typecheck` | 타입 검사만 |
| `npm run icons` | `public/`의 PWA·iPhone 아이콘 PNG를 다시 만든다 |

## 배포 (Vercel)

1. Vercel 프로젝트의 Root Directory를 이 폴더(`front`)로 지정한다.
2. `vercel.json`의 `REPLACE-WITH-API-DOMAIN`을 OCI API 도메인으로 바꾼다. `/api/*`는 그 도메인으로 프록시되고, 나머지 경로는 `index.html`로 간다.
3. 서버 쪽 `APP_ALLOWED_ORIGINS`에 Vercel 도메인을 넣는다.

화면과 API가 같은 오리진(Vercel 도메인)으로 보이므로 refresh 쿠키가 first-party로 동작하고 CORS 설정이 필요 없다.

## 구조

```text
src/
  api/          client.ts(토큰·refresh·요청), endpoints.ts(API 함수), types.ts(서버 DTO)
  state/        session(로그인 상태), team(지금 보는 팀)
  hooks/        queries.ts(TanStack Query 키·훅), useAction.ts(변경 + 에러 토스트)
  components/   공통 UI(ui, Sheet, toast, icons, AppShell)
  features/     tasks(큐·상세·추가·이력), tree(트리·마인드맵·노드 상세), projects
  pages/        화면 단위(로그인, 가입, 큐, 프로젝트 목록·상세, 팀, 나)
  lib/          format(날짜·라벨), tree(평탄한 노드 배열 → 트리)
```

## 아직 없는 것

- 의사결정 화면. 서버 API가 다음 단계라서 지금은 트리 배지(결정 수)만 보인다.
- 할 일 드래그 재정렬. iPhone Safari가 HTML 드래그를 지원하지 않아서 할 일 상세의 "위로/아래로"로 바꾼다.
