# CLEAR FC

CLEAR FC 팀 운영용 웹앱입니다. 일정·참석·자체전 팀 배정·포메이션·경기 결과·회원 승인을 관리합니다.

## 로컬 실행

필수 환경은 Node.js 22 이상과 pnpm 11입니다.

```bash
cp .env.local.example .env.local
pnpm install
pnpm dev
```

`http://localhost:3000`에서 확인할 수 있습니다.

## 검증

```bash
pnpm lint
pnpm build
pnpm audit --prod
```

`main` 브랜치와 Pull Request에는 동일한 검사가 GitHub Actions로 실행됩니다.

## 데이터베이스

Supabase SQL Editor에서 `supabase/migrations`의 번호 순서대로 적용합니다. 새 마이그레이션을 운영 DB에 적용하기 전에는 반드시 백업과 중복 데이터 사전 점검을 진행합니다.

전체 스키마 참고 파일과 데이터 정리 SQL은 자동 적용 방지를 위해 `supabase/manual`에 분리되어 있습니다.

운영 절차는 [docs/operations.md](docs/operations.md)를 참고하세요.
