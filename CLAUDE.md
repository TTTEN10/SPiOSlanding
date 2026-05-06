# SPiOSlanding - SafePsy Landing Page

## Project Overview

SafePsy landing page - Secure, Ethical, Human-centered online therapy platform.

**Tech Stack:**
- **Monorepo** with npm workspaces
- **Frontend:** React + TypeScript + Vite (apps/web)
- **Backend:** Node.js + TypeScript + Prisma (apps/api)
- **Mobile:** React Native (apps/safepsy-mobile)
- **Infrastructure:** Docker, Terraform, Caddy reverse proxy
- **Testing:** Vitest, Hardhat (smart contracts)

## Repository Structure

```
.
├── apps/
│   ├── web/           # React + Vite frontend
│   ├── api/           # TypeScript backend + Prisma
│   └── safepsy-mobile/# React Native mobile app
├── backend/           # Legacy/backend services
├── frontend/          # Legacy/frontend components
├── deployment/        # Deployment scripts and configs
├── deploy/            # Deploy workflows (GitHub Actions)
├── infra/             # Terraform infrastructure
├── documentation/
│   ├── public/        # Public documentation
│   └── private/       # Internal docs including REPOSITORY_SYNTAX_TREE.md
├── scripts/           # Utility and verification scripts
├── tests/             # Test suites
└── .cursor/           # Editor rules and engineering principles
```

## Development Commands

```bash
# Development
npm run dev              # Start web + API concurrently
npm run dev:web          # Start Vite dev server
npm run dev:api          # Start API dev server
npm run dev:mobile       # Start mobile app

# Build
npm run build            # Build web + API
npm run build:web        # Build web only
npm run build:api        # Build API only

# Testing
npm run test             # Run all tests
npm run test:web         # Vitest for web
npm run test:api         # Vitest for API
npm run test:contract    # Hardhat contract tests

# Database (Prisma)
npm run db:generate      # Generate Prisma client
npm run db:push          # Push schema to database
npm run db:migrate       # Run migrations
npm run db:studio        # Open Prisma Studio

# Code Quality
npm run lint             # Lint all
npm run format           # Format all
npm run typecheck        # Type check all

# Security
npm run security:audit   # Run npm audit
npm run security:fix     # Auto-fix vulnerabilities
```

## Engineering Principles

- **Stability over speed** - Never break working infrastructure for features
- **Minimal, reversible changes** - Prefer small diffs
- **Validate before and after** - Check behavior pre/post deploy
- **Verify, don't assume** - Check running services, ports, environment state
- **Leave code better** - Apply Boy Scout Rule on every change

### Key Laws

- **YAGNI** - Don't add functionality until necessary
- **DRY** - Single source of truth for knowledge
- **KISS** - Simplest design that meets current needs
- **Hyrum's Law** - Published API behaviors become contractual
- **Law of Unintended Consequences** - Test thoroughly in complex systems

## Architecture Guidelines

### Frontend (apps/web, frontend/)

- Build reusable, composable components with clear props contracts
- Keep business logic out of presentation components
- Use hooks/services for stateful logic
- Centralize API calls in dedicated clients/services
- Handle loading, error, and empty states consistently

### Backend (apps/api, backend/)

- Keep controllers thin - orchestrate only request/response
- Place business rules in services/use-cases
- Keep data access in repositories
- Use typed request/response contracts and validated DTOs
- Handle errors explicitly with consistent logging

### API Contracts

- Validate all request payloads, params, and queries strictly
- Keep response schemas stable; preserve backward compatibility
- Version contract changes and document migration paths
- Log errors with actionable context (endpoint, input, correlation ID)
- Apply retries/timeouts/circuit-breakers for external dependencies

## Infrastructure

### Docker

- Use multi-stage builds for runtime images
- Pin explicit image tags; avoid `latest`
- Use restart policies (`unless-stopped` or `always`)
- Keep runtime images lean
- Reference: `@docker-compose.dev.yml`, `@docker-compose.prod.yml`

### Terraform (infra/)

- Never destroy infrastructure without explicit confirmation
- Run `terraform plan` and review before `apply`
- Keep configurations idempotent
- Use variables and tfvars (no hardcoded env values)
- Prefer incremental changes over broad refactors

### Caddy

- Ensure HTTPS/TLS behavior is explicit
- Validate reverse proxy targets before deploying
- Keep route matchers explicit and readable
- Reference active config: `@Caddyfile`

## Deployment & Operations

### Deployment Workflow

1. Treat deployment complete only after health verification
2. Confirm frontend, backend, and API endpoints are reachable
3. Inspect logs for critical errors before closing
4. Keep rollback path clear before production changes

### Production Recovery

1. Check instance and network status first
2. If app is down: check container status → check logs → restart affected services
3. Never redeploy blindly when root cause is unknown
4. Fix root cause before restart/redeploy
5. Verify recovery with endpoint and health checks

### Service Validation Checklist

- [ ] Frontend loads without blocking runtime errors
- [ ] Backend responds to health/status calls
- [ ] API/chatbot service returns valid responses
- [ ] Reverse proxy routes correctly
- [ ] No failing/unhealthy containers after rollout
- [ ] Key user flows validated (not just health endpoints)

## Testing Strategy

- **Testing Pyramid:** Many fast unit tests, fewer integration tests, minimal UI tests
- Unit tests in `apps/*/src/**/*.test.ts`
- Integration tests in `tests/`
- Contract tests with Hardhat for smart contracts

## Repository Documentation

- **REPOSITORY_SYNTAX_TREE.md** (`documentation/private documentation/`) - Canonical tree map of repo structure
- Update this file when adding/removing directories, routes, middleware, or major modules
- Skip updates for trivial bugfixes or comment-only changes

## Security

- Run `npm run security:audit` regularly
- Check for vulnerabilities with `npm run security:check`
- Review and fix with `npm run security:fix`
- Never commit secrets or credentials
- Use environment variables and secrets management

## Additional Resources

- `.cursor/laws-of-software-engineering.md` - Full list of 56 software engineering laws
- `.cursor/rules/` - Domain-specific rules (frontend, backend, infra, devops)
- `env.example` - Environment variable reference
