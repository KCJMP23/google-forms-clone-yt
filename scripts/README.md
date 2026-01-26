# Deployment Scripts

This directory contains automation scripts for deploying and managing the HIPAA-compliant medical survey system on Google Cloud Platform.

## Available Scripts

### `setup-gcp.sh`

**Purpose:** Initial GCP infrastructure setup

**What it does:**
- Creates or configures GCP project
- Enables required Google Cloud APIs
- Creates Cloud KMS keyring and encryption keys (with 90-day rotation)
- Sets up Cloud SQL PostgreSQL instance with CMEK encryption
- Creates Cloud Storage bucket with versioning and encryption
- Sets up BigQuery dataset for audit logs (6-year retention)
- Creates service account with appropriate IAM roles
- Stores database passwords in Secret Manager

**Usage:**
```bash
./scripts/setup-gcp.sh
```

**Time:** ~15-20 minutes (Cloud SQL creation is slow)

**Prerequisites:**
- gcloud CLI installed and authenticated
- GCP billing account active
- Confirmed GCP BAA is current

**Output:**
- `gcp-config.env` - Configuration file with all created resources

### `deploy-cloud-run.sh`

**Purpose:** Build and deploy application to Cloud Run

**What it does:**
- Builds Docker image using Cloud Build
- Pushes image to Google Container Registry
- Deploys to Cloud Run with HIPAA-compliant settings
- Configures environment variables
- Sets up Cloud SQL connection
- Applies service account and IAM roles

**Usage:**
```bash
./scripts/deploy-cloud-run.sh
```

**Time:** ~5-10 minutes

**Prerequisites:**
- `setup-gcp.sh` completed
- `.env.local` configured with all required values
- Clerk API keys set up

**Output:**
- Deployed Cloud Run service URL

## Quick Start

### First-Time Setup

```bash
# 1. Make scripts executable
chmod +x scripts/*.sh

# 2. Run GCP setup (one time)
./scripts/setup-gcp.sh

# 3. Configure environment
cp .env.example .env.local
cat gcp-config.env >> .env.local
# Edit .env.local with Clerk keys and other settings

# 4. Deploy application
./scripts/deploy-cloud-run.sh
```

### Subsequent Deployments

```bash
# Just run deploy script for code updates
./scripts/deploy-cloud-run.sh
```

## Script Details

### Environment Variables Used

Both scripts use these environment variables:

**From gcp-config.env (auto-generated):**
- `GCP_PROJECT_ID` - GCP project ID
- `GCP_KMS_LOCATION` - Region for Cloud KMS
- `GCP_KMS_KEYRING_NAME` - KMS keyring name
- `GCP_STORAGE_BUCKET` - Cloud Storage bucket name
- `GCP_BIGQUERY_DATASET` - BigQuery dataset for audit logs
- `GCP_CLOUDSQL_INSTANCE` - Cloud SQL connection name
- `GCP_CLOUDSQL_DATABASE` - Database name
- `GCP_CLOUDSQL_USER` - Database user

**From .env.local (user-configured):**
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk public key
- `CLERK_SECRET_KEY` - Clerk secret key (stored in Secret Manager)
- All other application configuration

### Security Features

Both scripts implement HIPAA-compliant configurations:

✅ **Encryption**
- Cloud KMS with customer-managed keys (CMEK)
- 90-day automatic key rotation
- All data encrypted at rest

✅ **Audit Logging**
- All API calls logged
- BigQuery for long-term storage (6 years)
- Time-partitioned tables for efficiency

✅ **Access Control**
- Service accounts with minimal permissions
- IAM roles following least privilege
- Secrets stored in Secret Manager (not env vars)

✅ **Network Security**
- Private Cloud SQL connection
- No public database access
- VPC-ready configuration

## Troubleshooting

### Setup Script Issues

**Error: "Project already exists"**
- Solution: Script will use existing project, no action needed

**Error: "Quota exceeded"**
- Solution: Request quota increase in GCP Console
- Cloud SQL instances are limited per region

**Error: "Permission denied"**
- Solution: Ensure you have Project Owner or Editor role
- Or verify you have specific permissions:
  - `compute.projects.get`
  - `serviceusage.services.enable`
  - `cloudkms.keyRings.create`
  - `cloudsql.instances.create`

