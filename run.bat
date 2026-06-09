@echo off
setlocal enabledelayedexpansion

:: ============================================================
:: Simplify Webapp - Development Command Runner
:: Usage: run [command]
:: ============================================================

if "%~1"=="" goto :help

set "CMD=%~1"
shift

if /i "%CMD%"=="dev" goto :dev
if /i "%CMD%"=="build" goto :build
if /i "%CMD%"=="start" goto :start
if /i "%CMD%"=="lint" goto :lint
if /i "%CMD%"=="clean" goto :clean
if /i "%CMD%"=="remove" goto :remove
if /i "%CMD%"=="install" goto :install
if /i "%CMD%"=="reset" goto :reset
if /i "%CMD%"=="test" goto :test
if /i "%CMD%"=="test:watch" goto :test_watch
if /i "%CMD%"=="test:e2e" goto :test_e2e
if /i "%CMD%"=="test:e2e:ui" goto :test_e2e_ui
if /i "%CMD%"=="db:push" goto :db_push
if /i "%CMD%"=="db:reset" goto :db_reset
if /i "%CMD%"=="db:studio" goto :db_studio
if /i "%CMD%"=="db:migrate" goto :db_migrate
if /i "%CMD%"=="db:seed" goto :db_seed
if /i "%CMD%"=="db:types" goto :db_types
if /i "%CMD%"=="env:check" goto :env_check
if /i "%CMD%"=="env:setup" goto :env_setup
if /i "%CMD%"=="env:docker" goto :env_docker
if /i "%CMD%"=="n8n:test" goto :n8n_test
if /i "%CMD%"=="n8n:status" goto :n8n_status
if /i "%CMD%"=="infra:up" goto :infra_up
if /i "%CMD%"=="infra:down" goto :infra_down
if /i "%CMD%"=="infra:status" goto :infra_status
if /i "%CMD%"=="infra:logs" goto :infra_logs
if /i "%CMD%"=="infra:destroy" goto :infra_destroy
if /i "%CMD%"=="infra:studio" goto :infra_studio
if /i "%CMD%"=="deploy" goto :deploy
if /i "%CMD%"=="deploy:preview" goto :deploy_preview
if /i "%CMD%"=="setup" goto :setup
if /i "%CMD%"=="help" goto :help

echo.
echo [ERROR] Unknown command: %CMD%
goto :help

:: ------------------------------------------------------------
:: HELP
:: ------------------------------------------------------------
:help
echo.
echo  ============================================================
echo   Simplify Webapp - Dev Runner
echo  ============================================================
echo.
echo  DEVELOPMENT:
echo    run dev             Start Next.js dev server (localhost:3000)
echo    run build           Build project for production
echo    run start           Start production server
echo    run lint            Run ESLint
echo.
echo  CLEAN ^& RESET:
echo    run clean           Remove build cache (.next, node_modules/.cache)
echo    run remove          Remove everything (.next, node_modules, lock files)
echo    run install         Install dependencies (npm install)
echo    run reset           Full reset: remove + install + build
echo.
echo  TESTING:
echo    run test            Run unit tests (Vitest)
echo    run test:watch      Run unit tests in watch mode
echo    run test:e2e        Run E2E tests (Playwright)
echo    run test:e2e:ui     Open Playwright interactive UI
echo.
echo  DATABASE (Supabase):
echo    run db:push         Push seed.sql to Supabase (create/update tables)
echo    run db:reset        Reset DB: run seed.sql from scratch
echo    run db:migrate      Run Supabase migrations
echo    run db:seed         Seed database with initial data
echo    run db:studio       Open Supabase Studio in browser
echo    run db:types        Generate TypeScript types from Supabase schema
echo.
echo  ENVIRONMENT:
echo    run env:check       Validate all required env vars are set
echo    run env:setup       Copy .env.example to .env.local (interactive)
echo    run env:docker      Switch .env.local to local Docker services
echo.
echo  LOCAL INFRASTRUCTURE (Docker):
echo    run infra:up        Start all local services (Postgres, MinIO, n8n)
echo    run infra:down      Stop all local services
echo    run infra:status    Show status of local containers
echo    run infra:logs      Tail logs from all containers
echo    run infra:destroy   Stop containers AND delete all data (!)
echo    run infra:studio    Start with Supabase Studio (DB browser)
echo.
echo  N8N INTEGRATION:
echo    run n8n:test        Send test payload to n8n webhook
echo    run n8n:status      Check n8n webhook connectivity
echo.
echo  DEPLOYMENT:
echo    run deploy          Deploy to Vercel (production)
echo    run deploy:preview  Deploy preview to Vercel
echo.
echo  UTILITIES:
echo    run setup           First-time setup: install + env + db
echo    run help            Show this help
echo.
echo  ============================================================
goto :eof

:: ------------------------------------------------------------
:: DEVELOPMENT
:: ------------------------------------------------------------
:dev
echo [Simplify] Starting dev server...
call npm run dev
goto :eof

