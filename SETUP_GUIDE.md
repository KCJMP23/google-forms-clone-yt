# Production Setup Guide

Complete step-by-step guide to configure and deploy the HIPAA-compliant survey platform.

## Prerequisites

- [x] GCP account with BAA in place (confirmed since 2017)
- [ ] Clerk account (Enterprise/Healthcare plan for HIPAA compliance)
- [ ] Node.js 18+ and npm installed
- [ ] gcloud CLI installed and authenticated
- [ ] Git configured

---

## Step 1: Environment Variables Setup

### 1.1 Copy Environment File

```bash
cp .env.example .env.local
```

✅ **Status:** Completed

### 1.2 Configure Clerk Authentication

**Required:** Clerk Enterprise or Healthcare plan with BAA

1. Sign up at https://clerk.com (or upgrade existing account)
2. Create a new application or use existing
3. Navigate to **API Keys** in Clerk Dashboard
4. Copy your keys to `.env.local`:

```bash
# Clerk Authentication (REQUIRED)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_... # or pk_live_...
CLERK_SECRET_KEY=sk_test_...                   # or sk_live_...

# Organization ID (if using Clerk Organizations)
ORG_ID=org_...
```

**Important:** Contact Clerk support to:
- Request BAA signing (required for HIPAA compliance)
- Upgrade to Enterprise/Healthcare plan
- Enable advanced security features (MFA, session controls)

### 1.3 Configure OneEntry CMS

**Option A: Use OneEntry (requires BAA verification)**

```bash
# OneEntry CMS
NEXT_PUBLIC_API_URL=https://your-oneentry-instance.com
API_TOKEN=your_api_token_here
```

⚠️ **IMPORTANT:** Verify OneEntry provides BAA before production use with real PHI.

**Option B: Migrate to GCP Firestore (recommended for HIPAA)**

If OneEntry doesn't provide BAA, migrate to GCP Firestore which is covered under your existing GCP BAA.

### 1.4 Generate Encryption Key (Development)

**For Development:**

```bash
node -e "const crypto = require('crypto'); console.log('ENCRYPTION_KEY_BASE64=' + crypto.randomBytes(32).toString('base64'));"
```

Copy the output to `.env.local`:

```bash
ENCRYPTION_KEY_BASE64=<generated_key>
ENCRYPTION_KEY_ID=key-dev-v1
```

**For Production (REQUIRED):**

Use GCP Cloud KMS instead of environment variables:

```bash
# Run setup script to create KMS keys
./scripts/setup-gcp.sh

# Script will create 3 keys with 90-day rotation:
# - surveys-encryption-key
# - responses-encryption-key
# - phi-encryption-key

# Update .env.local with KMS key names:
GCP_PROJECT_ID=your-project-id
GCP_KMS_KEY_RING=hipaa-encryption-keys
GCP_KMS_LOCATION=us-central1
```

### 1.5 Configure HIPAA Settings

Update these in `.env.local`:

```bash
# HIPAA Compliance Officers
HIPAA_SECURITY_OFFICER_EMAIL=security@yourorg.com
HIPAA_PRIVACY_OFFICER_EMAIL=privacy@yourorg.com
BREACH_NOTIFICATION_EMAIL=breach@yourorg.com

# Organization Details
ORGANIZATION_NAME="Your Medical Organization"
ORGANIZATION_NPI=1234567890  # Your NPI number

# Security Settings
ENABLE_AUDIT_LOGGING=true
AUDIT_LOG_RETENTION_DAYS=2190  # 6 years for HIPAA

# Session Management
SESSION_TIMEOUT_MINUTES=15
REQUIRE_MFA_FOR_ROLES=system_admin,compliance_officer,physician
```

### 1.6 Configure Database