**Cloud SQL creation timeout**
- Solution: This is normal, it takes 10-15 minutes
- Check status: `gcloud sql instances describe medical-surveys-db`

### Deploy Script Issues

**Error: "Image not found"**
- Solution: Ensure Cloud Build completed successfully
- Check: `gcloud builds list --limit=5`

**Error: "Service account not found"**
- Solution: Run setup-gcp.sh first
- Or manually create service account

**Error: "Clerk keys not configured"**
- Solution: Add Clerk keys to .env.local
- Get from: https://dashboard.clerk.com

**Cloud Run deployment fails**
- Solution: Check logs: `gcloud builds log <BUILD_ID>`
- Verify Dockerfile builds locally: `docker build -t test .`

## Manual Operations

### View Resources

```bash
# List all resources created
gcloud projects list
gcloud kms keyrings list --location=us-central1
gcloud sql instances list
gsutil ls
bq ls

# Check service account
gcloud iam service-accounts list
gcloud projects get-iam-policy PROJECT_ID \
    --flatten="bindings[].members" \
    --filter="bindings.members:medical-surveys-sa@*"
```

### Update Configuration

```bash
# Update Cloud Run environment variables
gcloud run services update medical-surveys \
    --update-env-vars KEY=value \
    --region=us-central1

# Update secrets
echo "new-value" | gcloud secrets versions add SECRET_NAME --data-file=-

# Grant new permission to service account
gcloud projects add-iam-policy-binding PROJECT_ID \
    --member="serviceAccount:medical-surveys-sa@PROJECT_ID.iam.gserviceaccount.com" \
    --role="roles/ROLE_NAME"
```

### Cleanup (Destroy Resources)

```bash
# WARNING: This will delete all data!

# Delete Cloud Run service
gcloud run services delete medical-surveys --region=us-central1

# Delete Cloud SQL instance
gcloud sql instances delete medical-surveys-db

# Delete Cloud Storage bucket (with all contents)
gsutil -m rm -r gs://PROJECT_ID-phi/

# Delete BigQuery dataset
bq rm -r -d -f PROJECT_ID:audit_logs

# Delete service account
gcloud iam service-accounts delete medical-surveys-sa@PROJECT_ID.iam.gserviceaccount.com

# Delete secrets
gcloud secrets delete clerk-secret-key
gcloud secrets delete cloudsql-app-password
gcloud secrets delete cloudsql-postgres-password

# KMS keys cannot be deleted, only disabled
gcloud kms keys update KEY_NAME \
    --location=us-central1 \
    --keyring=medical-surveys-keyring \
    --primary-version=1 \
    --state=disabled
```

## Cost Monitoring

### View Current Costs

```bash
# Enable Billing API first
gcloud services enable cloudbilling.googleapis.com

# View current month costs
gcloud billing accounts list
gcloud billing projects describe PROJECT_ID

# Or use GCP Console:
# https://console.cloud.google.com/billing
```

### Cost Optimization Tips

**Development Environment:**
```bash
# Use smaller Cloud SQL instance
gcloud sql instances patch medical-surveys-db --tier=db-f1-micro

# Reduce Cloud Run to zero minimum instances
gcloud run services update medical-surveys --min-instances=0

# Delete old container images
gcloud container images list-tags gcr.io/PROJECT_ID/medical-surveys | tail -n +10
```

**Production Environment:**
- Use committed use discounts for Cloud SQL
- Enable Cloud CDN for static assets
- Use preemptible VMs for batch processing
- Set up budget alerts

## Additional Resources

- [GCP Deployment Guide](../GCP_DEPLOYMENT_GUIDE.md) - Detailed manual deployment
- [HIPAA Compliance Plan](../HIPAA_COMPLIANCE_PLAN.md) - Full compliance requirements
- [Quick Start](../QUICK_START.md) - Step-by-step getting started
- [Environment Variables](../.env.example) - All configuration options

## Support

For script issues:
1. Check script output for specific error messages
2. Verify prerequisites are met
3. Check GCP quotas and limits
4. Review GCP Status: [status.cloud.google.com](https://status.cloud.google.com)

For HIPAA compliance questions:
- Consult with your HIPAA Security Officer
- Review compliance documentation
- Contact legal counsel for specific guidance
