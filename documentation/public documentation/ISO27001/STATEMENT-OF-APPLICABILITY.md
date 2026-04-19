# Statement of Applicability (SoA) – ISO 27001:2022 Annex A

**Document owner:** [Assign role]  
**Last updated:** [Date]  
**Version:** 1.0

This document states which Annex A controls are **applicable** to the SafePsy ISMS and how they are **implemented**.  
**Legend:** Applicable = Yes/No; Implemented = Yes/No/Partial; Notes = evidence or location.

---

## 5 Organizational controls (37 controls)

| Ref | Control | Applicable | Implemented | Notes / evidence |
|-----|---------|------------|-------------|------------------|
| 5.1 | Policies for information security | Yes | Yes | INFORMATION-SECURITY-POLICY.md, SECURITY_COMPLETE_GUIDE.md |
| 5.2 | Information security roles and responsibilities | Yes | Partial | Document in ISMS-SCOPE; assign CISO/owner |
| 5.3 | Segregation of duties | Yes | Partial | Separate dev/deploy; document access roles |
| 5.4 | Management responsibilities | Yes | Partial | Management approval of policy; formalize in org |
| 5.5 | Contact with authorities | Yes | Partial | Document process for regulatory contact |
| 5.6 | Contact with special interest groups | Yes | No | N/A unless required |
| 5.7 | Threat intelligence | Yes | Partial | Use of Semgrep, npm audit; consider threat intel feed |
| 5.8 | Information security in project management | Yes | Partial | Security in sprint/review; formalize in SDLC |
| 5.9 | Inventory of information and other assets | Yes | Partial | ISMS-SCOPE.md; extend to full asset register |
| 5.10 | Use of information and other assets | Yes | Partial | Acceptable use in policy; enforce via access control |
| 5.11 | Return or transfer of information and other assets | Yes | Partial | Offboarding; data export (GDPR) |
| 5.12 | Classification of information | Yes | Partial | PII/special category in scope; classify in asset register |
| 5.13 | Labelling of information | Yes | No | Implement where handling physical/structured data |
| 5.14 | Information transfer | Yes | Yes | HTTPS/TLS; no sensitive data by email; API auth |
| 5.15 | Access control | Yes | Yes | Wallet/SIWE auth; role-based routes; API keys for services |
| 5.16 | Identity management | Yes | Yes | Wallet as identity; DID; no shared accounts in prod |
| 5.17 | Authentication information | Yes | Yes | SIWE; no passwords stored; secrets in Secret Manager |
| 5.18 | Access rights | Yes | Partial | Principle of least privilege; document and review |
| 5.19 | Supplier relationships | Yes | Partial | Know critical suppliers (hosting, Stripe, etc.); contracts |
| 5.20 | Addressing security in supplier agreements | Yes | Partial | DPAs, security terms for processors |
| 5.21 | Managing ICT supply chain | Yes | Partial | npm audit, lockfiles, overrides for CVEs |
| 5.22 | Monitoring, review and change of supplier services | Yes | Partial | Review access and changes; formalize |
| 5.23 | Use of cloud services | Yes | Yes | Scaleway; Secret Manager; document shared responsibility |
| 5.24 | Security incident management | Yes | Partial | Runbooks; define incident process and severity |
| 5.25 | Assessment and decision on security events | Yes | Partial | Log review; define criteria for “security event” |
| 5.26 | Response to security incidents | Yes | Partial | Runbooks (e.g. deployment, WAF); formalize IR |
| 5.27 | Learning from security incidents | Yes | Partial | Post-incident review; document lessons |
| 5.28 | Collection of evidence | Yes | Partial | Preserve logs; avoid tampering; formalize legal hold |
| 5.29 | Disruption during testing | Yes | Partial | Staging/separate env; avoid impact on prod |
| 5.30 | ICT readiness for business continuity | Yes | Partial | Backups; redeploy procedures; document BC/DR |
| 5.31 | Legal, statutory, regulatory and contractual requirements | Yes | Partial | GDPR; document and track compliance |
| 5.32 | Intellectual property rights | Yes | Partial | License compliance; no misuse of IP |
| 5.33 | Protection of records | Yes | Partial | Audit logs (RAG, security_audit_log); retention policy |
| 5.34 | Privacy and PII | Yes | Yes | Privacy policy; PII redaction in logs; encryption; consent |
| 5.35 | Use of cryptography | Yes | Yes | TLS; AES-256 for chat; hashing (IP, integrity); key management |
| 5.36 | Security in development | Yes | Yes | Secure SDLC; validation; Semgrep; security headers; rate limit |
| 5.37 | Secure system architecture and design | Yes | Partial | Document architecture; threat model; SoA |

---

## 6 People controls (8 controls)

| Ref | Control | Applicable | Implemented | Notes / evidence |
|-----|---------|------------|-------------|------------------|
| 6.1 | Screening | Yes | Partial | Background checks per HR; document for in-scope roles |
| 6.2 | Terms and conditions of employment | Yes | Partial | Security responsibilities in contracts |
| 6.3 | Awareness, education and training | Yes | Partial | Security docs; formalize training program |
| 6.4 | Discipline process | Yes | Partial | Policy non-compliance; align with HR |
| 6.5 | After employment or change of role | Yes | Partial | Access revocation; return of assets |
| 6.6 | Confidentiality or NDA | Yes | Partial | NDAs where applicable; document |
| 6.7 | Remote working | Yes | Partial | Secure access (VPN/SSH); device security |
| 6.8 | Information security event reporting | Yes | Partial | Channel for reporting; link to incident process |

