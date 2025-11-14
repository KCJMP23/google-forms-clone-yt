# Documentation Index

Complete documentation for the HIPAA-compliant anonymous survey platform.

## Quick Links

### Getting Started
- **[SETUP_GUIDE.md](../SETUP_GUIDE.md)** - Complete production setup guide (START HERE)
- **[QUICK_START.md](../QUICK_START.md)** - Quick deployment guide for GCP
- **[CLAUDE.md](../CLAUDE.md)** - Project overview and architecture

### Configuration
- **[CLERK_ROLE_SETUP.md](./CLERK_ROLE_SETUP.md)** - Configure user roles in Clerk
- **[.env.example](../.env.example)** - Environment variable template
- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Pre-launch checklist

### Compliance
- **[HIPAA_COMPLIANCE_PLAN.md](../HIPAA_COMPLIANCE_PLAN.md)** - HIPAA implementation guide
- **[GCP_DEPLOYMENT_GUIDE.md](../GCP_DEPLOYMENT_GUIDE.md)** - Manual GCP deployment
- **[scripts/README.md](../scripts/README.md)** - Automated deployment scripts

---

## Documentation Structure

```
google-forms-clone-yt/
├── SETUP_GUIDE.md               ⭐ Main setup guide (start here)
├── QUICK_START.md               Quick deployment guide
├── CLAUDE.md                    Project overview
├── HIPAA_COMPLIANCE_PLAN.md     HIPAA implementation
├── GCP_DEPLOYMENT_GUIDE.md      Manual GCP deployment
│
├── docs/
│   ├── README.md                This file
│   ├── CLERK_ROLE_SETUP.md      Clerk role configuration
│   ├── DEPLOYMENT_CHECKLIST.md  Pre-launch checklist
│   └── templates/
│       ├── DATA_USE_AGREEMENT.md
│       └── TRAINING_RECORD_TEMPLATE.md
│
└── scripts/
    ├── setup-gcp.sh             Automated GCP setup
    ├── deploy-cloud-run.sh      Automated deployment
    ├── test-user-flows.sh       Test all features
    └── README.md                Script documentation
```

---

## Documentation by Role

### For System Administrators

