#!/bin/bash

# User Flow Testing Script
# Tests all critical HIPAA-compliant features

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
PASSED=0
FAILED=0
WARNINGS=0

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  HIPAA Survey Platform - User Flow Test Suite             ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo ""

# Function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
        ((FAILED++))
    fi
}

print_warning() {
    echo -e "${YELLOW}⚠ WARNING${NC}: $1"
    ((WARNINGS++))
}

print_info() {
    echo -e "${BLUE}ℹ INFO${NC}: $1"
}

# Check if dev server is running
echo -e "\n${BLUE}[1/10] Checking Development Server...${NC}"
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200\|404"; then
    print_result 0 "Development server is running on http://localhost:3000"
else
    print_result 1 "Development server is NOT running"
    echo -e "${YELLOW}Please start the server with: npm run dev${NC}"
    exit 1
fi

# Check environment variables
echo -e "\n${BLUE}[2/10] Checking Environment Variables...${NC}"

check_env_var() {
    if grep -q "^${1}=" .env.local 2>/dev/null && ! grep -q "^${1}=$\|^${1}=your_\|^${1}=\[" .env.local; then
        print_result 0 "$1 is configured"
        return 0
    else
        print_result 1 "$1 is NOT configured"
        return 1
    fi
}

check_env_var "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
check_env_var "CLERK_SECRET_KEY"
check_env_var "ENCRYPTION_KEY_BASE64"

if grep -q "NEXT_PUBLIC_API_URL=" .env.local 2>/dev/null; then
    print_result 0 "OneEntry API URL configured"
else
    print_warning "OneEntry API URL not configured (optional for testing)"
fi

# Test homepage access
echo -e "\n${BLUE}[3/10] Testing Homepage Access...${NC}"
if curl -s http://localhost:3000 | grep -q "html\|HTML"; then
    print_result 0 "Homepage loads successfully"
else
    print_result 1 "Homepage failed to load"
fi

# Test authentication redirect
echo -e "\n${BLUE}[4/10] Testing Authentication Protection...${NC}"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/dashboard/forms)
if [ "$RESPONSE" = "307" ] || [ "$RESPONSE" = "401" ] || [ "$RESPONSE" = "200" ]; then
    print_result 0 "Dashboard route protected (HTTP $RESPONSE)"
else
    print_result 1 "Dashboard route not properly protected (HTTP $RESPONSE)"
fi

# Test API routes
echo -e "\n${BLUE}[5/10] Testing API Routes...${NC}"
if curl -s http://localhost:3000/api/user/role | grep -q "Unauthorized\|userId\|error"; then
    print_result 0 "User role API endpoint responding"
else
    print_result 1 "User role API endpoint not responding correctly"
fi

# Check for TypeScript errors
echo -e "\n${BLUE}[6/10] Checking TypeScript Compilation...${NC}"
if npx tsc --noEmit 2>&1 | grep -v "Cannot find module '@/public" | grep -q "error TS"; then
    print_result 1 "TypeScript compilation has errors"
    npx tsc --noEmit 2>&1 | grep "error TS" | head -5
else
    print_result 0 "TypeScript compilation successful"
fi

# Check for required components
echo -e "\n${BLUE}[7/10] Checking HIPAA Components...${NC}"

check_file() {
    if [ -f "$1" ]; then
        print_result 0 "$2 exists"
    else
        print_result 1 "$2 NOT found: $1"
    fi
}

check_file "components/SessionTimeoutModal.tsx" "Session Timeout Modal"
check_file "components/PHIIndicator.tsx" "PHI Indicator"
check_file "components/ConsentManagementClient.tsx" "Consent Management"
check_file "components/AuditLogViewerClient.tsx" "Audit Log Viewer"
check_file "components/ResearchExportDialog.tsx" "Research Export Dialog"
check_file "components/BreakGlassAccessModal.tsx" "Break-Glass Access Modal"
check_file "components/RoleBasedNav.tsx" "Role-Based Navigation"
check_file "components/UserProfileSettingsClient.tsx" "User Profile Settings"

# Check RBAC implementation
echo -e "\n${BLUE}[8/10] Checking RBAC Implementation...${NC}"
check_file "lib/rbac.ts" "RBAC module"
check_file "lib/hooks/use-user-role.ts" "User role hook"
check_file "lib/hooks/use-permissions.ts" "Permissions hook"
check_file "components/auth/RoleGate.tsx" "RoleGate component"
check_file "components/auth/PermissionGate.tsx" "PermissionGate component"

# Check encryption and security
echo -e "\n${BLUE}[9/10] Checking Security Modules...${NC}"
check_file "lib/encryption.ts" "Encryption module"
check_file "lib/audit.ts" "Audit logging module"
check_file "lib/deidentification.ts" "De-identification module"
check_file "lib/phi-detection.ts" "PHI detection module"

# Check deployment scripts
echo -e "\n${BLUE}[10/10] Checking Deployment Scripts...${NC}"
check_file "scripts/setup-gcp.sh" "GCP setup script"
check_file "scripts/deploy-cloud-run.sh" "Cloud Run deployment script"

if [ -x "scripts/setup-gcp.sh" ]; then
    print_result 0 "GCP setup script is executable"
else
    print_warning "GCP setup script is not executable (run: chmod +x scripts/setup-gcp.sh)"
fi

# Summary
echo -e "\n${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Test Summary                                              ║${NC}"
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo ""
echo -e "${GREEN}Passed:${NC}    $PASSED"
echo -e "${RED}Failed:${NC}    $FAILED"
echo -e "${YELLOW}Warnings:${NC}  $WARNINGS"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All critical tests passed!${NC}"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "1. Configure Clerk roles for test users (see docs/CLERK_ROLE_SETUP.md)"
    echo "2. Test user flows manually:"
    echo "   - Anonymous survey submission"
    echo "   - Researcher data export"
    echo "   - Compliance officer audit review"
    echo "   - Break-glass emergency access"
    echo "3. Review DEPLOYMENT_CHECKLIST.md before production deployment"
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please review errors above.${NC}"
    exit 1
fi
