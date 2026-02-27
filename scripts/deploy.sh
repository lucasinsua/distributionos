#!/usr/bin/env bash
set -euo pipefail

# ============================================================
# Prospecting Engine — Deployment Script
# ============================================================
#
# Usage:
#   ./scripts/deploy.sh [component]
#
# Components:
#   all          Deploy everything (default)
#   landing      Deploy landing pages to Cloudflare Pages
#   dashboard    Build and deploy dashboard
#   mcp          Build MCP servers and start with Docker
#   migrate      Run database migration
#   jobs         Deploy Trigger.dev jobs
#
# Prerequisites:
#   - .env file with all required variables
#   - npm install completed
#   - For landing: wrangler CLI installed
#   - For mcp: Docker installed
#   - For migrate: psql or supabase CLI
# ============================================================

COMPONENT="${1:-all}"
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()   { echo -e "${GREEN}[deploy]${NC} $1"; }
warn()  { echo -e "${YELLOW}[deploy]${NC} $1"; }
error() { echo -e "${RED}[deploy]${NC} $1"; exit 1; }

# ── Validate environment ──────────────────────────────────
validate_env() {
  log "Validating environment..."
  node scripts/validate-env.mjs || error "Environment validation failed"
}

# ── Build all packages ────────────────────────────────────
build_all() {
  log "Building all packages..."
  npx turbo build || error "Build failed"
  log "Build complete — all packages compiled successfully"
}

# ── Run database migration ────────────────────────────────
run_migrate() {
  log "Running database migration..."

  if [ -z "${SUPABASE_URL:-}" ]; then
    error "SUPABASE_URL is not set"
  fi

  # Extract the database connection string from SUPABASE_URL
  # Supabase URLs are like https://xxx.supabase.co
  # DB connection is at postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
  local PROJECT_REF
  PROJECT_REF=$(echo "$SUPABASE_URL" | sed -n 's|https://\(.*\)\.supabase\.co|\1|p')

  if command -v supabase &>/dev/null; then
    log "Using Supabase CLI..."
    supabase db push --db-url "postgresql://postgres:${SUPABASE_DB_PASSWORD:-postgres}@db.${PROJECT_REF}.supabase.co:5432/postgres" \
      < packages/shared/src/db/migrations/001_core_schema.sql
  elif command -v psql &>/dev/null; then
    log "Using psql..."
    psql "postgresql://postgres:${SUPABASE_DB_PASSWORD:-postgres}@db.${PROJECT_REF}.supabase.co:5432/postgres" \
      -f packages/shared/src/db/migrations/001_core_schema.sql
  else
    warn "Neither supabase CLI nor psql found."
    warn "Run the migration manually via Supabase Dashboard > SQL Editor:"
    warn "  File: packages/shared/src/db/migrations/001_core_schema.sql"
    return 0
  fi

  log "Migration complete"
}

# ── Seed database ─────────────────────────────────────────
run_seed() {
  log "Seeding database with SaaS products..."
  node scripts/seed.mjs || error "Seed failed"
}

# ── Deploy landing pages ──────────────────────────────────
deploy_landing() {
  log "Deploying landing pages..."

  if command -v wrangler &>/dev/null; then
    cd packages/landing-pages
    wrangler pages deploy dist/ --project-name=prospecting-landing
    cd "$ROOT_DIR"
    log "Landing pages deployed to Cloudflare Pages"
  else
    warn "wrangler CLI not found. Install with: npm i -g wrangler"
    warn "Then run: cd packages/landing-pages && wrangler pages deploy dist/"
  fi
}

# ── Deploy dashboard ──────────────────────────────────────
deploy_dashboard() {
  log "Dashboard built at packages/dashboard/dist/"
  log "Deploy to your hosting provider (Vercel, Netlify, Cloudflare Pages, etc.)"

  if command -v wrangler &>/dev/null; then
    cd packages/dashboard
    wrangler pages deploy dist/ --project-name=prospecting-dashboard
    cd "$ROOT_DIR"
    log "Dashboard deployed to Cloudflare Pages"
  else
    warn "To deploy manually:"
    warn "  cd packages/dashboard && npx wrangler pages deploy dist/"
  fi
}

# ── Start MCP servers ─────────────────────────────────────
deploy_mcp() {
  log "Starting MCP servers..."

  if command -v docker &>/dev/null; then
    cd infra/docker
    docker compose up -d --build
    cd "$ROOT_DIR"
    log "MCP servers running in Docker"
    docker compose -f infra/docker/docker-compose.yml ps
  else
    warn "Docker not found. MCP servers can be started directly:"
    warn "  node packages/mcp-prospector/dist/index.js"
    warn "  node packages/mcp-content/dist/index.js"
    warn "  node packages/mcp-outreach/dist/index.js"
    warn "  node packages/mcp-router/dist/index.js"
    warn "  node packages/mcp-analytics/dist/index.js"
  fi
}

# ── Deploy Trigger.dev jobs ───────────────────────────────
deploy_jobs() {
  log "Deploying Trigger.dev jobs..."

  if [ -z "${TRIGGER_DEV_API_KEY:-}" ]; then
    warn "TRIGGER_DEV_API_KEY not set. Jobs will not be deployed."
    warn "Set the key and run: cd packages/jobs && npx trigger.dev@latest deploy"
    return 0
  fi

  cd packages/jobs
  npx trigger.dev@latest deploy 2>/dev/null || warn "Trigger.dev deploy failed — ensure the CLI is configured"
  cd "$ROOT_DIR"
}

# ── Main ──────────────────────────────────────────────────
main() {
  echo ""
  echo "  Prospecting Engine — Deployment"
  echo "  Component: $COMPONENT"
  echo ""

  case "$COMPONENT" in
    all)
      validate_env
      build_all
      run_migrate
      run_seed
      deploy_landing
      deploy_dashboard
      deploy_mcp
      deploy_jobs
      ;;
    landing)
      build_all
      deploy_landing
      ;;
    dashboard)
      build_all
      deploy_dashboard
      ;;
    mcp)
      build_all
      deploy_mcp
      ;;
    migrate)
      validate_env
      run_migrate
      run_seed
      ;;
    jobs)
      build_all
      deploy_jobs
      ;;
    *)
      error "Unknown component: $COMPONENT. Use: all, landing, dashboard, mcp, migrate, jobs"
      ;;
  esac

  echo ""
  log "Deployment complete."
  echo ""
}

main
