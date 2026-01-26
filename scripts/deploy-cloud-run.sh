#!/bin/bash
#
# Deploy Medical Survey System to GCP Cloud Run
#
# Prerequisites:
# 1. Run setup-gcp.sh first
# 2. Have gcp-config.env file with configuration
# 3. Set up Clerk authentication
# 4. Configure .env.local with all required values
#
# Usage: ./scripts/deploy-cloud-run.sh
#

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Check prerequisites
print_header "Checking Prerequisites"

if [ ! -f "gcp-config.env" ]; then
    print_error "gcp-config.env not found. Run ./scripts/setup-gcp.sh first"
    exit 1
fi

if [ ! -f ".env.local" ]; then
    print_warning ".env.local not found. Creating from .env.example..."
    cp .env.example .env.local
    print_warning "Please edit .env.local with your configuration before deploying"
    exit 1
fi

# Load configuration
source gcp-config.env

print_success "Configuration loaded"

# Check required environment variables
echo "Checking required Clerk configuration..."
if ! grep -q "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_" .env.local; then
    print_error "Clerk publishable key not configured in .env.local"
    echo "Please add your Clerk keys from https://dashboard.clerk.com"
    exit 1
fi

print_success "Environment configuration validated"

# Build and push Docker image
print_header "Building Docker Image"

SERVICE_NAME="medical-surveys"
REGION="us-central1"
IMAGE_NAME="gcr.io/$GCP_PROJECT_ID/$SERVICE_NAME"
VERSION=$(date +%Y%m%d-%H%M%S)
IMAGE_TAG="$IMAGE_NAME:$VERSION"
IMAGE_LATEST="$IMAGE_NAME:latest"

echo "Building image: $IMAGE_TAG"

# Update next.config.mjs for standalone build
if ! grep -q "output: 'standalone'" next.config.mjs; then
    print_warning "Updating next.config.mjs for standalone build..."
    cat > next.config.mjs <<EOF
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
EOF
fi

# Build using Cloud Build (faster, uses GCP infrastructure)
echo "Submitting build to Cloud Build..."
gcloud builds submit \
    --tag $IMAGE_TAG \
    --project=$GCP_PROJECT_ID \
    --timeout=20m

# Tag as latest
gcloud container images add-tag $IMAGE_TAG $IMAGE_LATEST --quiet

print_success "Image built and pushed: $IMAGE_TAG"

# Deploy to Cloud Run
print_header "Deploying to Cloud Run"

# Get secrets
echo "Retrieving database password from Secret Manager..."
DB_PASSWORD=$(gcloud secrets versions access latest \
    --secret=cloudsql-app-password \
    --project=$GCP_PROJECT_ID)

echo "Deploying Cloud Run service..."
gcloud run deploy $SERVICE_NAME \
    --image=$IMAGE_TAG \
    --platform=managed \
    --region=$REGION \
    --memory=2Gi \
    --cpu=2 \
    --min-instances=1 \
    --max-instances=100 \
    --timeout=60s \
    --concurrency=80 \
    --port=3000 \
    --set-env-vars="NODE_ENV=production,GCP_PROJECT_ID=$GCP_PROJECT_ID,GCP_KMS_LOCATION=$GCP_KMS_LOCATION,GCP_KMS_KEYRING_NAME=$GCP_KMS_KEYRING_NAME,ENABLE_AUDIT_LOGGING=true,ENABLE_PHI_ENCRYPTION=true,ENABLE_RESEARCH_SURVEYS=true,ENABLE_QUALITY_IMPROVEMENT=true" \
    --set-secrets="CLERK_SECRET_KEY=clerk-secret-key:latest,DATABASE_PASSWORD=cloudsql-app-password:latest" \
    --add-cloudsql-instances=$GCP_CLOUDSQL_INSTANCE \
    --allow-unauthenticated \
    --service-account=medical-surveys-sa@$GCP_PROJECT_ID.iam.gserviceaccount.com \
    --project=$GCP_PROJECT_ID

# Get service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
    --platform=managed \
    --region=$REGION \
    --project=$GCP_PROJECT_ID \
    --format="value(status.url)")

print_success "Deployment complete!"

# Summary
print_header "Deployment Summary"

echo -e "${GREEN}Your application is now live!${NC}\n"
echo "Service URL: $SERVICE_URL"
echo "Region: $REGION"
echo "Image: $IMAGE_TAG"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo ""
echo "1. Update Clerk redirect URLs:"
echo "   Dashboard: https://dashboard.clerk.com"
echo "   Add this URL: $SERVICE_URL"
echo ""
echo "2. Set up custom domain (optional):"
echo "   gcloud run domain-mappings create --service=$SERVICE_NAME --domain=your-domain.com"
echo ""
echo "3. Configure Cloud Armor for DDoS protection:"
echo "   ./scripts/setup-cloud-armor.sh"
echo ""
echo "4. Run database migrations:"
echo "   # Connect via Cloud SQL Proxy"
echo "   cloud_sql_proxy -instances=$GCP_CLOUDSQL_INSTANCE=tcp:5432 &"
echo "   npm run migrate:prod"
echo ""
echo "5. Test the application:"
echo "   Open: $SERVICE_URL"
echo ""
echo -e "${GREEN}Deployment successful!${NC}"
echo ""
print_warning "REMINDER: Only use with real PHI after completing all HIPAA compliance requirements"
echo ""