:build
echo [Simplify] Building project...
call npm run build
goto :eof

:start
echo [Simplify] Starting production server...
call npm run start
goto :eof

:lint
echo [Simplify] Running ESLint...
call npm run lint
goto :eof

:: ------------------------------------------------------------
:: CLEAN & RESET
:: ------------------------------------------------------------
:clean
echo [Simplify] Cleaning build cache...
if exist ".next" rmdir /s /q ".next"
if exist "node_modules\.cache" rmdir /s /q "node_modules\.cache"
echo [Simplify] Done.
goto :eof

:remove
echo [Simplify] Removing .next, node_modules, lock files...
if exist ".next" rmdir /s /q ".next"
if exist "node_modules" rmdir /s /q "node_modules"
if exist "package-lock.json" del /q "package-lock.json"
echo [Simplify] Done.
goto :eof

:install
echo [Simplify] Installing dependencies...
call npm install
goto :eof

:reset
echo [Simplify] Full reset: remove + install + build...
call :remove
echo.
call :install
echo.
echo [Simplify] Building project...
call npm run build
echo.
echo [Simplify] Reset complete. Run "run dev" to start.
goto :eof

:: ------------------------------------------------------------
:: TESTING
:: ------------------------------------------------------------
:test
echo [Simplify] Running unit tests (Vitest)...
call npm run test
goto :eof

:test_watch
echo [Simplify] Running unit tests in watch mode...
call npm run test:watch
goto :eof

:test_e2e
echo [Simplify] Running E2E tests (Playwright)...
call npx playwright test --timeout=60000
goto :eof

:test_e2e_ui
echo [Simplify] Opening Playwright interactive UI...
call npx playwright test --ui --timeout=60000
goto :eof

:: ------------------------------------------------------------
:: DATABASE (Supabase)
:: ------------------------------------------------------------
:db_push
echo [Simplify] Pushing seed.sql to Supabase...
echo [Simplify] Running SQL from supabase/seed.sql
call npx supabase db push
echo [Simplify] Done.
goto :eof

:db_reset
echo [Simplify] Resetting database with seed.sql...
call npx supabase db reset
echo [Simplify] Done.
goto :eof

:db_migrate
echo [Simplify] Running Supabase migrations...
call npx supabase migration up
echo [Simplify] Done.
goto :eof

:db_seed
echo [Simplify] Seeding database...
call npx supabase db reset --linked
echo [Simplify] Done.
goto :eof

:db_studio
echo [Simplify] Opening Supabase Studio...
echo.
for /f "tokens=2 delims==" %%a in ('findstr "NEXT_PUBLIC_SUPABASE_URL" .env.local 2^>nul') do (
    echo   Studio: %%a
)
echo   Or run: npx supabase studio
echo.
call npx supabase studio
goto :eof

:db_types
echo [Simplify] Generating TypeScript types from Supabase...
call npx supabase gen types typescript --linked > src/types/supabase.ts
echo [Simplify] Types written to src/types/supabase.ts
goto :eof

:: ------------------------------------------------------------
:: ENVIRONMENT
:: ------------------------------------------------------------
:env_check
echo [Simplify] Checking environment variables...
echo.
set "MISSING=0"
if not exist ".env.local" (
    echo   [MISSING] .env.local file not found!
    echo   Run: run env:setup
    set "MISSING=1"
    goto :env_check_end
)
for %%v in (NEXT_PUBLIC_APP_URL NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_ANON_KEY SUPABASE_SERVICE_ROLE_KEY OPENAI_API_KEY OPENAI_BASE_URL N8N_WEBHOOK_URL BLOB_READ_WRITE_TOKEN) do (
    findstr /c:"%%v=" ".env.local" >nul 2>&1
    if errorlevel 1 (
        echo   [MISSING] %%v
        set "MISSING=1"
    ) else (
        echo   [OK] %%v
    )
)
:env_check_end
echo.
if "!MISSING!"=="1" (
    echo [Simplify] Some variables are missing. Check .env.local
) else (
    echo [Simplify] All required variables are set.
)
goto :eof

:env_setup
echo [Simplify] Setting up environment...
if exist ".env.local" (
    echo   .env.local already exists. Overwrite? (y/N)
    set /p overwrite="> "
    if /i not "!overwrite!"=="y" (
        echo   Cancelled.
        goto :eof
    )
)
copy ".env.example" ".env.local" >nul
echo [Simplify] Created .env.local from .env.example
echo [Simplify] Please edit .env.local and fill in your values.
goto :eof

:env_docker
echo [Simplify] Switching to local Docker environment...
copy ".env.docker" ".env.local" >nul
echo [Simplify] .env.local now points to local Docker services.
echo [Simplify] Make sure to run "run infra:up" first.
goto :eof

