#!/bin/bash
#
# GCP HIPAA-Compliant Medical Survey System - Initial Setup Script
#
# This script sets up the core GCP infrastructure for the medical survey system.
# Run this script AFTER you have:
# 1. Installed gcloud CLI
# 2. Authenticated with gcloud (gcloud auth login)
# 3. Confirmed your GCP BAA is current
#
# Usage: ./scripts/setup-gcp.sh
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Print colored output
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    print_error "gcloud CLI is not installed. Please install it first:"
    echo "https://cloud.google.com/sdk/docs/install"
    exit 1
fi

print_header "GCP Medical Survey System Setup"

# Get configuration from user
echo "Please provide the following information:"
echo ""

read -p "GCP Project ID (e.g., medical-surveys-prod): " PROJECT_ID
read -p "GCP Region [us-central1]: " REGION
REGION=${REGION:-us-central1}

read -p "Organization ID (optional, press Enter to skip): " ORG_ID

echo ""
print_warning "This script will create the following resources:"
echo "  - GCP Project (if it doesn't exist)"
echo "  - Cloud KMS keyring and encryption keys"
echo "  - Cloud SQL PostgreSQL instance"
echo "  - Cloud Storage bucket"
echo "  - BigQuery dataset for audit logs"
echo "  - Service accounts with appropriate IAM roles"
echo ""
read -p "Continue? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    print_error "Setup cancelled."
    exit 0
fi

# Set default project
print_header "Step 1: Project Setup"

if gcloud projects describe $PROJECT_ID &> /dev/null; then
    print_success "Project $PROJECT_ID already exists"
else
    echo "Creating new project..."
    if [ -n "$ORG_ID" ]; then
        gcloud projects create $PROJECT_ID \
            --name="Medical Surveys - Production" \
            --organization=$ORG_ID
    else
        gcloud projects create $PROJECT_ID \
            --name="Medical Surveys - Production"
    fi
    print_success "Project created: $PROJECT_ID"
fi

gcloud config set project $PROJECT_ID
print_success "Set active project to $PROJECT_ID"

# Enable billing (user needs to link billing account manually if needed)
print_warning "Ensure billing is enabled for this project in the GCP Console"
echo "https://console.cloud.google.com/billing/linkedaccount?project=$PROJECT_ID"
read -p "Press Enter when billing is confirmed..."

# Enable required APIs
print_header "Step 2: Enabling Required APIs"

APIS=(
    "run.googleapis.com"
    "sql-component.googleapis.com"
    "sqladmin.googleapis.com"
    "storage-api.googleapis.com"
    "storage.googleapis.com"
    "cloudkms.googleapis.com"
    "logging.googleapis.com"
    "bigquery.googleapis.com"
    "secretmanager.googleapis.com"
    "compute.googleapis.com"
    "vpcaccess.googleapis.com"
    "cloudresourcemanager.googleapis.com"
)

for api in "${APIS[@]}"; do
    echo "Enabling $api..."
    gcloud services enable $api --project=$PROJECT_ID
done

print_success "All required APIs enabled"

# Create Cloud KMS keyring and keys
print_header "Step 3: Setting Up Encryption (Cloud KMS)"

KEYRING_NAME="medical-surveys-keyring"
KMS_LOCATION=$REGION

echo "Creating KMS keyring..."
if gcloud kms keyrings describe $KEYRING_NAME --location=$KMS_LOCATION &> /dev/null; then
    print_success "Keyring $KEYRING_NAME already exists"
else
    gcloud kms keyrings create $KEYRING_NAME \
        --location=$KMS_LOCATION \
        --project=$PROJECT_ID
    print_success "Created keyring: $KEYRING_NAME"
fi

# Create encryption keys
KEYS=(
    "phi-encryption-key:Application PHI encryption"
    "cloudsql-encryption-key:Cloud SQL CMEK"
    "storage-encryption-key:Cloud Storage CMEK"
)

for key_info in "${KEYS[@]}"; do
    IFS=':' read -r KEY_NAME KEY_PURPOSE <<< "$key_info"
    echo "Creating key: $KEY_NAME ($KEY_PURPOSE)..."

    if gcloud kms keys describe $KEY_NAME --keyring=$KEYRING_NAME --location=$KMS_LOCATION &> /dev/null; then
        print_success "Key $KEY_NAME already exists"
    else
        gcloud kms keys create $KEY_NAME \
            --location=$KMS_LOCATION \
            --keyring=$KEYRING_NAME \
            --purpose=encryption \
            --rotation-period=90d \
            --next-rotation-time=$(date -u -d '+90 days' +%Y-%m-%dT%H:%M:%SZ) \
            --project=$PROJECT_ID
        print_success "Created key: $KEY_NAME"
    fi
done

# Create BigQuery dataset for audit logs
print_header "Step 4: Setting Up Audit Logging (BigQuery)"

DATASET_NAME="audit_logs"
BQ_LOCATION=$REGION

