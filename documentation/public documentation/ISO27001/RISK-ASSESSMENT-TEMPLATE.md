# Risk Assessment Template (ISO 27001:2022)

Use this template to record **information security risks**, **treatment**, and **residual risk** for the SafePsy ISMS. Update the Statement of Applicability when new controls are introduced.

## Risk criteria (example)

- **Likelihood:** 1 = Rare, 2 = Unlikely, 3 = Possible, 4 = Likely, 5 = Almost certain  
- **Impact:** 1 = Negligible, 2 = Minor, 3 = Moderate, 4 = Major, 5 = Severe  
- **Risk level:** Likelihood × Impact; e.g. 1–6 Low, 7–12 Medium, 13–25 High  

(Adjust scales to match your risk methodology.)

---

## Risk register (template rows)

| ID | Risk description | Cause | Impact (1–5) | Likelihood (1–5) | Risk level | Owner | Treatment | Residual risk | SoA ref |
|----|-------------------|-------|--------------|------------------|------------|-------|-----------|---------------|---------|
| R1 | Unauthorized access to user or chat data | Weak auth or compromised key | 5 | 2 | 10 M | Tech | Strong auth (SIWE), encryption, access control | Low | 5.15, 5.17, 8.5 |
| R2 | Data breach (PII / mental health) | Insufficient access control or logging | 5 | 2 | 10 M | Tech | Access control, encryption, log redaction, audit log | Low | 5.34, 8.11, 8.15 |
| R3 | Supply chain / dependency vulnerability | Malicious or vulnerable dependency | 4 | 3 | 12 M | Tech | npm audit, Semgrep, overrides, lockfiles | Medium | 5.21, 8.8 |
| R4 | Unavailability of service | Infra failure, DDoS, misconfiguration | 4 | 2 | 8 L | Ops | Backups, WAF, rate limit, runbooks | Low | 5.30, 8.20 |
| R5 | … | … | … | … | … | … | … | … | … |

---

## Treatment options

- **Mitigate:** Implement or strengthen controls (document in SoA).
- **Accept:** Document acceptance and criteria for re-assessment.
- **Transfer:** Insurance, contracts (e.g. cloud provider).
- **Avoid:** Discontinue the activity or change design.

---

## Review

- Re-assess risks at least **annually** or when:
  - New systems or data flows are introduced  
  - After a security incident  
  - When legal or contractual requirements change  

*This template supports ISO 27001:2022 clause 6.1.2 (Information security risk assessment) and 6.1.3 (Risk treatment).*
