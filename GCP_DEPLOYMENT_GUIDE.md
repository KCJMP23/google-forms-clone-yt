# GCP Deployment Guide - HIPAA-Compliant Medical Survey System

## Overview

This guide provides step-by-step instructions for deploying the HIPAA-compliant medical survey system on Google Cloud Platform (GCP). Your organization has an existing Business Associate Agreement (BAA) with GCP since 2017, which covers the use of GCP services for Protected Health Information (PHI).

## Prerequisites

✅ **GCP BAA Verified**: Confirm your GCP BAA is current and covers all services
✅ **GCP Project**: Have a dedicated GCP project for this application
✅ **Billing Enabled**: GCP billing account set up
✅ **Admin Access**: Organization admin or project owner permissions
✅ **gcloud CLI**: Google Cloud SDK installed locally

## GCP Services Used (All HIPAA-Compliant with BAA)

| Service | Purpose | HIPAA Eligible |
|---------|---------|----------------|
| **Cloud Run** | Application hosting (serverless) | ✅ Yes |
| **Cloud SQL (PostgreSQL)** | Database for surveys & responses | ✅ Yes |
| **Cloud Storage** | File storage (consents, exports) | ✅ Yes |
| **Cloud KMS** | Encryption key management | ✅ Yes |
| **Cloud Logging** | Audit log collection | ✅ Yes |
| **BigQuery** | Long-term audit log storage | ✅ Yes |
| **Secret Manager** | Sensitive credentials storage | ✅ Yes |
| **Cloud Armor** | DDoS protection & WAF | ✅ Yes |
| **VPC** | Network isolation | ✅ Yes |

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    GCP Project (HIPAA)                      │
│                                                             │
│  ┌──────────────┐      ┌──────────────┐                   │
│  │  Cloud Run   │◄────►│  Cloud SQL   │                   │
│  │  (Next.js)   │      │ (PostgreSQL) │                   │
│  └──────────────┘      └──────────────┘                   │
│         │                      │                            │
│         ▼                      ▼                            │
│  ┌──────────────┐      ┌──────────────┐                   │
│  │Cloud Storage │      │   Cloud KMS  │                   │
│  │  (Files/PHI) │      │(Encryption)  │                   │
│  └──────────────┘      └──────────────┘                   │
│         │                      │                            │
│         └──────────┬───────────┘                           │
│                    ▼                                        │
│           ┌──────────────────┐                            │
│           │  Cloud Logging   │                            │
│           │    (Audit PHI)   │                            │
│           └──────────────────┘                            │
│                    │                                        │
│                    ▼                                        │
│           ┌──────────────────┐                            │
│           │    BigQuery      │                            │
│           │(6-year retention)│                            │
│           └──────────────────┘                            │
│                                                             │
│  Protected by: VPC + Cloud Armor + IAM                    │
└─────────────────────────────────────────────────────────────┘
```

## Step-by-Step Deployment

### Phase 1: Initial Setup (30 minutes)

#### 1.1 Create GCP Project

```bash
# Set variables
export PROJECT_ID="medical-surveys-prod"
export REGION="us-central1"
export ZONE="us-central1-a"

# Create project
gcloud projects create $PROJECT_ID \
  --name="Medical Surveys - Production" \
  --set-as-default

# Link billing account
gcloud beta billing projects link $PROJECT_ID \
  --billing-account=YOUR_BILLING_ACCOUNT_ID

# Enable required APIs
gcloud services enable \
  run.googleapis.com \
  sql-component.googleapis.com \
  sqladmin.googleapis.com \
  storage-api.googleapis.com \
  cloudkms.googleapis.com \
  logging.googleapis.com \
  bigquery.googleapis.com \
  secretmanager.googleapis.com \
  compute.googleapis.com \
  vpcaccess.googleapis.com
