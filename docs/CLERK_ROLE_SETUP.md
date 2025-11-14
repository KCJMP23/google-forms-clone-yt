# Clerk Role Configuration Quick Reference

## Setting User Roles in Clerk Dashboard

### Method 1: Via Clerk Dashboard (Manual)

1. Go to https://dashboard.clerk.com
2. Select your application
3. Navigate to **Users** in the sidebar
4. Click on the user you want to configure
5. Scroll down to **Public Metadata** section
6. Click **Edit** button
7. Add the JSON configuration below
8. Click **Save**

### Role Configuration Examples

#### Research Coordinator

```json
{
  "role": "research_coordinator",
  "organizationId": "org_medical_research",
  "departmentId": "dept_oncology_research"
}
```

**Permissions:**
- Create research surveys
- View survey responses
- Export de-identified data
- Manage research consents

---

#### Physician

```json
{
  "role": "physician",
  "organizationId": "org_medical_center",
  "departmentId": "dept_cardiology",
  "specialization": "Cardiology"
}
```

**Permissions:**
- Create surveys
- View patient PHI
- Break-glass emergency access
- Manage patient consents

---

#### Compliance Officer

```json
{
  "role": "compliance_officer",
  "organizationId": "org_medical_center",
  "departmentId": "dept_compliance"
}
```

**Permissions:**
- View audit logs
- Security review
- Breach investigation
- View all consents
- Export PHI (for compliance purposes)

---

#### System Administrator

```json
{
  "role": "system_admin",
  "organizationId": "org_medical_center",
  "departmentId": "dept_it"
}
```

**Permissions:**
- Full system access
- Manage users
- Assign roles
- Break-glass access
- All permissions

---

#### Clinical Staff

```json
{
  "role": "clinical_staff",
  "organizationId": "org_medical_center",
  "departmentId": "dept_general_medicine"
}
```

**Permissions:**
- Administer surveys to patients
- View assigned patient responses
- Limited PHI access
- View consents

---

#### Provider

```json
{
  "role": "provider",
  "organizationId": "org_medical_center",
  "departmentId": "dept_nursing"
}
```

**Permissions:**
- View assigned patient responses
- View PHI for assigned patients
- Submit survey responses
- Manage patient consents

---

#### Patient

```json
{
  "role": "patient",
  "organizationId": "org_medical_center",
  "patientId": "P12345",
  "mrn": "MRN-67890"
}
```

**Permissions:**
- View own survey responses only
- Submit surveys
- View own consents

---

#### Auditor

```json
{
  "role": "auditor",
  "organizationId": "org_medical_center",
  "departmentId": "dept_compliance"
}
```

**Permissions:**
- Read-only audit log access
- View surveys (read-only)
- No PHI access without justification

---

### Method 2: Via Clerk API (Programmatic)

Create a script to automate role assignment:

```javascript
// scripts/assign-clerk-roles.js
import { clerkClient } from '@clerk/clerk-sdk-node';

const ROLE_CONFIGS = {
  researcher: {
    role: 'research_coordinator',
    organizationId: 'org_medical_research',
  },
  doctor: {
    role: 'physician',
    organizationId: 'org_medical_center',
  },
  compliance: {
    role: 'compliance_officer',
    organizationId: 'org_medical_center',
  },
};

async function assignRole(userEmail, roleType) {
  // Find user by email
  const users = await clerkClient.users.getUserList({
    emailAddress: [userEmail],
  });

  if (users.length === 0) {
    console.error(`User not found: ${userEmail}`);
    return;
  }

  const user = users[0];
  const roleConfig = ROLE_CONFIGS[roleType];

  // Update user metadata
  await clerkClient.users.updateUser(user.id, {
    publicMetadata: roleConfig,
  });

  console.log(`✅ Assigned ${roleType} role to ${userEmail}`);
  console.log(`   User ID: ${user.id}`);
  console.log(`   Role: ${roleConfig.role}`);
}

// Usage examples:
// assignRole('researcher@example.com', 'researcher');
// assignRole('doctor@example.com', 'doctor');
// assignRole('compliance@example.com', 'compliance');

export { assignRole };
```

**Run the script:**

```bash
# Install Clerk SDK
npm install @clerk/clerk-sdk-node

# Set environment variable
export CLERK_SECRET_KEY=sk_...

# Run script
node scripts/assign-clerk-roles.js
```

---

### Method 3: Bulk Import via CSV

Create a CSV file `users-roles.csv`:

```csv
email,role,organizationId,departmentId
researcher1@example.com,research_coordinator,org_medical_research,dept_oncology
researcher2@example.com,research_coordinator,org_medical_research,dept_cardiology
doctor1@example.com,physician,org_medical_center,dept_emergency
doctor2@example.com,physician,org_medical_center,dept_surgery
compliance@example.com,compliance_officer,org_medical_center,dept_compliance
admin@example.com,system_admin,org_medical_center,dept_it
```

Create import script `scripts/bulk-import-roles.js`:

```javascript
import { clerkClient } from '@clerk/clerk-sdk-node';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

async function bulkImportRoles(csvFile) {
  const csvContent = fs.readFileSync(csvFile, 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
  });

  for (const record of records) {
    try {
      const users = await clerkClient.users.getUserList({
        emailAddress: [record.email],
      });

      if (users.length === 0) {
        console.log(`❌ User not found: ${record.email}`);
        continue;
      }

      const user = users[0];
      const metadata = {
        role: record.role,
        organizationId: record.organizationId,
      };

      if (record.departmentId) {
        metadata.departmentId = record.departmentId;
      }

      await clerkClient.users.updateUser(user.id, {
        publicMetadata: metadata,
      });

      console.log(`✅ ${record.email} → ${record.role}`);
    } catch (error) {
      console.error(`Error processing ${record.email}:`, error.message);
    }
  }

  console.log('\n✅ Bulk import complete');
}

bulkImportRoles('./users-roles.csv');
```

