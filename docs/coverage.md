# 노션 요구사항 반영표

원문: [SolidJS](https://app.notion.com/p/40bd7dec5e2e813080f8d54cf5968ad5), [게시판 공통 API v1](https://app.notion.com/p/3d6d7dec5e2e8139adbfd36dd506c65e). 2026-11-20에 연결 도구로 전체를 읽었다. SolidJS 페이지에는 하위 페이지·추가 번호별 체크리스트가 없고 학습 목표 7개가 있다. 사용자가 지정한 번호에 가장 가까운 단계에 6개를 원문 문구로 배치했다. 체크박스는 학습자가 직접 수행하며 기록하도록 비워 두었다.

| SolidJS 원문 항목 | 문서 | 실제 코드·검증 |
| --- | --- | --- |
| `npm create solid` 로 프로젝트 (Vite) | [study0](../study0.md) | 설치·생성 절차, Vite 설정, 고정 버전 |
| `createSignal`, `createEffect`, `createMemo` | [study3](../study3.md) | src/labs/Signals.tsx, UI 테스트 |
| 컴포넌트 함수가 한 번만 실행된다는 점 확인 (React와 가장 큰 차이) | [study2](../study2.md) | 생성 번호 유지 테스트. 원문의 괄호는 보존하고 비교 설명은 추가하지 않음 |
| `<For>`, `<Show>` 제어 흐름 컴포넌트 | [study3](../study3.md) | 실험실·목록·조건 화면 |
| `createResource` 로 게시판 API 불러오기 | [study6](../study6.md) | src/pages/Posts.tsx |
| `@solidjs/router` 로 목록·상세·작성 페이지 | [study4](../study4.md) | src/main.tsx, 브라우저 CRUD |

추가 본문 반영: 가상 DOM 없이 필요한 DOM을 갱신하는 원리, 시그널 추적, props 구조분해 함정은 study2~3에, 최소 게시판 코드의 createResource→data→For 흐름은 study6에 반영했다. 원문의 빈 정리 영역은 요청한 학습 파일·오류 노트·검증 기록으로 채울 수 있도록 구성했다.

| 공통 API v1 항목 | 반영 |
| --- | --- |
| /health, signup/login/logout/me, posts CRUD, comments 목록/등록/삭제 | 기초·심화 서버 모두 구현 |
| data/meta, page/limit/total/totalPages/q, 정렬 3종, limit 50 | posts.mjs와 계약 테스트 |
| camelCase, ISO UTC, author/commentCount, 해시 비노출 | DTO·인증·테스트 |
| 201 Location, 204 빈 본문, 400 fields, 401/403/404/409/413/429/500 | 공통 오류와 API 테스트 |
| Bearer 또는 동일 도메인 세션 | 1시간 opaque Bearer 세션, 서버 해시 저장 |
| Content-Type, X-Request-Id, CORS_ORIGIN, OpenAPI 3 | 헤더·Origin·/api-docs JSON |

공통 API 페이지의 다른 프레임워크별 수정표는 이 SolidJS 과정의 구현 대상으로 가져오지 않았다. 원문의 `/api/posts`를 유지하며 계약 버전 v1을 임의로 경로 /api/v1로 바꾸지 않았다.

[DocuForge](https://app.notion.com/p/40bd7dec5e2e818d9c91c6fb26dccc4c)와 [AI 모델 연동·MCP](https://app.notion.com/p/40bd7dec5e2e81b9b11dfe5616516df4)도 읽고 study18·final에 기능 원리로 연결했다. 원본 프로젝트의 다른 프레임워크 코드·서버와 통합하지 않았다. TXT·MD, 발췌 검색·인용·질문 이력을 제공하며 원본의 PDF/DOCX/PPTX·OCR·임베딩 구현은 이 미니 예제 범위에 포함하지 않는다.

## 체크리스트에 넣지 못한 원문 항목

- **같은 화면을 React 버전과 나란히 비교**: 사용자의 “다른 프레임워크와 비교하거나 통합하지 마”라는 명시적 조건과 충돌하여 제외했다. 다른 원문 학습 목표 누락은 없다.

## 완료를 표시할 때 주의할 항목

문서 작성·코드 구현·로컬 검증·실제 외부 계정 검증·원격 push·배포를 별도로 기록한다. 계정이나 배포 대상이 없는 외부 작업을 완료했다고 표시하지 않는다. 상세 현황은 [검증 기록](verification.md)을 따른다.