```

#### 1.2 Configure Organization Policies (HIPAA Requirements)

```bash
# Enforce encryption at rest
gcloud resource-manager org-policies set-policy \
  constraints/compute.requireShieldedVm \
  --project=$PROJECT_ID

# Restrict public IP addresses
gcloud resource-manager org-policies set-policy \
  constraints/compute.vmExternalIpAccess \
  --project=$PROJECT_ID

# Enforce uniform bucket-level access
gcloud resource-manager org-policies set-policy \
  constraints/storage.uniformBucketLevelAccess \
  --project=$PROJECT_ID
```

### Phase 2: Encryption Setup (20 minutes)

#### 2.1 Create Cloud KMS Keyring and Keys

```bash
# Create keyring for PHI encryption
gcloud kms keyrings create medical-surveys-keyring \
  --location=$REGION

# Create encryption key for application data
gcloud kms keys create phi-encryption-key \
  --location=$REGION \
  --keyring=medical-surveys-keyring \
  --purpose=encryption \
  --rotation-period=90d \
  --next-rotation-time=$(date -d '+90 days' +%Y-%m-%dT%H:%M:%S%z)

# Create key for Cloud SQL encryption
gcloud kms keys create cloudsql-encryption-key \
  --location=$REGION \
  --keyring=medical-surveys-keyring \
  --purpose=encryption

# Create key for Cloud Storage encryption
gcloud kms keys create storage-encryption-key \
  --location=$REGION \
  --keyring=medical-surveys-keyring \
  --purpose=encryption
```

#### 2.2 Set Up Secret Manager

```bash
# Create secrets for sensitive values
echo -n "your-clerk-secret-key" | \
  gcloud secrets create clerk-secret-key \
    --data-file=- \
    --replication-policy=automatic

# Create database password
openssl rand -base64 32 | \
  gcloud secrets create cloudsql-password \
    --data-file=- \
    --replication-policy=automatic

# Grant Cloud Run access to secrets
gcloud secrets add-iam-policy-binding clerk-secret-key \
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### Phase 3: Database Setup (30 minutes)

#### 3.1 Create Cloud SQL Instance

```bash
# Create PostgreSQL instance with encryption
gcloud sql instances create medical-surveys-db \
  --database-version=POSTGRES_15 \
  --tier=db-custom-2-7680 \
  --region=$REGION \
  --disk-type=SSD \
  --disk-size=100GB \
  --disk-encryption-key=projects/$PROJECT_ID/locations/$REGION/keyRings/medical-surveys-keyring/cryptoKeys/cloudsql-encryption-key \
  --backup \
  --backup-start-time=03:00 \
  --enable-bin-log \
  --retained-backups-count=30 \
  --transaction-log-retention-days=7 \
  --database-flags=cloudsql.enable_pgaudit=on,log_connections=on,log_disconnections=on

# Set password from Secret Manager
gcloud sql users set-password postgres \
  --instance=medical-surveys-db \
  --password=$(gcloud secrets versions access latest --secret="cloudsql-password")

# Create application database
gcloud sql databases create medical_surveys \
  --instance=medical-surveys-db

# Create application user
gcloud sql users create app_user \
  --instance=medical-surveys-db \
  --password=$(openssl rand -base64 32)
```

#### 3.2 Enable Private IP for Cloud SQL

```bash
# Allocate IP range for private services
gcloud compute addresses create google-managed-services-default \
  --global \
  --purpose=VPC_PEERING \
  --prefix-length=16 \
  --network=default

# Create private connection
gcloud services vpc-peerings connect \
  --service=servicenetworking.googleapis.com \
  --ranges=google-managed-services-default \
  --network=default
```

### Phase 4: Storage Setup (15 minutes)

#### 4.1 Create Cloud Storage Bucket

