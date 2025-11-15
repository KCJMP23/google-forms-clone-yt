# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

An **anonymous research survey platform** (Google Forms-style) built with Next.js 14, with HIPAA compliance as a defensive measure in case PHI is accidentally captured. Designed for healthcare organizations conducting clinical research, quality improvement projects, patient satisfaction surveys, and provider feedback collection.

**Key Characteristics:**
- **Primary Use:** Anonymous data collection (no login required for surveys)
- **HIPAA Compliance:** Defensive measure for accidental PHI capture
- **Smart PHI Detection:** Automatically identifies and protects sensitive fields
- **Research-Focused:** De-identification tools (Safe Harbor, Limited Data Set)
- **Regulatory Ready:** Full audit logging, encryption, role-based access

All Protected Health Information (PHI) is encrypted with AES-256-GCM, access is comprehensively audited, and role-based permissions ensure minimum necessary data access per HIPAA §164.502(b).

## Quick Start

**New to this project?** See `SETUP_GUIDE.md` ⭐ for complete production setup instructions.

**Quick Testing (Development):**
```bash
cp .env.example .env.local   # Copy environment template
# Add Clerk keys to .env.local
npm run dev                  # Start dev server
./scripts/test-user-flows.sh # Run automated tests
```

**Deploy to GCP (Production):**
```bash
./scripts/setup-gcp.sh       # One-time infrastructure setup (~15 min)
./scripts/deploy-cloud-run.sh  # Deploy application (~5-10 min)
```

**Documentation Quick Links:**
- `SETUP_GUIDE.md` - Main setup guide (START HERE)
- `docs/CLERK_ROLE_SETUP.md` - Configure user roles
- `docs/DEPLOYMENT_CHECKLIST.md` - Pre-launch checklist
- `docs/README.md` - Documentation hub

## Commands

### Development
```bash
npm run dev    # Start development server on http://localhost:3000
npm run build  # Build for production
npm start      # Start production server
npm run lint   # Run ESLint
```

### Testing
```bash
./scripts/test-user-flows.sh  # Run automated tests (checks all HIPAA components)
npx tsc --noEmit              # Type checking without build
```

### GCP Deployment (Automated)
```bash
./scripts/setup-gcp.sh       # Create GCP infrastructure (Cloud KMS, Cloud SQL, Cloud Storage, BigQuery)
./scripts/deploy-cloud-run.sh  # Build and deploy to Cloud Run
```

### Clerk Role Configuration
```bash
# Generate encryption key (development only)
node -e "require('./lib/encryption').generateEncryptionKey()"
```

**Set user roles in Clerk Dashboard:**
1. Go to https://dashboard.clerk.com → Users
2. Select user → Public Metadata → Edit
3. Add role configuration:
```json
{
  "role": "research_coordinator",
  "organizationId": "org_medical_research"
}
```

See `docs/CLERK_ROLE_SETUP.md` for all 9 role types and programmatic setup.

## Tech Stack

- **Framework**: Next.js 14.1.0 (App Router, React Server Components)
- **Language**: TypeScript
- **Authentication**: Clerk (@clerk/nextjs) - Requires Enterprise/Healthcare plan with BAA
- **Backend/CMS**: OneEntry (⚠️ VERIFY HIPAA compliance & BAA before production use)
- **Encryption**: AES-256-GCM for PHI (via Node.js crypto)
- **State Management**: Zustand (for UI state)
- **Styling**: Tailwind CSS with shadcn/ui components
- **UI Components**: Radix UI primitives via shadcn/ui
- **Charts**: Tremor React
- **Notifications**: Sonner

### HIPAA Compliance Stack

- **Encryption**: Custom AES-256-GCM implementation (`lib/encryption.ts`)
- **Audit Logging**: Comprehensive PHI access tracking (`lib/audit.ts`)
- **Access Control**: Role-Based Access Control (RBAC) system (`lib/rbac.ts`)
- **De-identification**: HIPAA Safe Harbor & Limited Data Set (`lib/deidentification.ts`)
- **Type System**: Medical survey types with PHI markers (`lib/definitions.ts`)

## Architecture

### Route Structure

The app uses Next.js 14 App Router with route groups:

- **(home)/** - Public landing page
- **(auth)/** - Clerk authentication pages (`/sign-in`, `/sign-up`)
- **dashboard/** - Protected area for managing forms
  - `dashboard/forms/[id]` - Edit form and view responses
  - `dashboard/forms/[id]/responses` - View response analytics
- **forms/[id]/** - Public form submission pages
  - `forms/[id]/success` - Success page after submission

### Authentication & Authorization

Authentication is handled by Clerk via `middleware.ts`:
- All routes are public EXCEPT `/dashboard/*`
- Dashboard routes require authentication
- Middleware config: `middleware.ts:6-13`

### Data Flow

1. **Data Fetching** (Server Components):
   - Functions in `lib/data.ts` fetch data from OneEntry CMS
   - `fetchAllForms()` - Get all forms
   - `fetchFormById(id)` - Get form by marker/ID
   - `fetchAllFormsData()` - Get all form submissions
   - `fetchMenuItems(marker)` - Get menu data

2. **Data Mutations** (Server Actions):
   - `lib/actions.ts` contains Server Actions
   - `addFormData()` - Submit form data to OneEntry
   - Uses Next.js `redirect()` for post-submission navigation

3. **OneEntry Integration**:
   - Configured in `oneentry.ts` using environment variables
   - Requires `NEXT_PUBLIC_API_URL` and `API_TOKEN`
   - All forms and submissions are stored in OneEntry CMS

### Type System

`lib/definitions.ts` contains critical type mappings:
- `attributeTypeToInputType` - Maps OneEntry attribute types to HTML input types
- This mapping determines how form fields are rendered based on CMS configuration
- Key types: `FormDataItem`, `IndividualResponse`, `AttributeCount`

### State Management

Zustand store in `store/store.ts`:
- Currently manages command dialog state (`useCommandDialogStore`)
- Minimal global state - most state is server-side via React Server Components

### Component Organization

- **components/** - Feature components (FormCard, MainForm, Header, etc.)
- **components/ui/** - shadcn/ui primitives (button, dialog, tabs, etc.)
- shadcn/ui configuration in `components.json`

### Frontend Pages

The application has a complete Next.js frontend with these main pages:

**Public Pages:**
- `/` - Landing page with features overview
- `/forms/[id]` - Public form submission page (MainForm component)
- `/forms/[id]/success` - Form submission success page

**Protected Pages (require authentication via Clerk):**
- `/dashboard/forms` - Recent forms list (RecentForms component)
- `/dashboard/forms/[id]` - Form editor view (read-only, shows Questions tab)
- `/dashboard/forms/[id]/responses` - Response analytics with bar charts (BarChartComponent)
- `/dashboard/consent` - Consent management (requires MANAGE_CONSENTS or VIEW_CONSENTS permission)
- `/dashboard/audit-logs` - Audit log viewer (requires VIEW_AUDIT_LOGS permission)
- `/dashboard/settings` - User profile settings (MFA, session timeout, notifications)

**Key Frontend Components:**
- `MainForm.tsx` - Dynamic form renderer (renders forms from OneEntry schema, handles submission)
- `FormCard.tsx` - Form preview card in dashboard
- `RecentForms.tsx` - Grid of recent forms
- `BarChartComponent.tsx` - Tremor React charts for response visualization
- `Header.tsx` - Dashboard header with search
- `FormTabs.tsx` - Questions/Responses tab switcher
- `SubmitButton.tsx` - Form submit with loading state

**Form Rendering Logic:**
- Forms are defined in OneEntry CMS
- `MainForm` fetches form schema and dynamically renders fields
- `attributeTypeToInputType` maps CMS field types to HTML input types
- Form submission handled via Server Actions (`addFormData` in `lib/actions.ts`)

## Environment Variables

See `.env.example` for complete list. Critical variables:

### Core Services (Require BAA)
```bash
# Clerk Authentication (Enterprise/Healthcare plan)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# OneEntry CMS (⚠️ Verify HIPAA compliance)
NEXT_PUBLIC_API_URL=
API_TOKEN=

# Database (HIPAA-compliant with encryption)
DATABASE_URL=postgresql://...
```

### Encryption & Security
```bash
# Generate key: node -e "require('./lib/encryption').generateEncryptionKey()"
# PRODUCTION: Use AWS KMS or Azure Key Vault instead!
ENCRYPTION_KEY_BASE64=
ENCRYPTION_KEY_ID=key-v1

# Audit logging
ENABLE_AUDIT_LOGGING=true
AUDIT_LOG_RETENTION_DAYS=2190  # 6 years minimum

# Session management
SESSION_TIMEOUT_MINUTES=15
REQUIRE_MFA_FOR_ROLES=system_admin,compliance_officer,physician
```

### HIPAA Compliance
```bash
# Required designations
HIPAA_SECURITY_OFFICER_EMAIL=security@example.com
HIPAA_PRIVACY_OFFICER_EMAIL=privacy@example.com
BREACH_NOTIFICATION_EMAIL=breach@example.com

# Organization
ORGANIZATION_NAME=Medical Organization
ORGANIZATION_NPI=1234567890
```

**Setup Instructions:**
1. Copy `.env.example` to `.env.local`
2. Generate encryption key (development): `node -e "require('./lib/encryption').generateEncryptionKey()"`
3. Configure all third-party services with BAAs
4. Never commit `.env.local` to version control
5. In production, use KMS/Key Vault for keys (not env vars)

## Key Files

### Core Application
- `middleware.ts` - Clerk auth middleware, protects dashboard routes
- `oneentry.ts` - OneEntry API client initialization
- `lib/data.ts` - Server-side data fetching functions
- `lib/actions.ts` - Server Actions for mutations

### HIPAA Compliance Layer
- `lib/definitions.ts` - Type definitions including medical survey types, user roles, PHI identifiers
- `lib/encryption.ts` - AES-256-GCM encryption/decryption for PHI
- `lib/audit.ts` - Audit logging for all PHI access (HIPAA §164.312(b))
- `lib/rbac.ts` - Role-Based Access Control with granular permissions
- `lib/deidentification.ts` - De-identification utilities (Safe Harbor, Limited Data Set)

### Configuration & Deployment
- `.env.example` - Complete environment variable template with HIPAA settings
- `SETUP_GUIDE.md` ⭐ - **Main production setup guide** (comprehensive walkthrough)
- `HIPAA_COMPLIANCE_PLAN.md` - Comprehensive compliance implementation guide
- `GCP_DEPLOYMENT_GUIDE.md` - Detailed manual deployment guide for GCP
- `QUICK_START.md` - Step-by-step quick start guide for new users
- `docs/CLERK_ROLE_SETUP.md` - Clerk role configuration reference (9 role types)
- `docs/DEPLOYMENT_CHECKLIST.md` - Pre-launch verification checklist (50+ items)
- `docs/README.md` - Documentation hub organized by user role
- `store/store.ts` - Zustand state management

### Deployment Automation
- `scripts/setup-gcp.sh` - Automated GCP infrastructure setup (Cloud KMS, Cloud SQL, Cloud Storage, BigQuery)
- `scripts/deploy-cloud-run.sh` - Automated Cloud Run deployment
- `scripts/test-user-flows.sh` - Automated testing script (verifies all HIPAA components)
- `scripts/README.md` - Complete documentation for deployment scripts

**Setup Script Features:**
- Interactive prompts for configuration
- Creates all HIPAA-compliant GCP resources
- Generates secure passwords and stores in Secret Manager
- Configures encryption keys with 90-day rotation
- Sets up audit logging with 6-year retention
- Outputs configuration file (`gcp-config.env`)

**Deploy Script Features:**
- Builds Docker image via Cloud Build
- Deploys to Cloud Run with auto-scaling
- Configures environment variables and secrets
- Sets up Cloud SQL connection
- Provides live application URL

## HIPAA Compliance Architecture

### Survey Categories & Data Classification

Surveys are categorized by use case:
- **Patient Satisfaction**: Patient feedback surveys
- **Clinical Research**: IRB-approved research studies
- **Provider Feedback**: Provider performance evaluations
- **Patient Education**: Educational assessments
- **Screening Assessment**: Health screening questionnaires
- **Consent Forms**: Digital consent with e-signatures
- **Intake Forms**: New patient intake
- **Follow-up**: Post-visit follow-ups

Each survey has a `dataClassification`:
- **PHI**: Contains Protected Health Information (encrypted, audited)
- **De-identified**: PHI removed per §164.514 (Safe Harbor method)
- **Anonymous**: No identifiers collected
- **Limited Data Set**: Subset of PHI for research (requires DUA)

### User Roles & Permissions

RBAC system with 9 roles (`lib/rbac.ts`):
- **System Admin**: Full system access, user management
- **Compliance Officer**: Audit logs, security review, breach investigation
- **Physician**: Create surveys, view patient PHI, break-glass access
- **Provider**: View assigned patient responses
- **Research Coordinator**: Create research surveys, export de-identified data
- **Clinical Staff**: Administer surveys, limited PHI access
- **Patient**: View own responses only, submit surveys
- **Auditor**: Read-only audit log access
- **Guest**: Minimal access

### PHI Encryption Flow

1. **Survey Creation**: Fields marked with `isPHI: true` and `phiType` (name, MRN, DOB, etc.)
2. **Response Submission**: PHI fields encrypted with AES-256-GCM before storage
3. **Response Viewing**: Decrypted only for authorized users, access logged
4. **Data Export**: Can export as PHI (encrypted) or de-identified

Encryption utilities in `lib/encryption.ts`:
```typescript
const encrypted = await encrypt(patientName); // Returns EncryptedData
const decrypted = await decrypt(encrypted);
```

### Audit Logging

All PHI access is logged per HIPAA §164.312(b) (`lib/audit.ts`):
- User ID, role, timestamp
- Action (view, create, edit, delete, export)
- Resource accessed (survey, response)
- PHI fields accessed
- IP address, user agent, session ID
- Changes made (before/after for edits)
- Success/failure status

Common audit functions:
```typescript
await auditPHIAccess('survey_response', responseId, ['name', 'mrn']);
await auditResponseSubmission(surveyId, responseId, containsPHI);
await auditDataExport('survey_responses', recordCount, containsPHI);
```

### De-identification

Two methods supported (`lib/deidentification.ts`):

1. **Safe Harbor** (§164.514(b)(2)): Removes 18 HIPAA identifiers
   - Names, geographic subdivisions, dates, contact info, IDs
   - Ages over 89 aggregated to "90+"
   - ZIP codes truncated to first 3 digits

2. **Limited Data Set** (§164.514(e)): Retains dates and location
   - Requires Data Use Agreement (DUA)
   - For research purposes only

```typescript
const deidentified = await deidentifyResponse(response, config);
const lds = await createLimitedDataSet(response);
```

### Access Control Checks

Before accessing any PHI:
```typescript
// Check user permission
await requirePermission(Permission.VIEW_PHI);

// Check survey access
const canAccess = await canAccessSurvey(survey);

// Check response access
const canView = await canAccessResponse(response, survey);

// Access PHI with audit logging
await accessPHI('survey_response', responseId, phiFields, async () => {
  // Access logic here
});
```

### Session Management

- **Role-based timeouts**: Admin (10 min), Provider (15 min), Patient (30 min)
- **Auto-logout**: After inactivity period
- **MFA required**: System Admin, Compliance Officer, Physician roles
- **Session tracking**: All sessions logged with activity timestamps

### Data Retention

Configurable retention by survey category:
- Patient Satisfaction: 7 years
- Clinical Research: 10 years
- Consent Forms: Permanent
- Others: 6 years minimum

### Security Features

- **Encryption at rest**: All PHI fields encrypted in database
- **Encryption in transit**: TLS 1.3 required
- **Audit logging**: All PHI access logged (6-year retention)
- **Break-glass access**: Emergency access with required justification
- **Rate limiting**: Protection against brute force attacks
- **Breach detection**: Automatic alerts for suspicious activity

## Development Notes

### HIPAA Development Practices

**CRITICAL SECURITY RULES:**
1. **Never commit** encryption keys, API tokens, or secrets to git
2. **Always use audit logging** when accessing PHI
3. **Mark PHI fields** with `isPHI: true` in survey definitions
4. **Encrypt before storing** any PHI data
5. **Check permissions** before data access
6. **Use proper error handling** - don't leak PHI in error messages

**Testing with PHI:**
- Use synthetic/fake data only in development
- Never use real patient data in non-production environments
- Clear test data regularly
- Use `.env.local` (gitignored) for local config

**Audit Logging Requirements:**
- Log ALL access to PHI (views, edits, exports)
- Log authentication events (login, logout, failures)
- Log administrative actions (user creation, role changes)
- Log consent grants/withdrawals
- Log data de-identification operations

### Working with Medical Surveys

**Creating a HIPAA-compliant survey:**

1. Define survey metadata:
   ```typescript
   const survey: MedicalSurvey = {
     category: SurveyCategory.PATIENT_SATISFACTION,
     dataClassification: DataClassification.PHI,
     containsPHI: true,
     consentRequired: true,
     retentionPeriodDays: 2555, // 7 years
     allowedRoles: [UserRole.PHYSICIAN, UserRole.CLINICAL_STAFF],
     fields: [/* survey fields */]
   };
   ```

2. Mark PHI fields:
   ```typescript
   const field: SurveyField = {
     marker: 'patient_name',
     label: 'Patient Name',
     type: 'text',
     required: true,
     isPHI: true, // ← Mark as PHI
     phiType: PHIIdentifierType.NAME
   };
   ```

3. Handle responses with encryption:
   ```typescript
   // Submission (in Server Action)
   const response: MedicalSurveyResponse = {
     surveyId,
     responses: await encryptPHIFields(formData),
     containsPHI: true,
     dataClassification: DataClassification.PHI
   };

   await auditResponseSubmission(surveyId, response.id, true);
   ```

4. View responses with proper access control:
   ```typescript
   // Check permissions first
   await requirePermission(Permission.VIEW_PHI);

   // Check specific access
   if (!await canAccessResponse(response, survey)) {
     throw new Error('Access denied');
   }

   // Access with audit
   await accessPHI('survey_response', response.id, phiFields, async () => {
     // Decrypt and display
     const decrypted = await decryptFields(response.responses, phiFields);
     return decrypted;
   });
   ```

**Forms via OneEntry CMS:**
- Forms can still be created/configured in OneEntry (if HIPAA-compliant)
- App fetches form schemas via `fetchFormById()`
- Form attributes mapped to input types via `attributeTypeToInputType`
- Submissions go through encryption layer before storage
- **CRITICAL**: Verify OneEntry provides BAA before using with real PHI

### HIPAA UI Components (Implemented)

All HIPAA-compliant UI components are implemented with Google-inspired Material Design:

**Core Components:**
1. **Session Timeout Modal** (`SessionTimeoutModal.tsx`) - Role-based auto-logout with 60-second countdown warning
2. **PHI Field Indicators** (`PHIIndicator.tsx`) - Lock icons on sensitive fields with HIPAA tooltips
3. **Consent Management** (`ConsentManagementClient.tsx`) - `/dashboard/consent` - Full consent tracking interface
4. **Audit Log Viewer** (`AuditLogViewerClient.tsx`) - `/dashboard/audit-logs` - Comprehensive activity and PHI access logs
5. **Research Export Dialog** (`ResearchExportDialog.tsx`) - Export with Safe Harbor or Limited Data Set de-identification
6. **Break-Glass Access Modal** (`BreakGlassAccessModal.tsx`) - Emergency PHI access with required justification
7. **Role-Based Navigation** (`RoleBasedNav.tsx`) - Dynamic sidebar menu based on user permissions
8. **User Profile Settings** (`UserProfileSettingsClient.tsx`) - `/dashboard/settings` - MFA setup, session preferences

**Supporting Components:**
- **RBAC Hooks** (`lib/hooks/use-user-role.ts`, `use-permissions.ts`) - Client-side permission checking
- **Permission Gates** (`components/auth/RoleGate.tsx`, `PermissionGate.tsx`) - Conditional rendering by role
- **PHI Detection** (`lib/phi-detection.ts`) - Automatic PHI field identification by name patterns

**Key Features:**
- All components integrate with existing Clerk authentication
- Permission-gated based on user role (9 role types)
- Complete audit logging for all PHI access
- Google Material Design aesthetic with purple accent (#6B46C1)
- Responsive design (mobile-first approach)
- Accessibility-compliant (WCAG 2.1)

### Adding New Components

When adding shadcn/ui components:
```bash
npx shadcn-ui@latest add [component-name]
```

Components will be added to `components/ui/` based on `components.json` config.

### Server Components vs Client Components

- Most components are Server Components by default
- Client Components are marked with `"use client"` directive
- Server Actions are marked with `"use server"` directive
- Prefer Server Components for data fetching and rendering
- Use Client Components only when needed for interactivity

### Styling

- Tailwind CSS with custom configuration in `tailwind.config.ts`
- Global styles in `app/globals.css`
- Uses CSS variables for theming (shadcn/ui default)
- Import path aliases: `@/components`, `@/lib`

## GCP Infrastructure (BAA Since 2017)

This system is designed to deploy on **Google Cloud Platform (GCP)**, where your organization has a Business Associate Agreement since 2017. All GCP services used are HIPAA-compliant and covered under your existing BAA.

### GCP Services Used

- **Cloud Run**: Serverless application hosting
- **Cloud SQL (PostgreSQL)**: Encrypted database for surveys and responses
- **Cloud Storage**: File storage with customer-managed encryption keys (CMEK)
- **Cloud KMS**: Encryption key management with 90-day rotation
- **Cloud Logging + BigQuery**: Audit log collection and 6-year retention
- **Secret Manager**: Secure credential storage
- **Cloud Armor**: DDoS protection and web application firewall
- **VPC**: Network isolation and private connectivity

### Research & Quality Improvement

This system specifically supports:

**Research Data Collection**:
- IRB approval tracking and management
- Research participant consent workflows
- Limited Data Set exports for research use
- Date shifting for longitudinal research data
- Data Use Agreement (DUA) management
- Integration with REDCap and other research platforms

**Quality Improvement (QI) Projects**:
- QI projects may not require patient consent per 45 CFR 46
- De-identified or limited data set classification options
- Quality metrics tracking and reporting
- Provider performance evaluation surveys
- Patient satisfaction measurement
- Process improvement data collection

### Deployment Options

1. **Cloud Run** (Recommended): Serverless, auto-scaling, fully managed
2. **GKE (Kubernetes)**: For complex deployments with multiple services
3. **App Engine**: Fully managed platform with less configuration

See `GCP_DEPLOYMENT_GUIDE.md` for complete step-by-step deployment instructions.

## Production Readiness Checklist

Before deploying with real PHI:

### Legal & Administrative
- [ ] Business Associate Agreements (BAAs) obtained from all vendors
- [ ] HIPAA Security Officer designated
- [ ] HIPAA Privacy Officer designated
- [ ] Risk assessment completed
- [ ] Policies and procedures documented
- [ ] Staff HIPAA training completed
- [ ] Incident response plan documented
- [ ] Breach notification procedures established

### Technical Security
- [ ] Encryption keys migrated to KMS/Key Vault (not env vars)
- [ ] Audit logging configured and tested
- [ ] Database encryption at rest enabled
- [ ] TLS 1.3 configured for all connections
- [ ] MFA enabled for privileged roles
- [ ] Session timeouts configured
- [ ] Rate limiting enabled
- [ ] Security monitoring configured
- [ ] Automated backups with encryption
- [ ] Penetration testing completed
- [ ] Vulnerability scanning implemented

### Third-Party Services
- [x] GCP BAA verified (in place since 2017)
- [ ] Clerk Enterprise/Healthcare plan with BAA
- [ ] OneEntry CMS HIPAA compliance verified OR migrated to GCP Firestore
- [ ] Email service BAA obtained (or using GCP partner)
- [ ] All services reviewed for HIPAA compliance

### GCP-Specific Requirements
- [ ] Cloud KMS configured for encryption key management
- [ ] Cloud SQL with customer-managed encryption keys (CMEK)
- [ ] Cloud Storage with uniform bucket-level access
- [ ] Cloud Logging + BigQuery for 6-year audit retention
- [ ] VPC Service Controls enabled for data perimeter
- [ ] Cloud Armor configured for DDoS protection
- [ ] Secret Manager used for all sensitive credentials
- [ ] IAM roles configured with least privilege
- [ ] Organization policies enforced

### Data Management
- [ ] Data retention policies configured
- [ ] Secure deletion procedures tested
- [ ] De-identification tools tested
- [ ] Data export controls implemented
- [ ] Backup and recovery tested

### References
- See `GCP_DEPLOYMENT_GUIDE.md` for complete GCP deployment instructions
- See `HIPAA_COMPLIANCE_PLAN.md` for detailed implementation guide
- See `.env.example` for complete configuration options
- GCP HIPAA Compliance: https://cloud.google.com/security/compliance/hipaa
- HIPAA regulations: https://www.hhs.gov/hipaa/
