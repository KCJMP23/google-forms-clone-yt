# Quick Start Guide - GCP Deployment

This guide will help you deploy the HIPAA-compliant medical survey system to Google Cloud Platform in under 30 minutes.

## Prerequisites

Before you begin, ensure you have:

✅ **GCP Account** with billing enabled
✅ **GCP BAA** verified (your organization has one since 2017)
✅ **gcloud CLI** installed ([Install guide](https://cloud.google.com/sdk/docs/install))
✅ **Clerk Account** (sign up at [clerk.com](https://clerk.com))
✅ **Project access** to this repository

## Step-by-Step Deployment

### 1. Install gcloud CLI (if needed)

```bash
# macOS
brew install --cask google-cloud-sdk

# Linux
curl https://sdk.cloud.google.com | bash

# Restart your shell
exec -l $SHELL

# Authenticate
gcloud auth login
gcloud auth application-default login
```

### 2. Clone and Configure

```bash
# Clone the repository
cd /path/to/google-forms-clone-yt

# Make scripts executable
chmod +x scripts/*.sh

# Copy environment template
cp .env.example .env.local
```

### 3. Run GCP Setup Script

This script creates all required GCP infrastructure (takes ~15 minutes):

```bash
./scripts/setup-gcp.sh
```

**What it creates:**
- ✅ GCP Project (if needed)
- ✅ Cloud KMS keyring with 3 encryption keys
- ✅ Cloud SQL PostgreSQL instance (encrypted)
- ✅ Cloud Storage bucket (encrypted)
- ✅ BigQuery dataset for audit logs
- ✅ Service account with IAM roles

**Configuration saved to:** `gcp-config.env`

### 4. Set Up Clerk Authentication

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Create a new application
3. Get your API keys from **API Keys** section
4. Add keys to `.env.local`:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

**Important:** For production with PHI:
- Upgrade to **Clerk Enterprise** or **Healthcare** plan
- Obtain a **Business Associate Agreement (BAA)** from Clerk

### 5. Update .env.local Configuration

Open `.env.local` and add the GCP configuration from `gcp-config.env`:

```bash
# Copy GCP configuration
cat gcp-config.env >> .env.local

# Edit additional required fields
nano .env.local
```

**Required fields:**
- ✅ Clerk keys (from step 4)
- ✅ GCP configuration (from gcp-config.env)
- ✅ HIPAA officers' emails
- ✅ Organization information

### 6. Install Dependencies

```bash
npm install
```

### 7. Test Locally (Optional)

```bash
# Start Cloud SQL Proxy (in a separate terminal)
cloud_sql_proxy -instances=PROJECT_ID:REGION:medical-surveys-db=tcp:5432

# Run development server
npm run dev

# Open http://localhost:3000
```

### 8. Deploy to Cloud Run

```bash
./scripts/deploy-cloud-run.sh
```

**This will:**
- ✅ Build Docker image using Cloud Build
- ✅ Deploy to Cloud Run (serverless)
- ✅ Configure environment variables
- ✅ Set up Cloud SQL connection
- ✅ Apply security settings

**Deployment takes:** ~5-10 minutes

### 9. Configure Clerk Redirect URLs

After deployment, you'll get a Cloud Run URL like:
```
https://medical-surveys-abc123-uc.a.run.app
```

Add this URL to Clerk:
1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to **Paths** or **Domains**
3. Add your Cloud Run URL

### 10. Verify Deployment

Visit your Cloud Run URL and verify:
- ✅ Application loads
- ✅ Sign-in works
- ✅ Dashboard is accessible (after login)
- ✅ Audit logs are being written (check BigQuery)

## Post-Deployment Checklist

### Security Configuration

- [ ] Enable Cloud Armor for DDoS protection
- [ ] Configure custom domain with SSL
- [ ] Set up VPC Service Controls
- [ ] Review IAM permissions
- [ ] Enable Security Command Center

### HIPAA Compliance

- [ ] Verify GCP BAA covers all services
- [ ] Obtain Clerk BAA (Enterprise/Healthcare plan)
- [ ] Designate HIPAA Security Officer
- [ ] Designate HIPAA Privacy Officer
- [ ] Document data retention policies
- [ ] Create incident response plan
- [ ] Conduct staff HIPAA training

### Application Configuration

- [ ] Run database migrations
- [ ] Create initial admin user
- [ ] Configure OneEntry CMS (or migrate to Firestore)
- [ ] Set up email service with BAA
- [ ] Test audit logging
- [ ] Test encryption/decryption
- [ ] Configure backup schedules

## Common Commands

### View Logs
```bash
# Cloud Run logs
gcloud run services logs read medical-surveys \
    --project=YOUR_PROJECT_ID \
    --region=us-central1

# Audit logs in BigQuery
bq query --use_legacy_sql=false \
    'SELECT * FROM `YOUR_PROJECT_ID.audit_logs.phi_access_logs`
     ORDER BY timestamp DESC LIMIT 100'
```

### Update Environment Variables
```bash
gcloud run services update medical-surveys \
    --update-env-vars NEW_VAR=value \
    --region=us-central1
```

### Redeploy Latest Code
```bash
./scripts/deploy-cloud-run.sh
```

### Connect to Database
```bash
# Start proxy
cloud_sql_proxy -instances=PROJECT_ID:REGION:medical-surveys-db=tcp:5432 &

# Connect with psql
psql "host=127.0.0.1 port=5432 dbname=medical_surveys user=app_user"

# Or use connection string
DATABASE_URL="postgresql://app_user:PASSWORD@localhost:5432/medical_surveys"
```

### View Encryption Keys
```bash
gcloud kms keys list \
    --location=us-central1 \
    --keyring=medical-surveys-keyring \
    --project=YOUR_PROJECT_ID
```

### Check Cloud Storage
```bash
gsutil ls gs://YOUR_PROJECT_ID-phi/
gsutil ls -L gs://YOUR_PROJECT_ID-phi/  # Detailed info with encryption
```

## Troubleshooting

### Deployment Fails

**Issue:** Cloud Build timeout
**Solution:** Increase timeout in script: `--timeout=30m`

**Issue:** Permission denied
**Solution:** Verify service account has correct IAM roles

**Issue:** Cloud SQL connection failed
**Solution:** Check Cloud SQL instance is running and connection name is correct

### Application Issues

**Issue:** 500 Internal Server Error
**Solution:** Check Cloud Run logs for detailed error messages

**Issue:** Database connection error
**Solution:** Verify database credentials in Secret Manager

**Issue:** Clerk authentication fails
**Solution:** Verify redirect URLs are configured in Clerk Dashboard

### Cost Optimization

**Reduce costs during development:**

```bash
# Scale down Cloud SQL when not in use
gcloud sql instances patch medical-surveys-db \
    --tier=db-f1-micro \
    --region=us-central1

# Reduce Cloud Run minimum instances
gcloud run services update medical-surveys \
    --min-instances=0 \
    --region=us-central1

# Delete old container images
gcloud container images list-tags gcr.io/PROJECT_ID/medical-surveys \
    --filter='timestamp.datetime < "2024-01-01"' \
    --format='get(digest)' | \
    xargs -I {} gcloud container images delete gcr.io/PROJECT_ID/medical-surveys@{} --quiet
```

## Next Steps

### Production Readiness

1. **Security Hardening**
   - Run `./scripts/setup-cloud-armor.sh` (once created)
   - Configure VPC Service Controls
   - Enable binary authorization (for GKE)

2. **Monitoring & Alerting**
   - Set up uptime checks
   - Configure error alerting
   - Create PHI access dashboards
   - Set up breach detection alerts

3. **Compliance Documentation**
   - Complete HIPAA risk assessment
   - Document security policies
   - Create breach notification procedures
   - Prepare audit reports

4. **Testing**
   - Security penetration testing
   - Load testing
   - Disaster recovery testing
   - Backup restoration testing

### Resources

- **GCP Documentation:** [cloud.google.com/docs](https://cloud.google.com/docs)
- **GCP HIPAA Compliance:** [cloud.google.com/security/compliance/hipaa](https://cloud.google.com/security/compliance/hipaa)
- **Clerk Documentation:** [clerk.com/docs](https://clerk.com/docs)
- **Next.js Documentation:** [nextjs.org/docs](https://nextjs.org/docs)
- **Deployment Guide:** `GCP_DEPLOYMENT_GUIDE.md`
- **Compliance Plan:** `HIPAA_COMPLIANCE_PLAN.md`

## Support

For issues or questions:
1. Check the [GCP Deployment Guide](./GCP_DEPLOYMENT_GUIDE.md)
2. Review [HIPAA Compliance Plan](./HIPAA_COMPLIANCE_PLAN.md)
3. Check GCP Status: [status.cloud.google.com](https://status.cloud.google.com)
4. GCP Support (if enrolled): [cloud.google.com/support](https://cloud.google.com/support)

---

**Important:** This system handles Protected Health Information (PHI). Ensure all HIPAA compliance requirements are met before using with real patient data.
