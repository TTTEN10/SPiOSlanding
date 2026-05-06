# Production Deployment Instructions for safepsy.com

## Overview

This document provides instructions for deploying the latest SEO-optimized version of SafePsy to production.

## Latest Changes (May 3, 2026)

### SEO Improvements Included
- **Entity Definition**: H1 changed to "SafePsy - AI Therapy Platform for Private Mental Wellness"
- **Structured Data**: JSON-LD schemas for Organization, SoftwareApplication, WebSite, FAQPage
- **AI Crawler Rules**: robots.txt updated with GPTBot, ClaudeBot, PerplexityBot, etc.
- **llms.txt**: New file for AI crawler information
- **Keywords**: Targeting "AI therapy", "psychologist chatbot", "online therapy chatbot"

### Files Updated for Production
1. `deployment/.landing-stack/Caddyfile` - Added AI crawler route handling
2. `deployment/.landing-stack/docker-compose.yml` - Updated with email config, Caddy 2.8
3. `apps/web/public/robots.txt` - AI crawler allow rules
4. `apps/web/public/sitemap.xml` - Updated with all pages, current dates
5. `apps/web/public/llms.txt` - NEW file for AI crawlers
6. `apps/web/src/config/seo.ts` - Updated meta tags with AI therapy keywords
7. `apps/web/src/components/Landing.tsx` - Entity-optimized H1 and hero paragraph
8. `apps/web/src/components/Explore.tsx` - AI therapy definitions
9. `apps/web/index.html` - JSON-LD structured data

## Latest Changes (May 6, 2026)

### API + UX Improvements Included
- **Feedback endpoint**: new `POST /api/feedback` stores feedback in Postgres (and optionally emails admins).
- **Google Sheets credentials mounting**: `GOOGLE_SHEETS_CREDENTIALS_FILE` supported (recommended in Docker) for `/api/subscribe` waitlist writes.
- **SSR/prerender build**: web builds now include SSR output + prerender step (`apps/web/dist-ssr/` is build output and should not be committed).

### Operational Notes
- The landing stack compose uses a Docker secret for Google Sheets credentials:
  - Create `deployment/.landing-stack/google-sheets-sa.json` locally on the server (or sync it securely).
  - Keep it **out of git** (it is gitignored).
  - The compose mounts it at `/run/secrets/google-sheets-sa.json`.

## Production Deployment Options

### Option 1: Full Deploy via deploy-app.sh (Recommended)

The production server is at:
- **App Host**: 51.159.160.246 (safepsy.com)
- **API Host**: 62.210.238.160 (chatbot)

**From a machine with SSH access to the production server:**

```bash
cd /path/to/SPiOSlanding

# Set production environment variables
export APP_IP="51.159.160.246"
export API_IP="62.210.238.160"
export SINGLE_HOST="1"  # Single-instance mode (landing page only)
export SKIP_VLLM_DEPLOY="1"  # Skip vLLM (using external chatbot)
export APP_DOMAIN="safepsy.com"
export CADDY_SITE_NAMES="safepsy.com, www.safepsy.com"

# Run deployment
./deployment/deploy-app.sh
```

### Option 2: Manual Docker Compose Deploy

If you have direct SSH access to the app server:

```bash
# SSH to production server
ssh root@51.159.160.246

# Navigate to app directory
cd /home/safepsy/app

# Pull latest code (if using git)
git pull origin main

# Or sync files from local
# exit SSH, then run from local:
# scp -r apps/web root@51.159.160.246:/home/safepsy/app/frontend

# Update docker-compose
cd /home/safepsy/app

# Rebuild and restart
docker compose pull
docker compose up -d --build

# Verify
docker compose ps
curl http://localhost/healthz
curl https://safepsy.com/api/healthz
```

### Option 3: Single Command Deploy (If Already on Server)

```bash
cd /home/safepsy/app && \
docker compose pull && \
docker compose up -d --build && \
docker compose ps && \
curl -fsS http://localhost/api/healthz && \
echo "Deployment complete!"
```

## Post-Deployment Verification

### Run Verification Script

```bash
# From local machine
export APP_DOMAIN="safepsy.com"
export APP_IP="51.159.160.246"
bash deployment/verify-production.sh
```

### Expected Results

All checks should pass:
```
Verifying production for domain: safepsy.com
Expected app IP: 51.159.160.246

  PASS  DNS includes expected A record (51.159.160.246)
  PASS  Homepage HTTPS (https://safepsy.com -> 200)
  PASS  Backend health via Caddy (https://safepsy.com/api/healthz -> 200)
  PASS  Direct app IP HTTP (http://51.159.160.246 -> 200)
  PASS  Direct app IP API health (http://51.159.160.246/api/healthz -> 200)

All production checks passed.
```

### Manual Verification

```bash
# Check structured data in production HTML
curl -s https://safepsy.com | grep -A 5 'application/ld+json'

# Check robots.txt for AI crawlers
curl -s https://safepsy.com/robots.txt | grep -A 10 'AI Search Bots'

# Check llms.txt exists
curl -s https://safepsy.com/llms.txt | head -10

# Check sitemap
curl -s https://safepsy.com/sitemap.xml | head -20
```

## Rollback Procedure

If deployment fails:

```bash
# SSH to server
ssh root@51.159.160.246

# Navigate to app
cd /home/safepsy/app

# Restart previous containers
docker compose restart

# Or rollback to previous image
docker compose pull
docker compose up -d
```

## Monitoring After Deploy

1. **Google Search Console**: Monitor for indexing changes
2. **Server Logs**: `docker compose logs -f app`
3. **Caddy Logs**: `docker compose logs -f caddy`
4. **Health Checks**: Run `verify-production.sh` hourly for first 24h

## SEO Impact Timeline

| Timeframe | Expected Outcome |
|-----------|------------------|
| 24-48 hours | Google crawls updated content |
| 1-2 weeks | Improved entity recognition |
| 2-4 weeks | AI Overview appearances increase |
| 4-8 weeks | Ranking improvements for target keywords |

## Contact

For deployment issues, check:
- Deployment logs: `deployment/deployment-logs/`
- Server logs: `docker compose logs` on production server
- Health status: `bash deployment/verify-production.sh`
