# Production Deployment Checklist

Complete checklist for deploying HIPAA-compliant survey platform to production.

## Pre-Deployment Phase (2-4 Weeks Before Launch)

### Legal & Compliance

- [ ] **Business Associate Agreements (BAAs) Signed**
  - [ ] GCP BAA verified (confirmed since 2017)
  - [ ] Clerk Enterprise/Healthcare BAA signed
  - [ ] OneEntry BAA signed (or migrate to GCP Firestore)
  - [ ] Email service provider BAA (if using external email)
  - [ ] Any other third-party service BAAs

- [ ] **HIPAA Officers Designated**
  - [ ] HIPAA Security Officer appointed
  - [ ] HIPAA Privacy Officer appointed
  - [ ] Contact information updated in `.env`
  - [ ] Emergency contacts documented

- [ ] **Policies & Procedures Documented**
  - [ ] Privacy Policy published
  - [ ] Terms of Service published
  - [ ] Notice of Privacy Practices available
  - [ ] Data retention policy documented
  - [ ] Breach notification procedures written
  - [ ] Incident response plan created

### Risk Assessment

- [ ] **Security Risk Assessment Completed**
  - [ ] Threat modeling performed
  - [ ] Vulnerabilities identified
  - [ ] Mitigation strategies documented
  - [ ] Risk register maintained

- [ ] **Privacy Impact Assessment**
  - [ ] Data flows mapped
  - [ ] PHI minimization verified
  - [ ] De-identification methods validated
  - [ ] Access controls reviewed

### Technical Security

- [ ] **Encryption Configured**
  - [ ] Cloud KMS key ring created (3 keys)
  - [ ] 90-day key rotation configured
  - [ ] Database encryption at rest enabled (CMEK)
  - [ ] TLS 1.3 enforced for all connections
  - [ ] Environment variable encryption keys removed
  - [ ] Secrets stored in Secret Manager only

- [ ] **Access Controls Implemented**
  - [ ] RBAC system tested
  - [ ] Permission gates verified
  - [ ] Role assignments reviewed
  - [ ] Least privilege principle enforced
  - [ ] Service account permissions audited

- [ ] **Authentication & Authorization**
  - [ ] Clerk Enterprise plan active
  - [ ] MFA enabled for all privileged roles
  - [ ] Session timeouts configured
  - [ ] Password policies enforced
  - [ ] Session tracking implemented

- [ ] **Audit Logging Operational**
  - [ ] All PHI access logged
  - [ ] Authentication events logged
  - [ ] Admin actions logged
  - [ ] Consent changes logged
  - [ ] Data exports logged
  - [ ] BigQuery retention set to 6+ years
  - [ ] Log review procedures documented

- [ ] **Database Security**
  - [ ] Cloud SQL CMEK encryption enabled
  - [ ] Automated backups configured (30-day retention)
  - [ ] Point-in-time recovery tested
  - [ ] Database credentials in Secret Manager
  - [ ] No public IP access
  - [ ] Cloud SQL Proxy configured

- [ ] **Network Security**
  - [ ] VPC configured (if applicable)
  - [ ] Cloud Armor WAF enabled
  - [ ] DDoS protection active
  - [ ] IP allowlisting configured (if needed)
  - [ ] Private connectivity tested

### Testing & Validation

- [ ] **Security Testing**
  - [ ] Penetration testing completed
  - [ ] Vulnerability scanning performed
  - [ ] SQL injection tests passed
  - [ ] XSS prevention validated
  - [ ] CSRF protection verified
  - [ ] Third-party security audit (recommended)

- [ ] **Functional Testing**
  - [ ] All user flows tested (see Test Scenarios below)
  - [ ] Anonymous survey submission works
  - [ ] Data export with de-identification tested
  - [ ] Break-glass access tested
  - [ ] Session timeout tested for all roles
  - [ ] Consent management tested
  - [ ] Audit log viewing tested