echo "Creating BigQuery dataset..."
if bq ls -d $PROJECT_ID:$DATASET_NAME &> /dev/null; then
    print_success "Dataset $DATASET_NAME already exists"
else
    bq mk --dataset \
        --location=$BQ_LOCATION \
        --default_table_expiration=189216000 \
        --description="HIPAA audit logs - 6 year retention" \
        $PROJECT_ID:$DATASET_NAME
    print_success "Created dataset: $DATASET_NAME"
fi

echo "Creating audit log table..."
bq mk --table \
    --schema=timestamp:TIMESTAMP,userId:STRING,userRole:STRING,action:STRING,resourceType:STRING,resourceId:STRING,phiAccessed:BOOLEAN,phiFields:STRING,ipAddress:STRING,sessionId:STRING,success:BOOLEAN,organizationId:STRING \
    --time_partitioning_field=timestamp \
    --time_partitioning_type=DAY \
    --description="PHI access audit logs" \
    $PROJECT_ID:$DATASET_NAME.phi_access_logs 2>/dev/null || print_success "Table phi_access_logs already exists"

# Create Cloud Storage bucket
print_header "Step 5: Setting Up File Storage (Cloud Storage)"

BUCKET_NAME="${PROJECT_ID}-phi"

echo "Creating Cloud Storage bucket..."
if gsutil ls gs://$BUCKET_NAME &> /dev/null; then
    print_success "Bucket $BUCKET_NAME already exists"
else
    gsutil mb -p $PROJECT_ID \
        -c STANDARD \
        -l $REGION \
        -b on \
        gs://$BUCKET_NAME/
    print_success "Created bucket: $BUCKET_NAME"
fi

echo "Configuring bucket encryption..."
STORAGE_KEY_PATH="projects/$PROJECT_ID/locations/$KMS_LOCATION/keyRings/$KEYRING_NAME/cryptoKeys/storage-encryption-key"
gsutil kms encryption -k $STORAGE_KEY_PATH gs://$BUCKET_NAME/

echo "Enabling uniform bucket-level access..."
gsutil uniformbucketlevelaccess set on gs://$BUCKET_NAME/

echo "Enabling versioning..."
gsutil versioning set on gs://$BUCKET_NAME/

echo "Creating folder structure..."
gsutil -m mkdir \
    gs://$BUCKET_NAME/consent-forms/ \
    gs://$BUCKET_NAME/exports/ \
    gs://$BUCKET_NAME/attachments/

print_success "Cloud Storage bucket configured"

# Create service account
print_header "Step 6: Creating Service Account"

SERVICE_ACCOUNT_NAME="medical-surveys-sa"
SERVICE_ACCOUNT_EMAIL="$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com"

echo "Creating service account..."
if gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL &> /dev/null; then
    print_success "Service account already exists"
else
    gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
        --display-name="Medical Surveys Service Account" \
        --project=$PROJECT_ID
    print_success "Created service account: $SERVICE_ACCOUNT_EMAIL"
fi

echo "Granting IAM roles..."

# Grant necessary roles
ROLES=(
    "roles/cloudkms.cryptoKeyEncrypterDecrypter"
    "roles/secretmanager.secretAccessor"
    "roles/logging.logWriter"
    "roles/bigquery.dataEditor"
)

for role in "${ROLES[@]}"; do
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
        --role="$role" \
        --condition=None \
        --quiet
done

# Grant storage access
gsutil iam ch \
    serviceAccount:$SERVICE_ACCOUNT_EMAIL:objectAdmin \
    gs://$BUCKET_NAME/

print_success "IAM roles granted to service account"

# Create Cloud SQL instance (this takes ~10 minutes)
print_header "Step 7: Creating Cloud SQL Instance"

DB_INSTANCE_NAME="medical-surveys-db"
DB_NAME="medical_surveys"
DB_USER="app_user"

print_warning "Cloud SQL instance creation takes approximately 10 minutes..."

if gcloud sql instances describe $DB_INSTANCE_NAME --project=$PROJECT_ID &> /dev/null; then
    print_success "Cloud SQL instance already exists"
else
    # Generate random password for postgres user
    POSTGRES_PASSWORD=$(openssl rand -base64 32)

    echo "Creating Cloud SQL instance..."
    CLOUDSQL_KEY_PATH="projects/$PROJECT_ID/locations/$REGION/keyRings/$KEYRING_NAME/cryptoKeys/cloudsql-encryption-key"

    gcloud sql instances create $DB_INSTANCE_NAME \
        --database-version=POSTGRES_15 \
        --tier=db-custom-2-7680 \
        --region=$REGION \
        --disk-type=SSD \
        --disk-size=100 \
        --disk-encryption-key=$CLOUDSQL_KEY_PATH \
        --backup \
        --backup-start-time=03:00 \
        --enable-bin-log \
        --retained-backups-count=30 \
        --transaction-log-retention-days=7 \
        --database-flags=cloudsql.enable_pgaudit=on,log_connections=on,log_disconnections=on \
        --project=$PROJECT_ID

    print_success "Cloud SQL instance created"

    # Set postgres password
    echo "Setting postgres user password..."
    gcloud sql users set-password postgres \
        --instance=$DB_INSTANCE_NAME \
        --password="$POSTGRES_PASSWORD" \
        --project=$PROJECT_ID

    # Store password in Secret Manager
    echo "Storing postgres password in Secret Manager..."
    echo -n "$POSTGRES_PASSWORD" | \
        gcloud secrets create cloudsql-postgres-password \
            --data-file=- \
            --replication-policy=automatic \
            --project=$PROJECT_ID

    print_success "Postgres password stored in Secret Manager"
