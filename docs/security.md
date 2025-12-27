# Security Documentation

## Overview

MacLarens Analytics implements multiple layers of security to protect sensitive financial data and ensure compliance with organizational security requirements.

## Authentication

### Azure Entra ID (Azure AD)

All authentication is handled through Azure Entra ID:

- Single Sign-On (SSO) with corporate credentials
- Multi-Factor Authentication (MFA) enforced
- Conditional Access policies
- Token-based authentication for API

### Token Flow

```
┌──────────┐    1. Login     ┌──────────────┐
│  User    │────────────────▶│  Azure AD    │
└────┬─────┘                 └──────┬───────┘
     │                              │
     │   2. Access Token            │
     │◀─────────────────────────────┘
     │
     │   3. API Request + Token
     ▼
┌──────────┐    4. Validate  ┌──────────────┐
│  API     │◀───────────────▶│  Azure AD    │
└──────────┘                 └──────────────┘
```

## Authorization

### Role-Based Access Control (RBAC)

| Permission | Data Officer | Director | CEO | Admin |
|------------|:------------:|:--------:|:---:|:-----:|
| Create Reports | ✓ | ✓ | - | - |
| View Own Reports | ✓ | ✓ | ✓ | ✓ |
| View Cluster Reports | - | ✓ | ✓ | ✓ |
| View All Reports | - | - | ✓ | ✓ |
| Approve Reports | - | ✓ | ✓ | - |
| View Analytics | - | ✓ | ✓ | ✓ |
| Manage Users | - | - | - | ✓ |
| System Config | - | - | - | ✓ |

### Data Isolation

- Data Officers: Own company data only
- Directors: Cluster-level data access
- CEO: Cross-cluster data access
- Admin: All data for administration

## API Security

### Transport Security

- TLS 1.3 enforced
- HTTPS only
- HSTS headers enabled

### Request Validation

- Input sanitization
- GraphQL depth limiting
- Query complexity analysis
- Rate limiting

### Headers

```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Content-Security-Policy: default-src 'self'
```

## Data Protection

### Encryption

- **At Rest**: Azure Storage Service Encryption (SSE)
- **In Transit**: TLS 1.3
- **Database**: Transparent Data Encryption (TDE)

### Sensitive Data

- PII minimized and encrypted
- Financial data encrypted in JSONB
- Audit logs for all data access

## Audit Logging

All significant actions are logged:

- User authentication events
- Data access and modifications
- Approval workflow actions
- Configuration changes
- Failed access attempts

### Log Retention

- Security logs: 2 years
- Audit logs: 7 years
- Application logs: 90 days

## Compliance

### Controls

- Access reviews quarterly
- Password policies via Azure AD
- Session timeout (30 minutes)
- IP whitelisting available

### Security Testing

- Penetration testing annually
- Vulnerability scanning weekly
- Dependency scanning in CI/CD
- SAST/DAST integration

## Incident Response

1. Detection via Azure Security Center
2. Alert to security team
3. Containment and investigation
4. Remediation
5. Post-incident review

## Security Contacts

- Security Team: security@maclarens.com
- Report Vulnerabilities: security@maclarens.com