- [ ] **Performance Testing**
  - [ ] Load testing completed (target concurrent users)
  - [ ] Database query optimization verified
  - [ ] Cloud Run auto-scaling tested
  - [ ] Response time < 2 seconds for 95th percentile

- [ ] **Backup & Recovery**
  - [ ] Database backup tested
  - [ ] Restore procedure verified
  - [ ] Disaster recovery plan documented
  - [ ] RTO/RPO targets defined
  - [ ] Failover tested

### Training & Documentation

- [ ] **Staff Training Completed**
  - [ ] HIPAA basics training (all staff)
  - [ ] Platform-specific training
  - [ ] Break-glass procedures training
  - [ ] Incident response training
  - [ ] Training records maintained

- [ ] **Documentation Complete**
  - [ ] SETUP_GUIDE.md reviewed
  - [ ] CLERK_ROLE_SETUP.md reviewed
  - [ ] IRB approval process documented
  - [ ] DUA templates created
  - [ ] User manual created
  - [ ] Admin manual created
  - [ ] API documentation (if applicable)

---

## Deployment Phase (Launch Week)

### Infrastructure Setup

- [ ] **GCP Project Configuration**
  - [ ] Project created with appropriate name
  - [ ] Billing account linked
  - [ ] Organization policies enforced
  - [ ] Labels applied for cost tracking
  - [ ] VPC Service Controls enabled (recommended)

- [ ] **Run Infrastructure Script**
  ```bash
  ./scripts/setup-gcp.sh
  ```
  - [ ] Cloud KMS key ring created
  - [ ] Cloud SQL instance running
  - [ ] Cloud Storage bucket created
  - [ ] BigQuery dataset created
  - [ ] Service account created
  - [ ] IAM roles assigned
  - [ ] Secret Manager secrets created
  - [ ] `gcp-config.env` file generated

- [ ] **Environment Variables Configured**
  - [ ] Production `.env` created (DO NOT commit!)
  - [ ] All secrets moved to Secret Manager
  - [ ] Database URL configured
  - [ ] Clerk production keys set
  - [ ] HIPAA officer emails set
  - [ ] Organization NPI set

### Application Deployment

- [ ] **Build & Deploy**
  ```bash
  ./scripts/deploy-cloud-run.sh
  ```
  - [ ] Docker image built successfully
  - [ ] Image pushed to Artifact Registry
  - [ ] Cloud Run service deployed
  - [ ] Environment variables injected
  - [ ] Cloud SQL connection configured
  - [ ] HTTPS endpoint active

- [ ] **DNS & Domain Configuration**
  - [ ] Custom domain configured (if applicable)
  - [ ] SSL certificate provisioned
  - [ ] DNS records updated
  - [ ] Domain mapping verified
  - [ ] Redirect HTTP → HTTPS

- [ ] **Monitoring & Alerting**
  - [ ] Cloud Monitoring dashboard created
  - [ ] Alert policies configured:
    - [ ] Failed authentication attempts (>5 in 5 min)
    - [ ] High error rate (>1% of requests)
    - [ ] Database connection failures
    - [ ] Cloud Run instance crashes
    - [ ] Disk space warnings
  - [ ] Notification channels set up (email, SMS)
  - [ ] Uptime checks configured
  - [ ] Log-based metrics created

### Post-Deployment Verification

- [ ] **Smoke Tests (Production)**
  - [ ] Homepage loads
  - [ ] Sign-in works
  - [ ] Dashboard accessible
  - [ ] Forms load
  - [ ] Database connection successful
  - [ ] Audit logs writing to BigQuery

- [ ] **Security Verification**
  - [ ] HTTPS enforced (no HTTP access)
  - [ ] Security headers present:
    - [ ] Strict-Transport-Security
    - [ ] Content-Security-Policy
    - [ ] X-Frame-Options
    - [ ] X-Content-Type-Options
  - [ ] No secrets in client-side code
  - [ ] No error messages leaking PHI