```bash
# Create bucket for PHI storage
gsutil mb -p $PROJECT_ID \
  -c STANDARD \
  -l $REGION \
  -b on \
  gs://medical-surveys-phi-$PROJECT_ID/

# Enable encryption with CMEK
gsutil kms encryption \
  -k projects/$PROJECT_ID/locations/$REGION/keyRings/medical-surveys-keyring/cryptoKeys/storage-encryption-key \
  gs://medical-surveys-phi-$PROJECT_ID/

# Enable uniform bucket-level access
gsutil uniformbucketlevelaccess set on \
  gs://medical-surveys-phi-$PROJECT_ID/

# Enable versioning (for audit trail)
gsutil versioning set on \
  gs://medical-surveys-phi-$PROJECT_ID/

# Set lifecycle policy for old versions
cat > lifecycle.json <<EOF
{
  "lifecycle": {
    "rule": [
      {
        "action": {"type": "Delete"},
        "condition": {
          "numNewerVersions": 5,
          "isLive": false
        }
      }
    ]
  }
}
EOF

gsutil lifecycle set lifecycle.json \
  gs://medical-surveys-phi-$PROJECT_ID/

# Create folder structure
gsutil -m mkdir \
  gs://medical-surveys-phi-$PROJECT_ID/consent-forms/ \
  gs://medical-surveys-phi-$PROJECT_ID/exports/ \
  gs://medical-surveys-phi-$PROJECT_ID/attachments/
```

### Phase 5: Audit Logging Setup (20 minutes)

#### 5.1 Configure Cloud Logging

```bash
# Create log sink to BigQuery for long-term storage
bq mk --dataset \
  --location=$REGION \
  --default_table_expiration=189216000 \
  $PROJECT_ID:audit_logs

# Create PHI access log table
bq mk --table \
  $PROJECT_ID:audit_logs.phi_access_logs \
  timestamp:TIMESTAMP,userId:STRING,userRole:STRING,action:STRING,resourceType:STRING,resourceId:STRING,phiAccessed:BOOLEAN,phiFields:STRING,ipAddress:STRING,success:BOOLEAN

# Create log sink
gcloud logging sinks create phi-audit-logs \
  bigquery.googleapis.com/projects/$PROJECT_ID/datasets/audit_logs \
  --log-filter='resource.type="cloud_run_revision"
    AND jsonPayload.phiAccessed=true'
```

#### 5.2 Enable Data Access Logging

```bash
# Enable data access audit logs (required for HIPAA)
cat > audit-config.yaml <<EOF
auditConfigs:
- auditLogConfigs:
  - logType: DATA_READ
  - logType: DATA_WRITE
  - logType: ADMIN_READ
  service: allServices
EOF

gcloud projects set-iam-policy $PROJECT_ID audit-config.yaml
```

### Phase 6: Application Deployment (30 minutes)

#### 6.1 Build Container Image

```bash
# Navigate to project directory
cd /path/to/google-forms-clone-yt

# Create Dockerfile if not exists
cat > Dockerfile <<EOF
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment to production
ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

CMD ["node", "server.js"]
EOF

# Build and push to Google Container Registry
gcloud builds submit --tag gcr.io/$PROJECT_ID/medical-surveys:v1
```

#### 6.2 Deploy to Cloud Run

```bash
# Deploy with HIPAA-compliant settings
gcloud run deploy medical-surveys \
  --image=gcr.io/$PROJECT_ID/medical-surveys:v1 \
  --platform=managed \
  --region=$REGION \
  --memory=2Gi \
  --cpu=2 \
  --min-instances=1 \
  --max-instances=100 \
  --timeout=60s \
  --concurrency=80 \
  --set-env-vars="NODE_ENV=production" \
  --set-env-vars="GCP_PROJECT_ID=$PROJECT_ID" \
  --set-env-vars="GCP_KMS_LOCATION=$REGION" \
  --set-env-vars="ENABLE_AUDIT_LOGGING=true" \
  --set-secrets="CLERK_SECRET_KEY=clerk-secret-key:latest" \
  --set-secrets="DATABASE_PASSWORD=cloudsql-password:latest" \
  --add-cloudsql-instances=$PROJECT_ID:$REGION:medical-surveys-db \
  --add-cloudsql-instances=$PROJECT_ID:$REGION:medical-surveys-db \
  # Note: A VPC connector is required for Cloud Run to connect to Cloud SQL via private IP. Create one first.
  # Example: gcloud compute networks vpc-access connectors create medical-surveys-connector --region=$REGION --range=10.8.0.0/28
  --vpc-connector=medical-surveys-connector \
  --ingress=all \
  --allow-unauthenticated \
  --service-account=medical-surveys-sa@$PROJECT_ID.iam.gserviceaccount.com
```

