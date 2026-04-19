# Information Security Policy (ISO 27001:2022)

**Document owner:** [Assign role, e.g. CISO / Management]  
**Approved by:** [Name/role]  
**Last reviewed:** [Date]  
**Version:** 1.0

## 1. Purpose

SafePsy is committed to protecting the **confidentiality, integrity, and availability** of information assets, in particular:

- User personal data and special category data (mental health)
- Authentication and payment-related data
- Internal and operational data (config, keys, logs)

This policy sets the direction and support for the Information Security Management System (ISMS) and aligns with **ISO/IEC 27001:2022**.

## 2. Scope

This policy applies to the SafePsy platform and related systems as defined in [ISMS-SCOPE.md](./ISMS-SCOPE.md), and to all personnel and relevant parties involved in the development, operation, and support of those systems.

## 3. Principles

- **Risk-based:** Security measures are driven by risk assessment and treatment.
- **Proportional:** Controls are proportionate to the sensitivity of the information and the threats.
- **Layered:** Defence in depth (network, application, data, access, monitoring).
- **Privacy by design:** Data minimization, purpose limitation, and encryption of sensitive data at rest and in transit.
- **Accountability:** Roles and responsibilities for security are defined and documented.

## 4. Objectives

- Protect user data (including mental health content) from unauthorized access, alteration, and loss.
- Ensure only authorized persons and systems can access in-scope assets (access control).
- Maintain the integrity of data and systems (e.g. integrity hashes, secure development, change management).
- Ensure availability of the service within defined targets (e.g. resilience, backups, incident response).
- Comply with applicable legal and contractual requirements (e.g. GDPR, contracts).
- Provide audit trails (logs) for security-relevant events and protect logs from tampering and unauthorized access.

## 5. Management Commitment

Management commits to:

- Providing the resources necessary to implement and maintain the ISMS.
- Promoting security awareness and competence.
- Ensuring that information security is considered in planning and change (e.g. new features, infrastructure).
- Reviewing the ISMS and this policy periodically and when significant changes or incidents occur.

## 6. Responsibilities

- **Management:** Overall accountability; approval of policy and major security decisions; resource allocation.
- **Development / Tech lead:** Secure development, access control implementation, vulnerability management, and alignment with this policy.
- **Operations:** Secure configuration, monitoring, backup, incident response, and patch management.
- **All personnel:** Compliance with policies and procedures; reporting of security incidents and weaknesses.

## 7. Non-compliance

Failure to comply with this policy and related procedures may result in disciplinary or contractual measures. Exceptions require documented management approval and risk acceptance.

## 8. Review

This policy shall be reviewed at least annually or when significant changes to the organization, technology, or risk environment occur. Changes shall be communicated to relevant parties.

---

*This policy supports ISO 27001:2022 clauses 5.2 (Policy) and 5.1 (Leadership and commitment).*