- [ ] **Compliance Verification**
  - [ ] Audit logging active
  - [ ] Encryption keys accessible
  - [ ] Backups running
  - [ ] Session timeouts working
  - [ ] MFA enforced for privileged roles

---

## Test Scenarios

### Scenario 1: Anonymous Survey Submission

**Role:** Public (no login)

1. Navigate to public form URL
2. Observe PHI indicators on sensitive fields (name, DOB, etc.)
3. Fill out all required fields
4. Submit form
5. Verify redirect to success page
6. **Expected:** Form submits, PHI fields encrypted before storage

### Scenario 2: Researcher Data Export

**Role:** Research Coordinator

1. Sign in to dashboard
2. Navigate to Forms → Select form with responses
3. Click "Responses" tab
4. Click "Export Data" button
5. Select "Safe Harbor" de-identification
6. Choose CSV format
7. Click "Export Data"
8. **Expected:** CSV downloads with all 18 HIPAA identifiers removed

### Scenario 3: Compliance Officer Audit Review

**Role:** Compliance Officer

1. Sign in to dashboard
2. Navigate to Audit Logs
3. View summary metrics
4. Filter by "PHI Access" events
5. Search for specific user
6. Click "Export" to download audit log
7. **Expected:** All PHI access events visible, exportable

### Scenario 4: Emergency Break-Glass Access

**Role:** Physician

1. Sign in to dashboard
2. Trigger break-glass modal (implementation-specific)
3. Enter detailed justification:
   ```
   Patient John Doe (MRN: 12345) arrived in ER with acute chest pain.
   Need immediate access to cardiac history for life-saving treatment.
   Unable to reach primary care provider.
   ```
4. Click "Grant Emergency Access"
5. **Expected:**
   - Access granted for 1 hour
   - Compliance officer receives email alert
   - Audit log entry created with full justification
   - Banner displayed indicating emergency access mode

### Scenario 5: Session Timeout Test

**Role:** System Admin (10-minute timeout)

1. Sign in to dashboard
2. Wait 9 minutes (no activity)
3. Observe warning modal appears at 9:00 mark
4. Watch countdown from 60 seconds
5. Click "Stay Signed In"
6. **Expected:** Timer resets, user remains logged in

**Alternative:**
1. Sign in, wait 9 minutes
2. Let countdown reach 0
3. **Expected:** Auto-logout, redirect to sign-in with `?session_expired=true`

### Scenario 6: Role-Based Navigation

**Role:** Various

Test menu visibility for each role:

| Role                   | Visible Menu Items                                    |
|-----------------------|------------------------------------------------------|
| Research Coordinator   | Forms, Consent Management, Export Data, Settings     |
| Compliance Officer     | Forms, Consent Management, Audit Logs, Settings      |
| Physician              | Forms, Consent Management, Settings                  |
| Clinical Staff         | Forms, Settings                                      |
| Patient                | Forms, Settings                                      |

### Scenario 7: MFA Enforcement

**Role:** System Admin (MFA required)

1. Sign in with username/password only
2. **Expected:** Prompted to set up 2FA before accessing dashboard
3. Configure authenticator app
4. Enter 6-digit code
5. **Expected:** Access granted, 2FA required on all future logins

---

## Rollback Plan

### If Critical Issues Found Post-Deployment

1. **Immediate Actions:**
   - [ ] Notify Security Officer and Privacy Officer
   - [ ] Document the issue
   - [ ] Assess impact on PHI

2. **Rollback Steps:**
   ```bash
   # Deploy previous working version
   gcloud run deploy hipaa-surveys \
     --image gcr.io/PROJECT_ID/hipaa-surveys:PREVIOUS_VERSION \
     --region us-central1
   ```

3. **Communication:**
   - [ ] Notify all users of temporary maintenance
   - [ ] Send status update every hour
   - [ ] Document root cause