fi

# Create database
echo "Creating application database..."
gcloud sql databases create $DB_NAME \
    --instance=$DB_INSTANCE_NAME \
    --project=$PROJECT_ID 2>/dev/null || print_success "Database $DB_NAME already exists"

# Create application user
echo "Creating application user..."
APP_USER_PASSWORD=$(openssl rand -base64 32)
gcloud sql users create $DB_USER \
    --instance=$DB_INSTANCE_NAME \
    --password="$APP_USER_PASSWORD" \
    --project=$PROJECT_ID 2>/dev/null || print_success "User $DB_USER already exists"

# Store app user password in Secret Manager
echo -n "$APP_USER_PASSWORD" | \
    gcloud secrets create cloudsql-app-password \
        --data-file=- \
        --replication-policy=automatic \
        --project=$PROJECT_ID 2>/dev/null || \
    echo -n "$APP_USER_PASSWORD" | \
    gcloud secrets versions add cloudsql-app-password \
        --data-file=- \
        --project=$PROJECT_ID

print_success "Application user created and password stored"

# Get Cloud SQL connection name
CONNECTION_NAME=$(gcloud sql instances describe $DB_INSTANCE_NAME \
    --project=$PROJECT_ID \
    --format="value(connectionName)")

# Summary
print_header "Setup Complete!"

echo -e "${GREEN}Your GCP infrastructure is ready!${NC}\n"
echo "Project ID: $PROJECT_ID"
echo "Region: $REGION"
echo ""
echo "Resources created:"
echo "  ✓ Cloud KMS keyring with 3 encryption keys (90-day rotation)"
echo "  ✓ Cloud SQL PostgreSQL instance (with CMEK encryption)"
echo "  ✓ Cloud Storage bucket (with versioning and encryption)"
echo "  ✓ BigQuery dataset for audit logs (6-year retention)"
echo "  ✓ Service account with appropriate IAM roles"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo ""
echo "1. Update your .env.local file with these values:"
echo ""
echo "   GCP_PROJECT_ID=$PROJECT_ID"
echo "   GCP_KMS_LOCATION=$REGION"
echo "   GCP_KMS_KEYRING_NAME=$KEYRING_NAME"
echo "   GCP_KMS_KEY_NAME=phi-encryption-key"
echo "   GCP_STORAGE_BUCKET=$BUCKET_NAME"
echo "   GCP_BIGQUERY_DATASET=$DATASET_NAME"
echo "   GCP_CLOUDSQL_INSTANCE=$CONNECTION_NAME"
echo "   GCP_CLOUDSQL_DATABASE=$DB_NAME"
echo "   GCP_CLOUDSQL_USER=$DB_USER"
echo ""
echo "2. Retrieve database password from Secret Manager:"
echo "   gcloud secrets versions access latest --secret=cloudsql-app-password --project=$PROJECT_ID"
echo ""
echo "3. Set up Clerk authentication (Enterprise/Healthcare plan with BAA)"
echo "   https://dashboard.clerk.com"
echo ""
echo "4. Deploy application to Cloud Run:"
echo "   ./scripts/deploy-cloud-run.sh"
echo ""
echo -e "${GREEN}Configuration file created: gcp-config.env${NC}"

# Create config file
cat > gcp-config.env <<EOF
# GCP Configuration - Generated $(date)
# Copy these values to your .env.local file

GCP_PROJECT_ID=$PROJECT_ID
GCP_KMS_LOCATION=$REGION
GCP_KMS_KEYRING_NAME=$KEYRING_NAME
GCP_KMS_KEY_NAME=phi-encryption-key
GCP_STORAGE_BUCKET=$BUCKET_NAME
GCP_BIGQUERY_DATASET=$DATASET_NAME
GCP_CLOUDSQL_INSTANCE=$CONNECTION_NAME
GCP_CLOUDSQL_DATABASE=$DB_NAME
GCP_CLOUDSQL_USER=$DB_USER

# Retrieve password with:
# gcloud secrets versions access latest --secret=cloudsql-app-password --project=$PROJECT_ID
EOF

print_success "Setup script completed successfully!"
echo ""
print_warning "IMPORTANT: Verify your GCP BAA covers all these services before handling real PHI"
echo ""