**Getting Started:**
1. [SETUP_GUIDE.md](../SETUP_GUIDE.md) - Complete setup instructions
2. [scripts/README.md](../scripts/README.md) - Deployment automation
3. [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Pre-launch verification

**Daily Operations:**
- Monitor audit logs at `/dashboard/audit-logs`
- Review failed authentication attempts
- Check Cloud Monitoring dashboards
- Verify backup jobs running

### For Compliance Officers

**Regulatory Review:**
1. [HIPAA_COMPLIANCE_PLAN.md](../HIPAA_COMPLIANCE_PLAN.md) - Full compliance guide
2. [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Security review checklist
3. [docs/templates/](./templates/) - DUA and training templates

**Ongoing Compliance:**
- Review audit logs weekly
- Conduct quarterly access reviews
- Verify encryption key rotations
- Update policies and procedures

### For Researchers

**Using the Platform:**
1. [CLERK_ROLE_SETUP.md](./CLERK_ROLE_SETUP.md) - Understanding your role
2. [SETUP_GUIDE.md](../SETUP_GUIDE.md) → Step 3 - Testing user flows
3. Research Export Dialog documentation (in CLAUDE.md)

**Data Export:**
- Navigate to `/dashboard/forms`
- Select form → Responses tab
- Click "Export Data"
- Choose de-identification method (Safe Harbor recommended)
- Select format (CSV, JSON, Excel)

### For Developers

**Architecture:**
1. [CLAUDE.md](../CLAUDE.md) - Complete architecture overview
2. `lib/definitions.ts` - Type definitions and enums
3. `lib/rbac.ts` - Permission system
4. `lib/encryption.ts` - PHI encryption

**HIPAA Components:**
- `components/SessionTimeoutModal.tsx` - Auto-logout
- `components/PHIIndicator.tsx` - PHI field markers
- `components/ResearchExportDialog.tsx` - Data export
- `components/BreakGlassAccessModal.tsx` - Emergency access
- `lib/phi-detection.ts` - Smart PHI detection

---

## Common Tasks

### Initial Setup

```bash
# 1. Clone and install
git clone <repo>
cd google-forms-clone-yt
npm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with your Clerk keys

# 3. Start development server
npm run dev

# 4. Run tests
./scripts/test-user-flows.sh
```

### Deploy to GCP

```bash
# 1. One-time infrastructure setup
./scripts/setup-gcp.sh

# 2. Deploy application
./scripts/deploy-cloud-run.sh

# 3. Configure custom domain (optional)
gcloud run domain-mappings create \
  --service hipaa-surveys \
  --domain surveys.yourorg.com
```

### Configure User Roles

See [CLERK_ROLE_SETUP.md](./CLERK_ROLE_SETUP.md) for detailed instructions.

**Quick method:**

1. Go to https://dashboard.clerk.com
2. Users → Select user → Public Metadata
3. Add:
   ```json
   {
     "role": "research_coordinator"
   }
   ```

### Test User Flows

```bash
# Automated tests
./scripts/test-user-flows.sh

# Manual testing (see SETUP_GUIDE.md Step 3)
npm run dev
# Then test each user flow listed in the guide
```

---

## Feature Documentation

### Anonymous Survey System (Primary Use Case)

This is primarily an **anonymous research survey platform** (Google Forms-style) with HIPAA compliance as a defensive measure.

**Key Features:**
- ✅ No login required for survey respondents
- ✅ Smart PHI detection with visual indicators
- ✅ Encrypted storage for any accidentally captured PHI
- ✅ Comprehensive audit logging
- ✅ Research data export with de-identification

### HIPAA Components (Administrative Features)

**For Researchers:**
- Research Export Dialog - Export with Safe Harbor or Limited Data Set
- Consent Management - Track research participation consent
- Response Analytics - View aggregate data

**For Compliance:**
- Audit Log Viewer - Full PHI access tracking
- Break-Glass Access - Emergency override with justification
- Session Management - Role-based timeouts

**For Security:**
- Encryption Module - AES-256-GCM for all PHI
- RBAC System - 9 role types with granular permissions
- De-identification - HIPAA Safe Harbor §164.514(b)(2)

---

## Testing & Validation

### Automated Tests

```bash
# Run full test suite
./scripts/test-user-flows.sh

# Type checking
npx tsc --noEmit

# Linting
npm run lint
```

### Manual Test Scenarios

See [SETUP_GUIDE.md](../SETUP_GUIDE.md) Step 3 for complete test scenarios:

1. Anonymous survey submission (public)
2. Researcher data export with de-identification
3. Compliance officer audit review
4. Emergency break-glass access
5. Session timeout testing
6. Role-based navigation

---

## Deployment Options

### Option 1: Automated GCP Deployment (Recommended)

```bash
./scripts/setup-gcp.sh       # One-time: ~15 minutes
./scripts/deploy-cloud-run.sh  # Each deploy: ~5 minutes
```

See: [scripts/README.md](../scripts/README.md)

### Option 2: Manual GCP Deployment

Follow step-by-step guide: [GCP_DEPLOYMENT_GUIDE.md](../GCP_DEPLOYMENT_GUIDE.md)

Good for:
- Understanding each component
- Custom infrastructure requirements
- Troubleshooting deployment issues

### Option 3: Other Cloud Providers

While designed for GCP, the application can run on:
- AWS (requires BAA, use RDS + KMS)
- Azure (requires BAA, use Azure SQL + Key Vault)
- On-premises (requires full HIPAA infrastructure)

**Note:** GCP is recommended as your organization has an existing BAA since 2017.

---

## Troubleshooting

### Common Issues

**Development server won't start:**
- Check `npm install` completed successfully
- Verify Node.js version (18+)
- Check `.env.local` exists

**Authentication not working:**
- Verify Clerk keys in `.env.local`
- Check keys match environment (test vs production)
- Ensure domain authorized in Clerk dashboard

**TypeScript errors:**
- Run `npm install` to ensure all dependencies installed
- Image import errors are expected in restricted networks
- Check `npx tsc --noEmit` for actual type errors

**Deployment fails:**
- Verify gcloud CLI authenticated
- Check GCP project ID is correct
- Ensure billing enabled on GCP project
- Review Cloud Build logs for details

### Getting Help

1. **Check documentation:**
   - [SETUP_GUIDE.md](../SETUP_GUIDE.md) - Setup issues
   - [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) - Deployment issues
   - [GCP_DEPLOYMENT_GUIDE.md](../GCP_DEPLOYMENT_GUIDE.md) - GCP-specific issues

2. **Review logs:**
   - Development: Browser console
   - Production: Cloud Logging in GCP Console
   - Audit: `/dashboard/audit-logs` or BigQuery

3. **Contact support:**
   - Security Officer: See `.env` for contact
   - Privacy Officer: See `.env` for contact
   - IT Support: Your organization's help desk

---

## Regulatory Compliance

### HIPAA Requirements

This platform implements:

✅ **Administrative Safeguards**
- Risk assessment and management
- Workforce training requirements
- Security incident procedures
- Business associate agreements

✅ **Physical Safeguards**
- GCP data centers (HIPAA-compliant)
- Access controls and facility security
- Workstation and device security

✅ **Technical Safeguards**
- Access control (RBAC)
- Audit controls (comprehensive logging)
- Integrity controls (encryption)
- Transmission security (TLS 1.3)

### Required BAAs

Before production use with real PHI:

- [x] GCP BAA (confirmed since 2017)
- [ ] Clerk Enterprise/Healthcare BAA
- [ ] OneEntry BAA (or migrate to Firestore)
- [ ] Email service provider BAA (if applicable)

See: [HIPAA_COMPLIANCE_PLAN.md](../HIPAA_COMPLIANCE_PLAN.md) Section 3.1

---

## Contributing

### Code Style

- Follow existing patterns in codebase
- Use TypeScript strict mode
- Implement server-side permission checks
- Add audit logging for PHI access
- Include JSDoc comments for public APIs

### Security Guidelines

- **Never commit secrets** to git
- **Always validate input** server-side
- **Check permissions** before data access
- **Log all PHI access** for HIPAA compliance
- **Use parameterized queries** to prevent SQL injection

### Documentation

When adding features:
1. Update [CLAUDE.md](../CLAUDE.md) with architecture changes
2. Update [SETUP_GUIDE.md](../SETUP_GUIDE.md) if setup changes
3. Add to [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md) if testing needed
4. Document any new environment variables in `.env.example`

---

## License & Legal

### Software License

[Specify your license here - MIT, Apache 2.0, proprietary, etc.]

### HIPAA Notice

This software is designed to support HIPAA compliance when properly configured and deployed. However:

⚠️ **IMPORTANT:**
- Compliance is the responsibility of the covered entity (your organization)
- You must obtain all required Business Associate Agreements
- You must implement appropriate administrative safeguards
- You must train workforce on proper use
- You must conduct regular risk assessments

### Disclaimer

This software is provided "as is" without warranty of any kind. Your organization is responsible for ensuring HIPAA compliance in your specific deployment and use case.

---

## Version History

| Version | Date       | Changes                                    |
|---------|------------|--------------------------------------------|
| 1.0     | 2024-XX-XX | Initial release with all HIPAA features    |
| 1.1     | 2024-XX-XX | Added automated deployment scripts        |
| 1.2     | 2024-XX-XX | Improved documentation and testing        |

---

## Contact Information

**Project Documentation:**
- Repository: [Your repository URL]
- Issues: [Your issues URL]
- Wiki: [Your wiki URL]

**HIPAA Contacts:**
- Security Officer: See `.env` file
- Privacy Officer: See `.env` file
- Breach Notification: See `.env` file

**Emergency Support:**
- After-hours: [Contact info]
- Security incidents: [Contact info]

---

**Last Updated:** [Current Date]
**Next Review:** [Date + 90 days]