4. **Post-Rollback:**
   - [ ] Conduct incident review
   - [ ] Update deployment checklist
   - [ ] Re-test before next deployment

---

## Post-Launch (First 30 Days)

### Daily Monitoring (Week 1)

- [ ] Review audit logs for anomalies
- [ ] Check error rates in Cloud Monitoring
- [ ] Verify backup jobs successful
- [ ] Monitor authentication failure rates
- [ ] Review Cloud Run resource usage

### Weekly Tasks (Weeks 2-4)

- [ ] Review user feedback
- [ ] Check session timeout effectiveness
- [ ] Analyze most-used features
- [ ] Review encryption key access logs
- [ ] Conduct weekly security scan

### 30-Day Compliance Review

- [ ] **Security Assessment**
  - [ ] Review all audit logs
  - [ ] Analyze access patterns
  - [ ] Check for any unauthorized access attempts
  - [ ] Verify encryption still working

- [ ] **Privacy Assessment**
  - [ ] Review data exports (verify de-identification)
  - [ ] Check consent records
  - [ ] Verify data retention policies enforced
  - [ ] Audit user role assignments

- [ ] **Operational Assessment**
  - [ ] Review system uptime
  - [ ] Analyze performance metrics
  - [ ] Check backup/restore procedures
  - [ ] Review incident log (if any)

- [ ] **Documentation Updates**
  - [ ] Update runbooks based on issues encountered
  - [ ] Document any process improvements
  - [ ] Update training materials
  - [ ] Capture lessons learned

---

## Ongoing Compliance (Quarterly)

### Security Reviews

- [ ] Penetration testing (annual minimum)
- [ ] Vulnerability scanning (monthly)
- [ ] Access control audit (quarterly)
- [ ] Encryption key rotation (automated, verify quarterly)
- [ ] Third-party service review (annual)

### Privacy Reviews

- [ ] Data retention compliance check
- [ ] Consent records audit
- [ ] PHI minimization review
- [ ] De-identification effectiveness validation
- [ ] Breach notification readiness drill

### Training & Awareness

- [ ] Annual HIPAA refresher training
- [ ] Platform updates training
- [ ] Incident response drills (bi-annual)
- [ ] New staff on-boarding

---

## Checklist Sign-Off

### Pre-Deployment Approval

**Security Officer:**

- Signature: ___________________________
- Name: _______________________________
- Date: _______________________________

**Privacy Officer:**

- Signature: ___________________________
- Name: _______________________________
- Date: _______________________________

**IT Manager:**

- Signature: ___________________________
- Name: _______________________________
- Date: _______________________________

### Post-Deployment Verification

**Deployment Engineer:**

- Signature: ___________________________
- Name: _______________________________
- Date: _______________________________
- Deployment Time: _____________________

**Go-Live Approval:**

- Signature: ___________________________
- Name: _______________________________
- Date: _______________________________

---

## Emergency Contacts

| Role                  | Name         | Email                      | Phone          |
|----------------------|--------------|---------------------------|----------------|
| Security Officer     | [NAME]       | ${HIPAA_SECURITY_OFFICER} | [PHONE]        |
| Privacy Officer      | [NAME]       | ${HIPAA_PRIVACY_OFFICER}  | [PHONE]        |
| IT Manager           | [NAME]       | it-manager@org.com        | [PHONE]        |
| Breach Response Team | [NAME]       | ${BREACH_NOTIFICATION}    | [PHONE]        |
| On-Call Engineer     | [NAME/TEAM]  | oncall@org.com            | [PHONE/PAGER]  |

---

## Revision History

| Version | Date       | Author    | Changes                           |
|---------|-----------|-----------|-----------------------------------|
| 1.0     | YYYY-MM-DD | [NAME]    | Initial deployment checklist      |
| 1.1     | YYYY-MM-DD | [NAME]    | Added break-glass test scenario   |

---

**Questions?** Contact your HIPAA Security Officer or review SETUP_GUIDE.md.