### Phase 7: Security Hardening (30 minutes)

#### 7.1 Configure Cloud Armor (WAF & DDoS Protection)

```bash
# Create security policy
gcloud compute security-policies create medical-surveys-policy \
  --description="HIPAA security policy for medical surveys"

# Add rate limiting rule
gcloud compute security-policies rules create 1000 \
  --security-policy=medical-surveys-policy \
  --expression="true" \
  --action=rate-based-ban \
  --rate-limit-threshold-count=100 \
  --rate-limit-threshold-interval-sec=60 \
  --ban-duration-sec=600

# Block common attack patterns
gcloud compute security-policies rules create 2000 \
  --security-policy=medical-surveys-policy \
  --expression="evaluatePreconfiguredExpr('xss-stable')" \
  --action=deny-403

gcloud compute security-policies rules create 3000 \
  --security-policy=medical-surveys-policy \
  --expression="evaluatePreconfiguredExpr('sqli-stable')" \
  --action=deny-403

# Apply policy to Cloud Run (via load balancer)
# Note: Direct Cloud Run doesn't support Cloud Armor
# Use with Load Balancer for additional protection
```

#### 7.2 Configure VPC Service Controls

```bash
# Create access policy (org-level)
gcloud access-context-manager policies create \
  --title="Medical Surveys Access Policy" \
  --organization=YOUR_ORG_ID

# Create service perimeter
gcloud access-context-manager perimeters create medical_surveys_perimeter \
  --title="Medical Surveys Perimeter" \
  --resources=projects/$PROJECT_NUMBER \
  --restricted-services=storage.googleapis.com,sqladmin.googleapis.com \
  --policy=POLICY_ID
```

#### 7.3 Set Up IAM Roles (Least Privilege)

```bash
# Create service account for Cloud Run
gcloud iam service-accounts create medical-surveys-sa \
  --display-name="Medical Surveys Service Account"

# Grant minimal permissions
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:medical-surveys-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:medical-surveys-sa@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/cloudkms.cryptoKeyEncrypterDecrypter"

gsutil iam ch \
  serviceAccount:medical-surveys-sa@$PROJECT_ID.iam.gserviceaccount.com:objectAdmin \
  gs://medical-surveys-phi-$PROJECT_ID/
```

### Phase 8: Monitoring & Alerting (20 minutes)

#### 8.1 Enable Security Command Center

```bash
# Enable Security Command Center (org-level)
# This must be done via Console: https://console.cloud.google.com/security

# Create alert for unauthorized access
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="Unauthorized PHI Access" \
  --condition-display-name="Failed PHI access attempts" \
  --condition-filter='resource.type="cloud_run_revision"
    AND jsonPayload.action="VIEW_PHI"
    AND jsonPayload.success=false' \
  --condition-threshold-value=5 \
  --condition-threshold-duration=300s
```

#### 8.2 Set Up Dashboards

```bash
# Create custom dashboard for PHI access monitoring
# (Use Cloud Console UI for visual dashboard creation)
```

## Post-Deployment Configuration

### 1. Database Migration

```bash
# Run database migrations
# Connect to Cloud SQL proxy locally
cloud_sql_proxy -instances=$PROJECT_ID:$REGION:medical-surveys-db=tcp:5432 &

# Run migrations
npm run migrate:prod
```

