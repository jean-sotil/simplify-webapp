#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Simplify Webapp - Development Command Runner (Linux/macOS)
# Usage: ./run.sh [command]
# ============================================================

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

print_info() { echo -e "${CYAN}[Simplify]${NC} $1"; }
print_ok() { echo -e "${GREEN}[OK]${NC} $1"; }
print_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
print_err() { echo -e "${RED}[ERROR]${NC} $1"; }

# ------------------------------------------------------------
# HELP
# ------------------------------------------------------------
show_help() {
  cat <<EOF

  ============================================================
   Simplify Webapp - Dev Runner
  ============================================================

  DEVELOPMENT:
    ./run.sh dev             Start Next.js dev server (localhost:3000)
    ./run.sh build           Build project for production
    ./run.sh start           Start production server
    ./run.sh lint            Run ESLint

  CLEAN & RESET:
    ./run.sh clean           Remove build cache (.next, node_modules/.cache)
    ./run.sh remove          Remove everything (.next, node_modules, lock files)
    ./run.sh install         Install dependencies (npm install)
    ./run.sh reset           Full reset: remove + install + build

  TESTING:
    ./run.sh test            Run unit tests (Vitest)
    ./run.sh test:watch      Run unit tests in watch mode
    ./run.sh test:e2e        Run E2E tests (Playwright)
    ./run.sh test:e2e:ui     Open Playwright interactive UI

  DATABASE (Supabase):
    ./run.sh db:push         Push seed.sql to Supabase
    ./run.sh db:reset        Reset DB with seed.sql
    ./run.sh db:migrate      Run Supabase migrations
    ./run.sh db:seed         Seed database with initial data
    ./run.sh db:studio       Open Supabase Studio
    ./run.sh db:types        Generate TypeScript types from schema

  ENVIRONMENT:
    ./run.sh env:check       Validate all required env vars
    ./run.sh env:setup       Copy .env.example to .env.local

  N8N INTEGRATION:
    ./run.sh n8n:test        Send test payload to n8n webhook
    ./run.sh n8n:status      Check n8n webhook connectivity

  DEPLOYMENT:
    ./run.sh deploy          Deploy to Vercel (production)
    ./run.sh deploy:preview  Deploy preview to Vercel

  UTILITIES:
    ./run.sh setup           First-time setup: install + env + db
    ./run.sh help            Show this help

  ============================================================

EOF
}

# ------------------------------------------------------------
# DEVELOPMENT
# ------------------------------------------------------------
cmd_dev() {
  print_info "Starting dev server..."
  npm run dev
}

cmd_build() {
  print_info "Building project..."
  npm run build
}

cmd_start() {
  print_info "Starting production server..."
  npm run start
}

cmd_lint() {
  print_info "Running ESLint..."
  npm run lint
}

# ------------------------------------------------------------
# CLEAN & RESET
# ------------------------------------------------------------
cmd_clean() {
  print_info "Cleaning build cache..."
  rm -rf .next node_modules/.cache
  print_ok "Done."
}

cmd_remove() {
  print_info "Removing .next, node_modules, lock files..."
  rm -rf .next node_modules package-lock.json
  print_ok "Done."
}

cmd_install() {
  print_info "Installing dependencies..."
  npm install
}

cmd_reset() {
  print_info "Full reset: remove + install + build..."
  cmd_remove
  cmd_install
  npm run build
  print_ok "Reset complete. Run './run.sh dev' to start."
}

# ------------------------------------------------------------
# TESTING
# ------------------------------------------------------------
cmd_test() {
  print_info "Running unit tests (Vitest)..."
  npm run test
}

cmd_test_watch() {
  print_info "Running unit tests in watch mode..."
  npm run test:watch
}

cmd_test_e2e() {
  print_info "Running E2E tests (Playwright)..."
  npx playwright test --timeout=60000
}

cmd_test_e2e_ui() {
  print_info "Opening Playwright interactive UI..."
  npx playwright test --ui --timeout=60000
}

# ------------------------------------------------------------
# DATABASE (Supabase)
# ------------------------------------------------------------
cmd_db_push() {
  print_info "Pushing seed.sql to Supabase..."
  npx supabase db push
  print_ok "Done."
}

cmd_db_reset() {
  print_info "Resetting database with seed.sql..."
  npx supabase db reset
  print_ok "Done."
}

cmd_db_migrate() {
  print_info "Running Supabase migrations..."
  npx supabase migration up
  print_ok "Done."
}

cmd_db_seed() {
  print_info "Seeding database..."
  npx supabase db reset --linked
  print_ok "Done."
}

cmd_db_studio() {
  print_info "Opening Supabase Studio..."
  npx supabase studio
}

cmd_db_types() {
  print_info "Generating TypeScript types from Supabase..."
  npx supabase gen types typescript --linked > src/types/supabase.ts
  print_ok "Types written to src/types/supabase.ts"
}

# ------------------------------------------------------------
# ENVIRONMENT
# ------------------------------------------------------------
cmd_env_check() {
  print_info "Checking environment variables..."
  echo ""

  if [ ! -f ".env.local" ]; then
    print_err ".env.local file not found! Run: ./run.sh env:setup"
    return 1
  fi

  local missing=0
  local vars=(
    NEXT_PUBLIC_APP_URL
    NEXT_PUBLIC_SUPABASE_URL
    NEXT_PUBLIC_SUPABASE_ANON_KEY
    SUPABASE_SERVICE_ROLE_KEY
    OPENAI_API_KEY
    OPENAI_BASE_URL
    N8N_WEBHOOK_URL
    BLOB_READ_WRITE_TOKEN
  )

  for var in "${vars[@]}"; do
    if grep -q "^${var}=" .env.local 2>/dev/null; then
      print_ok "$var"
    else
      print_err "$var  [MISSING]"
      missing=1
    fi
  done

  echo ""
  if [ "$missing" -eq 1 ]; then
    print_warn "Some variables are missing. Check .env.local"
  else
    print_ok "All required variables are set."
  fi
}