**Development (Local PostgreSQL):**

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/hipaa_surveys_dev
```

**Production (GCP Cloud SQL):**

```bash
# Will be configured by ./scripts/setup-gcp.sh
DATABASE_URL=postgresql://USER:PASSWORD@/DBNAME?host=/cloudsql/PROJECT:REGION:INSTANCE
```

---

## Step 2: Configure User Roles in Clerk

### 2.1 Set Up User Roles

Clerk doesn't have built-in role management, so we use **Public Metadata** to store roles.

#### Via Clerk Dashboard (Manual):

1. Go to https://dashboard.clerk.com
2. Navigate to **Users**
3. Click on a user
4. Scroll to **Public Metadata** section
5. Click **Edit**
6. Add role configuration:

```json
{
  "role": "research_coordinator",
  "organizationId": "org_123",
  "departmentId": "dept_456"
}
```

7. Click **Save**

#### Available Roles:

| Role                    | Description                                  | MFA Required |
|------------------------|----------------------------------------------|--------------|
| `system_admin`         | Full system access, user management          | ✅ Yes       |
| `compliance_officer`   | Audit logs, security review                  | ✅ Yes       |
| `physician`            | Create surveys, view PHI, break-glass access | ✅ Yes       |
| `provider`             | View assigned patient responses              | ❌ No        |
| `research_coordinator` | Create research surveys, export data         | ❌ No        |
| `clinical_staff`       | Administer surveys, limited PHI access       | ❌ No        |
| `patient`              | View own responses only                      | ❌ No        |
| `auditor`              | Read-only audit log access                   | ❌ No        |
| `guest`                | Minimal access (default)                     | ❌ No        |

#### Via Clerk API (Programmatic):

Create a script to set roles:

```bash
# Create scripts/set-clerk-roles.js
cat > scripts/set-clerk-roles.js << 'EOF'
const { clerkClient } = require('@clerk/clerk-sdk-node');

async function setUserRole(userId, role, metadata = {}) {
  await clerkClient.users.updateUser(userId, {
    publicMetadata: {
      role,
      ...metadata,
    },
  });
  console.log(`Set ${userId} to role: ${role}`);
}

// Usage:
setUserRole('user_xxxxx', 'research_coordinator', {
  organizationId: 'org_123',
  departmentId: 'dept_research'
});
EOF

# Run:
node scripts/set-clerk-roles.js
```

### 2.2 Default Role Handling

- **Development:** Defaults to `physician` role for testing (see `lib/rbac.ts:180`)
- **Production:** Defaults to `guest` role for safety
- **Update behavior** in `lib/rbac.ts` `getCurrentUser()` function

---

## Step 3: Test User Flows

### 3.1 Start Development Server

```bash
npm run dev
```

### 3.2 Test Anonymous Survey Submission (Public)

**No authentication required:**

1. Navigate to `http://localhost:3000`
2. Browse to a public form: `http://localhost:3000/forms/[form-id]`
3. Fill out survey fields
4. Submit form
5. Verify redirect to success page

✅ **Expected:** Form submits without login, PHI indicators show on sensitive fields

### 3.3 Test Researcher Data Export

**Requires authentication + EXPORT_PHI or DEIDENTIFY_DATA permission:**

1. Sign in as research coordinator
2. Navigate to `/dashboard/forms`
3. Click on a form with responses
4. Go to "Responses" tab
5. Click "Export Data" button
6. Select de-identification method:
   - **Safe Harbor** (removes 18 HIPAA identifiers)
   - **Limited Data Set** (requires DUA)
7. Choose format (CSV, JSON, Excel)
8. Click "Export Data"

✅ **Expected:** Export downloads, audit log created

### 3.4 Test Admin Consent Management

**Requires MANAGE_CONSENTS or VIEW_CONSENTS permission:**

1. Sign in as compliance officer or system admin
2. Navigate to `/dashboard/consent`
3. View consent summary metrics
4. Filter by status (active, withdrawn, expired)
5. Search for specific patient
6. Click "View Details" on a consent

✅ **Expected:** Consents displayed, search and filters work

### 3.5 Test Audit Log Viewing

**Requires VIEW_AUDIT_LOGS permission:**

