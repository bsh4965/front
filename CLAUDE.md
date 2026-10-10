# CLAUDE.md (front)

DecisionFlow 프런트엔드 작업 규칙. 공통 규칙과 설계는 `../server/decisionflow/docs/CLAUDE.md`, `../server/decisionflow/docs/DESIGN.md`가 기준이다. 충돌하면 그쪽을 따른다.

- 사용자에게 보이는 글과 답변은 한국어로 쓴다.
- **Claude는 `git commit`, `git push`를 실행하지 않는다.** 커밋 메시지 초안만 제안한다.
- 사용자가 직접 실행할 SQL은 파일로 만들지 않고 채팅에 준다.

## 기술

React 19 + Vite 8 + TypeScript 5.9, Tailwind 4, TanStack Query 5, react-router 7, vite-plugin-pwa, d3-hierarchy·d3-zoom(마인드맵). 새 의존성은 사용자 승인 후 추가한다. 버전은 정확한 값으로 고정한다.

## 인증·API (어기지 않는다)

- access token은 `src/api/client.ts`의 메모리 변수에만 둔다. localStorage·sessionStorage·IndexedDB·쿠키에 저장하지 않는다.
- refresh token은 HttpOnly 쿠키라 JS로 다루지 않는다. 앱을 열면 `refreshSession()`으로 세션을 복구한다.
- refresh는 single-flight다. `TOKEN_EXPIRED`면 refresh 후 원래 요청을 한 번만 다시 보낸다.
- API는 항상 상대 경로 `/api/...`로 부른다. API 주소를 코드에 넣지 않는다(로컬은 Vite proxy, 운영은 Vercel rewrites).
- 서버 응답은 `{ success, code, message, data }`다. 실패 메시지는 서버의 `message`를 그대로 보여 준다.
- 변경 요청에는 마지막으로 받은 `version`을 보낸다. 409 `CONCURRENT_MODIFICATION`이면 데이터를 다시 읽는다(`useAction`).

## 화면 규칙

- 큐는 서버가 준 순서를 그대로 보여 준다. 화면에서 다시 정렬하지 않는다(우선순위로 묶는 것만 한다).
- iPhone 기준: `viewport-fit=cover`, 노치 여백(`pt-safe`, `pb-safe`, `px-safe`), 높이 `100dvh`, 터치 타깃 44px 이상, 입력 글자 16px 이상, 아래 탭 바.
- 색은 `src/index.css`의 토큰(`bg-surface`, `text-muted`, `text-p0` 등)만 쓴다. 라이트·다크 모두 맞춘다.
- 서버 데이터는 TanStack Query로 다루고 쿼리 키는 `hooks/queries.ts`의 `keys`에만 둔다.
- 실제 iPhone·iOS 시뮬레이터에서 확인하지 않았다면 그렇다고 보고한다.

## 확인

```bash
npm run typecheck
npm run build
```
