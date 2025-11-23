# Database Setup Guide

## Overview

This project uses **Prisma ORM** with **PostgreSQL** for HIPAA-compliant data storage. The database schema includes 18 models covering:

- Forms and responses
- Participant management
- Consent tracking
- Audit logging (6-year retention)
- Distribution and tracking
- Notifications
- File storage metadata
- Workflow automation
- Break-glass emergency access

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

This will install:
- `@prisma/client` - Prisma client for database queries
- `prisma` - Prisma CLI for migrations and schema management

### 2. Set Up Database

#### Option A: Local PostgreSQL (Development)

```bash
# Install PostgreSQL locally
brew install postgresql  # macOS
# or
sudo apt-get install postgresql  # Linux

# Start PostgreSQL
brew services start postgresql  # macOS
# or
sudo service postgresql start  # Linux

# Create database
createdb medical_surveys_dev

# Set environment variable
echo "DATABASE_URL=postgresql://localhost:5432/medical_surveys_dev" >> .env.local
```

#### Option B: GCP Cloud SQL (Production)

```bash
# Use the automated setup script
./scripts/setup-gcp.sh

# Or manually:
# 1. Create Cloud SQL instance in GCP Console
# 2. Enable Cloud SQL Admin API
# 3. Create database: medical_surveys
# 4. Create user: app_user
# 5. Store password in Secret Manager
# 6. Get connection string and add to .env.local
```

### 3. Run Migrations

```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database (development)
npm run db:push

# Or create a migration (production)
npm run db:migrate
```

### 4. Seed Database (Optional)

```bash
# Seed with test data
npm run db:seed
```

### 5. Explore Database

```bash
# Open Prisma Studio (visual database editor)
npm run db:studio
```

## Database Schema

### Core Models

#### Forms
- **Form** - Survey form definitions with fields and settings
- **Response** - Survey responses with encrypted PHI fields

#### Participants
- **Participant** - Participant registry with encrypted identifiers
- **Cohort** - Participant groupings for research
- **CohortParticipant** - Many-to-many relationship

#### Consent
- **ConsentStatus** - Consent grants/withdrawals with expiration

#### Audit (HIPAA §164.312(b))
- **AuditLog** - Comprehensive activity logging
- **BreakGlassAccess** - Emergency access tracking

#### Distribution
- **DistributionLink** - QR codes and unique survey links
- **DistributionClick** - Click tracking and analytics

#### Notifications
- **NotificationQueue** - Email/SMS notification queue

#### Files
- **File** - File upload metadata (storage in GCS)

#### Search
- **SavedSearch** - User saved search queries

#### Workflows
- **Workflow** - Custom workflow definitions
- **WorkflowExecution** - Workflow run history
- **ApprovalRequest** - Multi-step approvals

#### Users
- **UserProfile** - User profiles synced from Clerk

## Environment Variables

Required in `.env.local`:

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/database"
DATABASE_ENCRYPTION_AT_REST=true
DATABASE_SSL_MODE=require

# GCP Cloud SQL (Production)
GCP_CLOUDSQL_INSTANCE=project:region:instance
GCP_CLOUDSQL_DATABASE=medical_surveys
GCP_CLOUDSQL_USER=app_user
```

## Common Commands

```bash
# Generate Prisma Client after schema changes
npm run db:generate

# Push schema to database (development - no migration history)
npm run db:push

# Create migration (production - with history)
npm run db:migrate

# Open Prisma Studio
npm run db:studio

# Seed database
npm run db:seed

# Reset database (⚠️ DELETES ALL DATA)
npx prisma migrate reset
```

## Migration Workflow

### Development

```bash
# Make changes to schema.prisma
# Push changes directly (no migration files)
npm run db:push
```

### Production

```bash
# 1. Make changes to schema.prisma

# 2. Create migration
npm run db:migrate
# This creates a new migration file in prisma/migrations/

# 3. Review the migration SQL
cat prisma/migrations/YYYYMMDDHHMMSS_migration_name/migration.sql