---

## 7 Physical controls (14 controls)

| Ref | Control | Applicable | Implemented | Notes / evidence |
|-----|---------|------------|-------------|------------------|
| 7.1 | Physical security perimeters | Yes | Partial | Cloud DC; provider’s physical controls |
| 7.2 | Offices, rooms and facilities | Yes | Partial | Provider / remote work; document |
| 7.3 | Securing offices, rooms and facilities | Yes | Partial | Provider; access control to premises if any |
| 7.4 | Physical security monitoring | Yes | Partial | Provider; no on-prem datacentre |
| 7.5 | Physical and environmental threats | Yes | Partial | Provider resilience; document |
| 7.6 | Working in secure areas | Yes | No | N/A if no physical secure area |
| 7.7 | Clear desk and clear screen | Yes | Partial | Policy for screens and documents |
| 7.8 | Equipment siting and protection | Yes | Partial | Provider; endpoint policy |
| 7.9 | Security of assets off-premises | Yes | Partial | Laptops; remote work policy |
| 7.10 | Storage media | Yes | Partial | No unencrypted sensitive media; cloud storage |
| 7.11 | Supporting utilities | Yes | Partial | Provider; power, cooling |
| 7.12 | Cabling | Yes | No | Provider responsibility |
| 7.13 | Equipment maintenance | Yes | Partial | Provider; maintain own devices |
| 7.14 | Equipment reuse or disposal | Yes | Partial | Secure disposal; no data leakage |

---

## 8 Technological controls (34 controls)

| Ref | Control | Applicable | Implemented | Notes / evidence |
|-----|---------|------------|-------------|------------------|
| 8.1 | User endpoint devices | Yes | Partial | Users’ devices out of direct control; secure web app |
| 8.2 | Privileged access rights | Yes | Partial | Minimal privileged access; document admin access |
| 8.3 | Information access restriction | Yes | Yes | Auth middleware; wallet/DID; API scoping |
| 8.4 | Access to source code | Yes | Yes | Repo access control; no production secrets in code |
| 8.5 | Secure authentication | Yes | Yes | SIWE; nonce; expiration; no default credentials |
| 8.6 | Capacity management | Yes | Partial | Monitor resources; scale as needed |
| 8.7 | Protection against malware | Yes | Partial | Dependencies (npm audit); no arbitrary uploads |
| 8.8 | Technical vulnerability management | Yes | Yes | Semgrep; npm audit; overrides; patch process |
| 8.9 | Configuration management | Yes | Partial | Env-based config; .env.example; Secret Manager |
| 8.10 | Information deletion | Yes | Partial | Retention; secure deletion where required |
| 8.11 | Data masking | Yes | Yes | Log redaction (PII, wallet, keys); hashed IP |
| 8.12 | Data leakage prevention | Yes | Partial | Redaction; no sensitive in client; DLP policy |
| 8.13 | Information backup | Yes | Partial | DB backups; document RPO/RTO |
| 8.14 | Redundancy of facilities | Yes | Partial | Provider redundancy; document |
| 8.15 | Logging | Yes | Yes | Winston; combined/error logs; RAG audit; security_audit_log |
| 8.16 | Monitoring activities | Yes | Partial | Logs; WAF; extend to SIEM/alerting |
| 8.17 | Clock synchronization | Yes | Partial | NTP on servers; document |
| 8.18 | Use of privileged utility programs | Yes | Partial | Minimize; document and restrict |
| 8.19 | Installation on operational systems | Yes | Partial | Deploy from pipeline; no ad-hoc install |
| 8.20 | Networks security | Yes | Yes | TLS; WAF; rate limiting; CORS; security headers |
| 8.21 | Security of network services | Yes | Yes | Provider; TLS; no unnecessary exposure |
| 8.22 | Segregation in networks | Yes | Partial | App/DB separation; document network design |
| 8.23 | Web filtering | Yes | Partial | WAF; optional filtering policy |
| 8.24 | Use of cryptography | Yes | Yes | TLS; AES-256; hashing; key management (DID, Secret Manager) |
| 8.25 | Secure development life cycle | Yes | Yes | Secure SDLC; validation; security headers; tests |
| 8.26 | Application security requirements | Yes | Partial | Security requirements in SoA and checklist |
| 8.27 | Secure system architecture and design | Yes | Partial | Document; threat model |
| 8.28 | Secure coding | Yes | Yes | Validation; parameterized queries (Prisma); no eval |
| 8.29 | Security testing in development | Yes | Partial | Semgrep; tests; add security test suite |
| 8.30 | Outsourced development | Yes | Partial | If any; contract and review |
| 8.31 | Separation of environments | Yes | Partial | Dev/staging/prod; document |
| 8.32 | Change management | Yes | Partial | Git; pipelines; formalize change approval |
| 8.33 | Test information | Yes | Partial | No production PII in test; anonymize |
| 8.34 | Audit tests during operations | Yes | Partial | Logs available; formalize audit access |

---

## Summary

- **Applicable:** All controls in the table are at least partially applicable unless marked N/A.
- **Implemented (Yes):** Documented and in place in code/config/docs.
- **Implemented (Partial):** Partially in place; action plan in [COMPLIANCE-CHECKLIST.md](./COMPLIANCE-CHECKLIST.md) or risk register.
- **Implemented (No):** Not yet; to be planned in risk treatment.

*Review this SoA at least annually and after significant changes or incidents.*
