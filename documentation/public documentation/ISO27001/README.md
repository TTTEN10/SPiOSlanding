# ISO/IEC 27001:2022 Compliance Framework

This folder contains the Information Security Management System (ISMS) documentation to support **ISO/IEC 27001:2022** alignment for the SafePsy application.

## Purpose

ISO 27001 is the international standard for information security management. This framework helps SafePsy:

- Protect **confidentiality, integrity, and availability** of information (including mental health and payment data)
- Demonstrate due diligence to users, partners, and regulators
- Support **GDPR** and **health-data** best practices (e.g. special category data)

## Documents

| Document | Description |
|----------|-------------|
| [ISMS-SCOPE.md](./ISMS-SCOPE.md) | Scope of the ISMS: in-scope systems, boundaries, exclusions |
| [INFORMATION-SECURITY-POLICY.md](./INFORMATION-SECURITY-POLICY.md) | High-level information security policy and management commitment |
| [STATEMENT-OF-APPLICABILITY.md](./STATEMENT-OF-APPLICABILITY.md) | Annex A controls: applicability and implementation status |
| [COMPLIANCE-CHECKLIST.md](./COMPLIANCE-CHECKLIST.md) | Operational checklist for development and deployment |
| [RISK-ASSESSMENT-TEMPLATE.md](./RISK-ASSESSMENT-TEMPLATE.md) | Risk register template for risk assessment and treatment |

## How to Use

1. **Scope and policy** – Review and approve [ISMS-SCOPE.md](./ISMS-SCOPE.md) and [INFORMATION-SECURITY-POLICY.md](./INFORMATION-SECURITY-POLICY.md) with management.
2. **Controls** – Use [STATEMENT-OF-APPLICABILITY.md](./STATEMENT-OF-APPLICABILITY.md) to track which Annex A controls apply and how they are implemented.
3. **Operations** – Use [COMPLIANCE-CHECKLIST.md](./COMPLIANCE-CHECKLIST.md) for releases, deployments, and recurring tasks.
4. **Risk management** – Use [RISK-ASSESSMENT-TEMPLATE.md](./RISK-ASSESSMENT-TEMPLATE.md) for risk identification, analysis, and treatment (and update the SoA where controls change).

## Certification Note

Full **certification** requires an accredited certification body and an implemented ISMS (policies, risk assessment, internal audits, management review). This repository provides **documentation and technical controls** to support that process; it does not replace a formal gap assessment or certification audit.

## Related Documentation

- [Security Configuration Guide](../SECURITY_COMPLETE_GUIDE.md)
- [Security implementation (headers & dependency review)](../private%20documentation/SECURITY_HEADERS_IMPLEMENTATION.md)
- [WAF Configuration](../private%20documentation/WAF_CONFIGURATION.md)
- [Deployment & Operations](../private%20documentation/DEPLOYMENT_README.md)