**Run bulk import:**

```bash
npm install csv-parse
export CLERK_SECRET_KEY=sk_...
node scripts/bulk-import-roles.js
```

---

## Role Permissions Matrix

| Permission              | System Admin | Compliance | Physician | Provider | Research | Clinical | Patient | Auditor | Guest |
|------------------------|--------------|------------|-----------|----------|----------|----------|---------|---------|-------|
| VIEW_SURVEYS           | ✅           | ✅         | ✅        | ✅       | ✅       | ✅       | ❌      | ✅      | ❌    |
| CREATE_SURVEY          | ✅           | ❌         | ✅        | ❌       | ✅       | ❌       | ❌      | ❌      | ❌    |
| EDIT_SURVEY            | ✅           | ❌         | ✅        | ❌       | ✅       | ❌       | ❌      | ❌      | ❌    |
| DELETE_SURVEY          | ✅           | ❌         | ❌        | ❌       | ❌       | ❌       | ❌      | ❌      | ❌    |
| VIEW_RESPONSES         | ✅           | ✅         | ✅        | ✅       | ✅       | ✅       | ❌      | ❌      | ❌    |
| VIEW_OWN_RESPONSES     | ✅           | ❌         | ❌        | ❌       | ❌       | ❌       | ✅      | ❌      | ❌    |
| VIEW_PHI               | ✅           | ✅         | ✅        | ✅       | ❌       | ✅       | ❌      | ❌      | ❌    |
| EXPORT_PHI             | ✅           | ✅         | ❌        | ❌       | ✅       | ❌       | ❌      | ❌      | ❌    |
| DEIDENTIFY_DATA        | ❌           | ✅         | ❌        | ❌       | ✅       | ❌       | ❌      | ❌      | ❌    |
| MANAGE_USERS           | ✅           | ❌         | ❌        | ❌       | ❌       | ❌       | ❌      | ❌      | ❌    |
| VIEW_AUDIT_LOGS        | ✅           | ✅         | ❌        | ❌       | ❌       | ❌       | ❌      | ✅      | ❌    |
| MANAGE_CONSENTS        | ✅           | ✅         | ✅        | ✅       | ✅       | ❌       | ❌      | ❌      | ❌    |
| BREAK_GLASS            | ✅           | ❌         | ✅        | ❌       | ❌       | ❌       | ❌      | ❌      | ❌    |

---

## Testing Role Assignment

### Verify Role Assignment

1. Sign in to your application
2. Open browser DevTools (F12)
3. Go to Console tab
4. Check current user role:

```javascript
// In browser console
fetch('/api/user/role')
  .then(res => res.json())
  .then(data => console.log('My role:', data));
```

**Expected output:**

```json
{
  "userId": "user_xxxxx",
  "role": "research_coordinator",
  "permissions": [
    "view_surveys",
    "create_survey",
    "edit_survey",
    "view_responses",
    "export_phi",
    "deidentify_data",
    "manage_consents"
  ]
}
```

### Test Permission Gates

Navigate to different pages and verify access:

| URL                          | Accessible By              |
|------------------------------|---------------------------|
| `/dashboard/forms`           | All authenticated users   |
| `/dashboard/consent`         | Compliance, Admin, Physicians, Researchers |
| `/dashboard/audit-logs`      | Compliance, Admin, Auditors |
| `/dashboard/settings`        | All authenticated users   |

---

## Default Role Configuration

### Development Mode

By default, development mode assigns `physician` role for testing purposes.

**Location:** `lib/rbac.ts` lines 180-182

```typescript
const role = process.env.NODE_ENV === 'development'
  ? UserRole.PHYSICIAN // Development default for testing
  : UserRole.GUEST;    // Production default
```

**To change development default:**

Edit `lib/rbac.ts`:

```typescript
const role = process.env.NODE_ENV === 'development'
  ? UserRole.RESEARCH_COORDINATOR // Your preferred test role
  : UserRole.GUEST;
```

### Production Mode

In production, users default to `guest` role with minimal permissions until explicitly assigned a role via Clerk metadata.

---

## Troubleshooting

### User Has Wrong Permissions

1. Check Clerk public metadata is set correctly
2. Clear browser cache and sign out/in
3. Verify API route `/api/user/role` returns correct role
4. Check server logs for RBAC errors

### Role Not Taking Effect

1. Sign out completely from Clerk
2. Clear all cookies
3. Sign back in
4. Check that metadata was saved in Clerk dashboard

### API Returns "Guest" Role

- Verify CLERK_SECRET_KEY is set correctly
- Check user exists in Clerk dashboard
- Ensure public metadata is saved (not private metadata)
- Verify no errors in server console

---

## Security Best Practices

1. **Never store roles in client-side state** - Always fetch from server
2. **Verify permissions server-side** - Client checks are for UX only
3. **Audit role changes** - Log all role assignments
4. **Minimum necessary principle** - Assign lowest role needed
5. **Regular reviews** - Audit user roles quarterly
6. **Revoke on separation** - Remove access immediately when staff leaves

---

## Next Steps

- [x] Understand role structure
- [ ] Assign roles to test users
- [ ] Test each role's permissions
- [ ] Document role assignment process for your organization
- [ ] Train staff on requesting role changes

**Questions?** See SETUP_GUIDE.md or contact your system administrator.
