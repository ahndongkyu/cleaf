#!/usr/bin/env bash
# .env.local 의 런타임 환경변수를 Vercel production 에 등록.
# 선행: vercel login && vercel link (프로젝트 연결) 완료 상태여야 함.
# 사용: bash scripts/push-env-to-vercel.sh
set -euo pipefail
cd "$(dirname "$0")/.."

# 런타임에 필요한 키만 (DB_PASSWORD는 로컬 마이그레이션용이라 제외)
KEYS=(
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  KAKAO_REST_API_KEY
  KAKAO_CLIENT_SECRET
  NEXT_PUBLIC_VAPID_PUBLIC_KEY
  VAPID_PRIVATE_KEY
  VAPID_SUBJECT
  CRON_SECRET
  SUPABASE_SERVICE_ROLE_KEY
)

for key in "${KEYS[@]}"; do
  val=$(grep -E "^${key}=" .env.local | head -1 | cut -d= -f2-)
  if [ -z "$val" ]; then
    echo "⏭  $key : 값이 비어있어 건너뜀 (나중에 채우세요)"
    continue
  fi
  # 이미 있으면 지우고 다시 등록
  vercel env rm "$key" production --yes >/dev/null 2>&1 || true
  printf '%s' "$val" | vercel env add "$key" production >/dev/null
  echo "✅ $key → production"
done

echo "완료. 이제 'vercel --prod' 로 배포하세요."