cmd_env_setup() {
  print_info "Setting up environment..."
  if [ -f ".env.local" ]; then
    read -p "  .env.local already exists. Overwrite? (y/N) " overwrite
    if [ "$overwrite" != "y" ] && [ "$overwrite" != "Y" ]; then
      echo "  Cancelled."
      return 0
    fi
  fi
  cp .env.example .env.local
  print_ok "Created .env.local from .env.example"
  print_warn "Please edit .env.local and fill in your values."
}

# ------------------------------------------------------------
# N8N INTEGRATION
# ------------------------------------------------------------
cmd_n8n_test() {
  print_info "Sending test payload to n8n webhook..."
  echo ""

  local n8n_url
  n8n_url=$(grep "^N8N_WEBHOOK_URL=" .env.local 2>/dev/null | cut -d'=' -f2-)

  if [ -z "$n8n_url" ]; then
    print_err "N8N_WEBHOOK_URL not found in .env.local"
    return 1
  fi

  # For testing, replace /webhook/ with /webhook-test/
  local n8n_test_url="${n8n_url/webhook\//webhook-test\/}"

  echo "  Target: $n8n_test_url"
  echo ""

  curl -s -w "\n  HTTP Status: %{http_code}\n  Response Time: %{time_total}s\n" \
    -X POST "$n8n_test_url" \
    -H "Content-Type: application/json" \
    -d '{
      "projectId": "test-001",
      "projectName": "POC Test",
      "analysisId": "test-analysis-001",
      "selectedDocuments": [
        {"id": "doc-001", "filename": "test.pdf", "originalFileUrl": "https://example.com/test.pdf", "documentType": "ett"}
      ],
      "webhookUrl": "http://localhost:3000/api/webhooks/n8n",
      "requirements": []
    }'
  echo ""
}

cmd_n8n_status() {
  print_info "Checking n8n webhook connectivity..."
  echo ""

  local n8n_url
  n8n_url=$(grep "^N8N_WEBHOOK_URL=" .env.local 2>/dev/null | cut -d'=' -f2-)

  if [ -z "$n8n_url" ]; then
    print_err "N8N_WEBHOOK_URL not found in .env.local"
    return 1
  fi

  # For testing, replace /webhook/ with /webhook-test/
  local n8n_test_url="${n8n_url/webhook\//webhook-test\/}"

  echo "  Production URL: $n8n_url"
  echo "  Test URL:       $n8n_test_url"
  curl -s -o /dev/null -w "  HTTP Status: %{http_code}\n  Response Time: %{time_total}s\n" \
    -X POST "$n8n_test_url" \
    -H "Content-Type: application/json" \
    -d '{}'
}

# ------------------------------------------------------------
# DEPLOYMENT
# ------------------------------------------------------------
cmd_deploy() {
  print_info "Deploying to Vercel (production)..."
  npx vercel --prod
}

cmd_deploy_preview() {
  print_info "Deploying preview to Vercel..."
  npx vercel
}

# ------------------------------------------------------------
# SETUP (First time)
# ------------------------------------------------------------
cmd_setup() {
  echo ""
  echo "  ============================================================"
  echo "   Simplify Webapp - First Time Setup"
  echo "  ============================================================"
  echo ""

  print_info "[1/4] Installing dependencies..."
  npm install
  echo ""

  print_info "[2/4] Setting up environment..."
  if [ ! -f ".env.local" ]; then
    cp .env.example .env.local
    print_ok "Created .env.local - PLEASE EDIT WITH YOUR VALUES"
  else
    print_ok ".env.local already exists, skipping."
  fi
  echo ""

  print_info "[3/4] Checking environment..."
  cmd_env_check || true
  echo ""

  print_info "[4/4] Building project..."
  npm run build
  echo ""

  echo "  ============================================================"
  echo "   Setup complete! Next steps:"
  echo "     1. Edit .env.local with your Supabase/OpenRouter/n8n values"
  echo "     2. Run: ./run.sh db:push   (to create tables in Supabase)"
  echo "     3. Run: ./run.sh dev       (to start development)"
  echo "  ============================================================"
}

# ------------------------------------------------------------
# COMMAND ROUTER
# ------------------------------------------------------------
case "${1:-help}" in
  dev)            cmd_dev ;;
  build)          cmd_build ;;
  start)          cmd_start ;;
  lint)           cmd_lint ;;
  clean)          cmd_clean ;;
  remove)         cmd_remove ;;
  install)        cmd_install ;;
  reset)          cmd_reset ;;
  test)           cmd_test ;;
  test:watch)     cmd_test_watch ;;
  test:e2e)       cmd_test_e2e ;;
  test:e2e:ui)    cmd_test_e2e_ui ;;
  db:push)        cmd_db_push ;;
  db:reset)       cmd_db_reset ;;
  db:migrate)     cmd_db_migrate ;;
  db:seed)        cmd_db_seed ;;
  db:studio)      cmd_db_studio ;;
  db:types)       cmd_db_types ;;
  env:check)      cmd_env_check ;;
  env:setup)      cmd_env_setup ;;
  n8n:test)       cmd_n8n_test ;;
  n8n:status)     cmd_n8n_status ;;
  deploy)         cmd_deploy ;;
  deploy:preview) cmd_deploy_preview ;;
  setup)          cmd_setup ;;
  help|--help|-h) show_help ;;
  *)
    print_err "Unknown command: $1"
    show_help
    exit 1
    ;;
esac