1. Sign in as compliance officer or auditor
2. Navigate to `/dashboard/audit-logs`
3. View audit metrics (PHI access, exports, failed logins)
4. Filter by action type
5. Search by user name or details
6. Export audit logs (optional)

✅ **Expected:** All system activities logged and searchable

### 3.6 Test Emergency Break-Glass Access

**Requires BREAK_GLASS permission (physician, system_admin):**

1. Sign in as physician
2. Navigate to a restricted PHI resource
3. Trigger break-glass modal (implementation-specific)
4. Enter detailed justification (min 20 characters)
5. Click "Grant Emergency Access"

✅ **Expected:**
- Access granted for 1 hour
- Compliance officer notified
- Audit log created with justification
- Warning banners displayed

### 3.7 Test Session Timeout

1. Sign in as any role
2. Wait for inactivity (timeout varies by role)
3. Observe warning modal 60 seconds before timeout
4. Test "Stay Signed In" button (resets timer)
5. Test "Logout Now" button
6. Test automatic logout (wait for countdown to reach 0)

✅ **Expected:**
- Modal appears at correct time based on role
- Countdown accurate
- Auto-logout redirects to sign-in with session_expired parameter

### 3.8 Test User Profile Settings

1. Sign in to dashboard
2. Navigate to `/dashboard/settings`
3. Review account information
4. Toggle 2FA (if role requires MFA, cannot disable)
5. Adjust session timeout preference
6. Toggle notification settings
7. Click "Save Changes"

✅ **Expected:** Settings save, role-based constraints enforced

---

## Step 4: Deploy to GCP

### 4.1 Authenticate with GCP

```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### 4.2 Run Infrastructure Setup (One-Time)

```bash
chmod +x scripts/setup-gcp.sh
./scripts/setup-gcp.sh
```

**This script will create:**
- Cloud KMS key ring with 3 encryption keys (90-day rotation)
- Cloud SQL PostgreSQL instance with CMEK encryption
- Cloud Storage bucket for file uploads (versioning, encryption)
- BigQuery dataset for audit logs (6-year retention)
- Service account with least-privilege IAM roles
- Secret Manager secrets for database passwords

**Duration:** ~15-20 minutes

**Output:** `gcp-config.env` file with all resource names and connection strings

### 4.3 Deploy Application to Cloud Run

```bash
chmod +x scripts/deploy-cloud-run.sh
./scripts/deploy-cloud-run.sh
```

**This script will:**
- Build Docker image using Cloud Build
- Push image to Artifact Registry
- Deploy to Cloud Run with:
  - Auto-scaling (1-100 instances)
  - Cloud SQL connection
  - Environment variables from Secret Manager
  - HTTPS with automatic SSL certificates
  - IAM-based authentication

**Duration:** ~5-10 minutes

**Output:** Live application URL (e.g., `https://hipaa-surveys-xxxxx-uc.a.run.app`)

### 4.4 Configure Custom Domain (Optional)

```bash
gcloud run domain-mappings create \
  --service hipaa-surveys \
  --domain surveys.yourorg.com \
  --region us-central1
```

### 4.5 Set Up Monitoring & Alerts

**Enable Cloud Monitoring:**

```bash
# Create alert for failed authentication attempts
gcloud alpha monitoring policies create \
  --notification-channels=YOUR_CHANNEL_ID \
  --display-name="Failed Login Attempts" \
  --condition-display-name="More than 5 failed logins in 5 minutes" \
  --condition-threshold-value=5 \
  --condition-threshold-duration=300s
```

**Enable Cloud Logging:**

All audit logs automatically sent to BigQuery dataset created by setup script.

---

## Step 5: Regulatory Review & Documentation

### 5.1 HIPAA Compliance Officer Review

**Security Officer Checklist:**