# 4. Test migration on staging
DATABASE_URL="postgresql://staging..." npx prisma migrate deploy

# 5. Deploy to production
DATABASE_URL="postgresql://production..." npx prisma migrate deploy
```

## Data Retention

Per HIPAA requirements, audit logs must be retained for **6 years minimum**.

**Retention Strategy:**

1. **Hot Storage (PostgreSQL)** - Last 90 days
   - Fast queries for recent activity
   - Full-text search enabled

2. **Cold Storage (BigQuery)** - 6+ years
   - Archive logs older than 90 days
   - Use scheduled job: `scripts/archive-audit-logs.sh`

3. **Backup (GCS)** - Encrypted backups
   - Daily automated backups
   - 7-year retention

## Security Considerations

### Encryption

- **At Rest**: Enable PostgreSQL encryption or use Cloud SQL automatic encryption
- **In Transit**: Always use SSL/TLS connections (`sslmode=require`)
- **PHI Fields**: Application-level AES-256-GCM encryption before storage

### Access Control

- **Least Privilege**: Database users should have minimal permissions
- **Audit Logging**: All database access is logged
- **Network Isolation**: Use VPC for production databases

### Sensitive Fields

These fields contain encrypted PHI:
- `Participant.mrn` - Medical Record Number
- `Participant.email` - Email address
- `Participant.phone` - Phone number
- `Response.responses` - Survey responses (if containsPHI=true)

**Never store PHI in plaintext!**

## Backup & Recovery

### Automated Backups (GCP Cloud SQL)

```bash
# Enable automated backups in Cloud SQL
gcloud sql instances patch INSTANCE_NAME \
  --backup-start-time=02:00 \
  --retained-backups-count=30

# Point-in-time recovery (last 7 days)
gcloud sql backups restore BACKUP_ID \
  --instance=INSTANCE_NAME
```

### Manual Backup

```bash
# Export database
pg_dump -h HOST -U USER DATABASE > backup.sql

# Encrypt backup
gpg --encrypt --recipient security@example.com backup.sql

# Upload to secure storage
gsutil cp backup.sql.gpg gs://backups-bucket/
```

### Recovery

```bash
# Download backup
gsutil cp gs://backups-bucket/backup.sql.gpg .

# Decrypt
gpg --decrypt backup.sql.gpg > backup.sql

# Restore
psql -h HOST -U USER DATABASE < backup.sql
```

## Troubleshooting

### Connection Issues

```bash
# Test connection
psql $DATABASE_URL

# Check SSL mode
psql "$DATABASE_URL?sslmode=require"

# Cloud SQL Proxy (GCP)
cloud_sql_proxy -instances=PROJECT:REGION:INSTANCE=tcp:5432
```

### Migration Errors

```bash
# Check migration status
npx prisma migrate status

# Resolve migration conflicts
npx prisma migrate resolve --applied "20230101000000_migration_name"

# Force reset (⚠️ DELETES ALL DATA)
npx prisma migrate reset
```

### Performance Issues

```bash
# Add indexes for slow queries
# Edit schema.prisma, add @@index([field])

# Analyze query performance
EXPLAIN ANALYZE SELECT * FROM "Form" WHERE "createdBy" = 'user_123';

# Check for missing indexes
SELECT * FROM pg_stat_user_tables WHERE idx_scan = 0;
```

## Best Practices

1. **Always use migrations in production** - Never use `db:push`
2. **Test migrations on staging first**
3. **Review generated SQL** before applying
4. **Backup before major migrations**
5. **Use connection pooling** (PgBouncer)
6. **Monitor query performance**
7. **Regular security audits**
8. **Rotate database passwords quarterly**

## Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [PostgreSQL HIPAA Compliance](https://www.postgresql.org/docs/current/encryption-options.html)
- [GCP Cloud SQL](https://cloud.google.com/sql/docs)
- [Database Security Checklist](../docs/DATABASE_SECURITY.md)