### 2. Initial Admin User Setup

```bash
# Create first admin user via Clerk dashboard
# Assign UserRole.SYSTEM_ADMIN in database
```

### 3. Configure Clerk

1. Go to Clerk dashboard
2. Set up production environment
3. Configure OAuth providers if needed
4. Set redirect URLs to Cloud Run URL
5. Enable MFA for admin roles

## Compliance Verification Checklist

- [ ] Verify all services are in HIPAA-eligible regions (us-central1, us-east1, etc.)
- [ ] Confirm encryption at rest enabled for all data stores
- [ ] Verify Cloud KMS key rotation is configured (90 days)
- [ ] Test audit logging - confirm PHI access is logged
- [ ] Verify backup retention (30 days for Cloud SQL)
- [ ] Test data recovery from backups
- [ ] Confirm VPC isolation is working
- [ ] Verify IAM permissions follow least privilege
- [ ] Test rate limiting with Cloud Armor
- [ ] Confirm Secret Manager is used (no plaintext secrets)
- [ ] Verify automatic logout after session timeout
- [ ] Test MFA for privileged users
- [ ] Confirm audit logs are sent to BigQuery
- [ ] Test breach notification email workflow
- [ ] Verify de-identification for research exports

## Cost Estimate (Monthly)

| Service | Configuration | Estimated Cost |
|---------|--------------|----------------|
| Cloud Run | 2 vCPU, 2GB RAM, 1M requests | $50-100 |
| Cloud SQL | db-custom-2-7680, 100GB SSD | $200-300 |
| Cloud Storage | 500GB with versioning | $10-20 |
| Cloud KMS | 3 keys with 10K operations/month | $3 |
| BigQuery | 100GB storage, 1TB queries | $50-100 |
| Cloud Logging | 50GB/month | $25 |
| Secret Manager | 10 secrets | $1 |
| VPC | Connector + egress | $10-20 |
| **Total** | | **$349-569/month** |

## Maintenance Tasks

### Daily
- Monitor audit logs for unusual activity
- Check error logs in Cloud Logging

### Weekly
- Review access patterns
- Check database performance metrics
- Review security alerts

### Monthly
- Review IAM permissions
- Audit user access logs
- Review and test backups
- Check encryption key usage

### Quarterly
- Rotate encryption keys
- Review and update security policies
- Penetration testing
- HIPAA compliance audit

### Annually
- Renew GCP BAA (if needed)
- Full security assessment
- Update incident response plan
- Staff HIPAA training

## Troubleshooting

### Common Issues

**Issue**: Cloud Run can't connect to Cloud SQL
**Solution**: Verify Cloud SQL connector is added and service account has `cloudsql.client` role

**Issue**: Encryption/decryption failing
**Solution**: Check Cloud KMS permissions and verify key location matches deployment region

**Issue**: Audit logs not appearing in BigQuery
**Solution**: Verify log sink filter and check IAM permissions for log writer service account

**Issue**: High latency
**Solution**: Increase Cloud Run CPU/memory, check database query performance, enable Cloud CDN

## Support & Resources

- **GCP HIPAA Compliance**: https://cloud.google.com/security/compliance/hipaa
- **Cloud SQL Best Practices**: https://cloud.google.com/sql/docs/postgres/best-practices
- **Cloud Run Documentation**: https://cloud.google.com/run/docs
- **HIPAA Audit Logging**: https://cloud.google.com/logging/docs/audit

## Emergency Contacts

- **HIPAA Security Officer**: [Your security officer email]
- **HIPAA Privacy Officer**: [Your privacy officer email]
- **GCP Support**: Enterprise support via Console
- **On-call Engineer**: [Your on-call contact]

---

**Last Updated**: [Current Date]
**Next Review**: [Date + 90 days]
