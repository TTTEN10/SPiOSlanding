# ISO 27001 Compliance Checklist

Use this checklist for **releases**, **deployments**, and **recurring** tasks to maintain alignment with the Statement of Applicability.

## One-time: Security audit table

To enable security event logging (auth success/failure), apply the `SecurityAuditLog` model to the database:

- From API app: `cd apps/api && npx prisma generate --schema=schema.prisma && npx prisma db push --schema=schema.prisma`  
  (or create a migration: `npx prisma migrate dev --name add_security_audit_log --schema=schema.prisma`)

## Pre-release / Pre-deploy

- [ ] **Vulnerability scan:** `npm run security:audit` and `npm run security:check`; resolve or document exceptions.
- [ ] **Semgrep:** Run Semgrep on the codebase (`semgrep scan`) and fix critical/high where feasible.
- [ ] **Secrets:** No secrets in code or in repo; use Secret Manager / env vars.
- [ ] **Dependencies:** Lockfiles committed; overrides for known CVEs (qs, parse-duration, axios, react-router) in place.
- [ ] **Config:** `.env.example` updated; no production values in examples.
- [ ] **Logging:** No PII or secrets in log messages; redaction middleware applied.

## Deployment

- [ ] **TLS:** HTTPS only; valid certificate; HSTS and security headers (Caddy/Helmet).
- [ ] **CORS:** Whitelist origins only; no `*` in production.
- [ ] **Rate limiting:** Enabled (API, auth, payment, chat routes).
- [ ] **Database:** Strong credentials; DATABASE_URL from secrets; backups configured.
- [ ] **Environment:** `NODE_ENV=production`; minimal env vars exposed to app.

## Post-deploy / Recurring

- [ ] **Log review:** Check error and security audit logs for anomalies.
- [ ] **Access review:** Review who has repo, DB, and cloud access; revoke when not needed.
- [ ] **Backups:** Verify backup runs and test restore periodically.
- [ ] **Patches:** Apply security updates (npm, OS, base images) per patch policy.
- [ ] **Incident readiness:** Runbook and contact list up to date; test once per period.

## Documentation

- [ ] **ISMS scope:** Update ISMS-SCOPE.md if new systems or data flows are added.
- [ ] **SoA:** Update STATEMENT-OF-APPLICABILITY.md when controls are added or changed.
- [ ] **Risk register:** Update when new risks are identified or treatment changes (see RISK-ASSESSMENT-TEMPLATE.md).

## Quick commands

```bash
# Security audit
npm run security:audit
npm run security:check

# Fix auto-fixable issues
npm run security:fix
```

---

*Complete at least the Pre-release and Deployment sections for each production release.*
