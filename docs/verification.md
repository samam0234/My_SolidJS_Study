# 검증 기록

기준일 2026-11-20 (Asia/Seoul). 아래는 실제 실행한 결과다.

| 항목 | 상태 | 증거 |
| --- | --- | --- |
| API·권한·문서·mock 공급자·MCP·스트림·복원 | 통과 | npm test 18개, 실패·skip 0 |
| Solid UI | 통과 | npm run test:ui 3개 |
| TypeScript·Vite | 통과 | npm run build |
| 실제 브라우저 | 통과 | 기초 가입·CRUD 1개 + 심화 가입→CRUD·댓글→문서 AI→Dialog→404 1개 |
| DB 3종 native/ORM | 통과 | PostgreSQL·MariaDB·MongoDB 각각 native/ORM, 실제 HTTP 가입·로그인·등록·상세·수정·삭제 6개 |
| Docker 앱 이미지·health | 통과 | docker build, 실제 컨테이너 health=healthy, uid=1000(node), HTTP CRUD·문서 SSE [DONE] |
| 데스크톱·모바일 | 통과 | Chromium 1280×900·375×812 화면 확인, 가로 넘침 없음·pageerror 0 |
| 논리 백업·빈 DB 복원 | 통과 | 실제 SQLite export/restore 후 한글 게시글 재조회, 세션 제외, 기존 DB 덮어쓰기 거절 |
| 문서 21개·원문 목표·코드·링크 | 통과 | npm run check:docs |
| 의존성 보안 | 통과 | npm audit: 취약점 0건. Sequelize의 uuid는 CJS 호환 11.1.1로 override 후 실제 ORM 검증 |
| 로컬 Git 커밋 | 커밋에 포함되는 기록 | 새 main 저장소. 작성자 정보 미설정으로 Codex <codex@local.invalid> 명의를 사용 |
| 원격 push | 통과 | https://github.com/samam0234/My_SolidJS_Study 의 main에 d893fdde1899ac4d7160e952ea0b2b6a4348d463 푸시, 원격 브랜치 확인 |
| 외부 live 거래·실제 모델 추론 | 미실행 | 공급자 계정·키·모델이 제공되지 않아 mock·HTTP 어댑터 계약만 검증 |
| 외부 배포·GitHub Actions 실제 실행 | 미실행 | 원격 저장소·배포 호스트·Secrets 미지정 |

코드 구현과 운영 검증을 구분한다. 미실행 작업은 완료로 표시하지 않는다.

초기 실패와 수정: DB 최초 기동 전 연결 종료는 DB 준비 후 실제 재검증했다. 기존 PostgreSQL 5432 포트는 건드리지 않고 전용 15432로 분리했다. Dialog 닫기 버튼의 접근성 이름을 한국어로 명시했다. 204 JSON 파싱·잘못된 JSON 객체·SSE 패킷 경계·중단된 공급자 스트림은 회귀 테스트로 검증한다. 컨테이너 화면 점검 때 localhost/127.0.0.1을 혼용한 Origin 오류는 설정된 주소로 재접속해 확인했다.

실제 요청 결과: health 200, signup 201, login 200, post 201/200/200/204, document 201, mock SSE 200+[DONE]. DB·Docker 검증은 격리된 solidjs-study 리소스를 사용했고 기존 DB 서비스와 볼륨을 삭제하지 않았다.