- [ ] All encryption keys managed by Cloud KMS
- [ ] Database encryption at rest enabled (CMEK)
- [ ] TLS 1.3 enforced for all connections
- [ ] Audit logging enabled and tested
- [ ] Session timeouts configured per role
- [ ] MFA enforced for privileged roles
- [ ] Break-glass access procedures documented
- [ ] Incident response plan reviewed
- [ ] Breach notification procedures tested
- [ ] Backup and recovery procedures tested

**Privacy Officer Checklist:**

- [ ] Data retention policies configured
- [ ] De-identification methods validated
- [ ] Consent workflows tested
- [ ] Patient access rights procedures documented
- [ ] Data deletion procedures tested
- [ ] Third-party BAAs obtained (Clerk, OneEntry)
- [ ] Privacy policy updated
- [ ] Notice of Privacy Practices available

### 5.2 Document IRB Approval Process

Create file: `docs/IRB_APPROVAL_PROCESS.md`

**Template:**

```markdown
# IRB Approval Process

## Research Survey Requirements

All surveys classified as "Clinical Research" must have IRB approval before activation.

### Steps:

1. Researcher creates survey in DRAFT status
2. System Admin reviews survey for HIPAA compliance
3. Researcher submits to IRB with:
   - Survey questions and data dictionary
   - Data Use Agreement (if sharing data)
   - Consent form template
   - Data security measures (reference this platform)
4. IRB reviews and approves/denies
5. Upon approval:
   - IRB Approval Number entered in system
   - Survey status changed to ACTIVE
   - Audit log entry created

### IRB Approval Number Format:

IRB-YYYY-NNNN (e.g., IRB-2024-1234)

### Required IRB Documentation:

- Survey Protocol
- Data Security Measures (attach GCP BAA and this system's security documentation)
- Informed Consent Template
- Data Use Agreement (if sharing de-identified data)
```

### 5.3 Create Data Use Agreement (DUA) Template

Create file: `docs/templates/DATA_USE_AGREEMENT.md`

**Template:**

```markdown
# Data Use Agreement (DUA)

**Effective Date:** [DATE]

**Between:**
- Data Provider: [YOUR ORGANIZATION]
- Data Recipient: [RECIPIENT ORGANIZATION]

## Purpose

This DUA governs the use of Limited Data Set provided by Data Provider to Data Recipient for research purposes per 45 CFR §164.514(e).

## Permitted Uses

Data may only be used for:
1. [SPECIFIC RESEARCH PURPOSE]
2. [ADDITIONAL PURPOSE IF APPLICABLE]

## Limited Data Set Definition

Data includes:
- Dates (admission, discharge, service dates)
- City, State, ZIP code (first 3 digits)
- Ages (including ages over 89)

Data DOES NOT include:
- Names
- Street addresses
- Social Security Numbers
- Medical Record Numbers
- Other direct identifiers per HIPAA §164.514(e)(2)

## Data Recipient Obligations

1. Use data only for permitted purposes
2. Implement safeguards to prevent unauthorized use/disclosure
3. Report any breaches within 24 hours
4. Not attempt to re-identify individuals
5. Destroy or return data upon completion of research
6. Not share data with third parties without written approval

## Term and Termination

- **Term:** [START DATE] to [END DATE]
- **Termination:** Data Provider may terminate immediately upon breach
- **Data Destruction:** Within 30 days of termination

## Signatures

**Data Provider:**
_______________________________
[NAME], [TITLE]
[DATE]

**Data Recipient:**
_______________________________
[NAME], [TITLE]
[DATE]
```

### 5.4 Staff Training Requirements

**Who needs training:**
- All users with dashboard access
- System administrators
- Compliance officers
- Researchers with data export permissions

**Training Topics:**

1. **HIPAA Basics** (Annual)
   - What is PHI
   - Minimum necessary standard
   - When to use break-glass access
   - Reporting breaches

2. **Platform-Specific** (On-boarding + annual refresher)
   - Session timeout policies
   - Proper use of de-identification tools
   - Audit log review procedures
   - Emergency access justifications
   - Data export workflows

3. **Incident Response** (Annual)
   - Breach detection
   - Immediate steps
   - Notification procedures
   - Documentation requirements