:: ------------------------------------------------------------
:: INFRASTRUCTURE (Docker)
:: ------------------------------------------------------------
:infra_up
echo [Simplify] Starting local infrastructure...
docker compose up -d
echo.
echo   Services running:
echo     Postgres (pgvector): localhost:54322
echo     MinIO Console:       http://localhost:9001 (minioadmin/minioadmin)
echo     MinIO API:           http://localhost:9000
echo     n8n:                 http://localhost:5678 (admin/simplify2026)
echo.
echo   Next steps:
echo     run env:docker    Switch .env.local to use local services
echo     run dev           Start the Next.js app
echo.
goto :eof

:infra_down
echo [Simplify] Stopping infrastructure...
docker compose down
echo [Simplify] Done.
goto :eof

:infra_status
echo [Simplify] Infrastructure status:
echo.
docker compose ps
goto :eof

:infra_logs
echo [Simplify] Tailing infrastructure logs (Ctrl+C to stop)...
docker compose logs -f
goto :eof

:infra_destroy
echo.
echo  ============================================================
echo   WARNING: This will DELETE all local data (DB, files, n8n)
echo  ============================================================
echo.
set /p confirm="Are you sure? (y/N): "
if /i "!confirm!" neq "y" (
    echo Cancelled.
    goto :eof
)
echo [Simplify] Destroying infrastructure + volumes...
docker compose down -v --remove-orphans
echo [Simplify] All containers and volumes removed.
goto :eof

:infra_studio
echo [Simplify] Starting with Studio (DB browser)...
docker compose --profile studio up -d
echo.
echo   Supabase Studio: http://localhost:54323
echo.
goto :eof

:: ------------------------------------------------------------
:: N8N INTEGRATION
:: ------------------------------------------------------------
:n8n_test
echo [Simplify] Sending test payload to n8n webhook...
echo.
for /f "tokens=2 delims==" %%a in ('findstr "N8N_WEBHOOK_URL" .env.local 2^>nul') do set "N8N_URL=%%a"
if "!N8N_URL!"=="" (
    echo [ERROR] N8N_WEBHOOK_URL not found in .env.local
    goto :eof
)
REM For testing, replace /webhook/ with /webhook-test/
set "N8N_TEST_URL=!N8N_URL:webhook/=webhook-test/!"
echo   Target: !N8N_TEST_URL!
echo.
powershell -Command "[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12; try { $r = Invoke-WebRequest -Uri '!N8N_TEST_URL!' -Method POST -ContentType 'application/json' -Body '{\"projectId\":\"test-001\",\"projectName\":\"POC Test\",\"analysisId\":\"test-analysis-001\",\"selectedDocuments\":[{\"id\":\"doc-001\",\"filename\":\"test.pdf\",\"originalFileUrl\":\"https://example.com/test.pdf\",\"documentType\":\"ett\"}],\"webhookUrl\":\"http://localhost:3000/api/webhooks/n8n\",\"requirements\":[]}' -UseBasicParsing -TimeoutSec 30; Write-Host \"Status: $($r.StatusCode)\"; Write-Host $r.Content } catch { Write-Host \"Error: $($_.Exception.Message)\" }"
echo.
goto :eof

:n8n_status
echo [Simplify] Checking n8n webhook connectivity...
echo.
for /f "tokens=2 delims==" %%a in ('findstr "N8N_WEBHOOK_URL" .env.local 2^>nul') do set "N8N_URL=%%a"
if "!N8N_URL!"=="" (
    echo [ERROR] N8N_WEBHOOK_URL not found in .env.local
    goto :eof
)
echo   Webhook URL: !N8N_URL!
curl -s -o nul -w "  HTTP Status: %%{http_code}\n  Response Time: %%{time_total}s\n" -X POST "!N8N_URL!" -H "Content-Type: application/json" -d "{}"
goto :eof

:: ------------------------------------------------------------
:: DEPLOYMENT
:: ------------------------------------------------------------
:deploy
echo [Simplify] Deploying to Vercel (production)...
call npx vercel --prod
goto :eof

:deploy_preview
echo [Simplify] Deploying preview to Vercel...
call npx vercel
goto :eof

:: ------------------------------------------------------------
:: SETUP (First time)
:: ------------------------------------------------------------
:setup
echo.
echo  ============================================================
echo   Simplify Webapp - First Time Setup
echo  ============================================================
echo.
echo [1/4] Installing dependencies...
call npm install
echo.
echo [2/4] Setting up environment...
if not exist ".env.local" (
    copy ".env.example" ".env.local" >nul
    echo   Created .env.local - PLEASE EDIT WITH YOUR VALUES
) else (
    echo   .env.local already exists, skipping.
)
echo.
echo [3/4] Checking environment...
call :env_check
echo.
echo [4/4] Building project...
call npm run build
echo.
echo  ============================================================
echo   Setup complete! Next steps:
echo     1. Edit .env.local with your Supabase/OpenRouter/n8n values
echo     2. Run: run db:push   (to create tables in Supabase)
echo     3. Run: run dev       (to start development)
echo  ============================================================
goto :eof