**Training Documentation:**

Create file: `docs/TRAINING_RECORD_TEMPLATE.md`

```markdown
# HIPAA Training Record

**Employee:** [NAME]
**Role:** [ROLE]
**Department:** [DEPARTMENT]

| Date       | Training Topic              | Duration | Trainer | Employee Signature |
|------------|-----------------------------|----------|---------|-------------------|
| YYYY-MM-DD | HIPAA Basics                | 2 hours  | [NAME]  |                   |
| YYYY-MM-DD | Platform Security Training  | 1 hour   | [NAME]  |                   |
| YYYY-MM-DD | Incident Response           | 1 hour   | [NAME]  |                   |

**Next Refresher Due:** [DATE]
```

---

## Step 6: Go-Live Checklist

### Pre-Launch (1 Week Before)

- [ ] All BAAs signed and filed
- [ ] Encryption keys rotated to production KMS
- [ ] Database backups tested
- [ ] Disaster recovery plan documented
- [ ] Penetration testing completed
- [ ] Staff training completed
- [ ] Privacy Policy published
- [ ] Terms of Service published
- [ ] Breach notification templates ready

### Launch Day

- [ ] Deploy to production Cloud Run
- [ ] Configure custom domain
- [ ] Test all user flows in production
- [ ] Enable monitoring alerts
- [ ] Notify compliance officers of go-live
- [ ] Document launch in change log

### Post-Launch (First Week)

- [ ] Monitor audit logs daily
- [ ] Review session timeout effectiveness
- [ ] Check for any failed authentication spikes
- [ ] Verify backup jobs running
- [ ] Collect user feedback
- [ ] Schedule first compliance review (30 days)

---

## Troubleshooting

### Common Issues

**1. Clerk Authentication Not Working**

- Verify publishable key starts with `pk_`
- Check secret key starts with `sk_`
- Ensure keys match environment (test vs live)
- Verify domain is authorized in Clerk dashboard

**2. Database Connection Failed**

- Check DATABASE_URL format
- For Cloud SQL, verify Cloud SQL Proxy running
- Check service account has `cloudsql.client` role

**3. Encryption Key Not Found**

- Development: Verify ENCRYPTION_KEY_BASE64 is set
- Production: Verify GCP_PROJECT_ID and KMS key names
- Check service account has `cloudkms.cryptoKeyEncrypterDecrypter` role

**4. Session Timeout Not Working**

- Check browser console for errors
- Verify SessionTimeoutProvider in layout
- Test user activity tracking events
- Review role timeout configuration

**5. Audit Logs Not Appearing**

- Verify ENABLE_AUDIT_LOGGING=true
- Check BigQuery dataset exists
- Verify service account has BigQuery write permissions
- Review console for audit errors

---

## Support & Resources

**Documentation:**
- CLAUDE.md - Project overview
- HIPAA_COMPLIANCE_PLAN.md - Compliance implementation
- GCP_DEPLOYMENT_GUIDE.md - Manual deployment steps
- This file - Production setup

**External Resources:**
- Clerk HIPAA: https://clerk.com/docs/security/hipaa
- GCP HIPAA Compliance: https://cloud.google.com/security/compliance/hipaa
- HIPAA Regulations: https://www.hhs.gov/hipaa

**Emergency Contacts:**
- Security Officer: ${HIPAA_SECURITY_OFFICER_EMAIL}
- Privacy Officer: ${HIPAA_PRIVACY_OFFICER_EMAIL}
- Breach Notification: ${BREACH_NOTIFICATION_EMAIL}

---

## Next Steps

1. ✅ Complete Steps 1-2 (Environment & Clerk setup)
2. ⏳ Test all user flows (Step 3)
3. ⏳ Deploy to GCP (Step 4)
4. ⏳ Regulatory review (Step 5)
5. ⏳ Go-live (Step 6)

**Questions?** Review CLAUDE.md or contact your system administrator.
