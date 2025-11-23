/**
 * Database Seed Script
 * Populates database with test data for development
 *
 * Usage: npm run db:seed
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data (development only!)
  if (process.env.NODE_ENV === 'development') {
    console.log('  🗑️  Cleaning existing data...');
    await prisma.auditLog.deleteMany();
    await prisma.response.deleteMany();
    await prisma.distributionClick.deleteMany();
    await prisma.distributionLink.deleteMany();
    await prisma.form.deleteMany();
    await prisma.cohortParticipant.deleteMany();
    await prisma.cohort.deleteMany();
    await prisma.consentStatus.deleteMany();
    await prisma.participant.deleteMany();
    await prisma.userProfile.deleteMany();
  }

  // 1. Create User Profiles
  console.log('  👤 Creating user profiles...');
  const adminUser = await prisma.userProfile.create({
    data: {
      clerkUserId: 'user_test_admin',
      email: 'admin@example.com',
      role: 'system_admin',
      organizationId: 'org_medical_center',
      organizationName: 'Medical Research Center',
      mfaEnabled: true,
      sessionTimeout: 10,
      notificationPrefs: {
        email: true,
        newResponses: true,
        consentExpiring: true
      }
    }
  });

  const researchUser = await prisma.userProfile.create({
    data: {
      clerkUserId: 'user_test_researcher',
      email: 'researcher@example.com',
      role: 'research_coordinator',
      organizationId: 'org_medical_center',
      organizationName: 'Medical Research Center',
      mfaEnabled: false,
      sessionTimeout: 15,
      notificationPrefs: {
        email: true,
        newResponses: true
      }
    }
  });

  // 2. Create Forms
  console.log('  📝 Creating sample forms...');
  const satisfactionForm = await prisma.form.create({
    data: {
      title: 'Patient Satisfaction Survey',
      description: 'Anonymous feedback on recent visit',
      category: 'satisfaction',
      dataClassification: 'Anonymous',
      containsPHI: false,
      consentRequired: false,
      status: 'active',
      allowedRoles: ['research_coordinator', 'clinical_staff'],
      retentionPeriodDays: 2555, // 7 years
      fields: [
        {
          id: 'rating',
          type: 'rating',
          label: 'Overall satisfaction',
          required: true,
          isPHI: false,
          minValue: 1,
          maxValue: 5,
          order: 0
        },
        {
          id: 'recommend',
          type: 'radio',
          label: 'Would you recommend us?',
          required: true,
          isPHI: false,
          options: [
            { id: '1', label: 'Yes', value: 'yes' },
            { id: '2', label: 'No', value: 'no' },
            { id: '3', label: 'Maybe', value: 'maybe' }
          ],
          order: 1
        },
        {
          id: 'feedback',
          type: 'textarea',
          label: 'Additional feedback',
          required: false,
          isPHI: false,
          order: 2
        }
      ],
      settings: {
        allowAnonymous: true,
        requireConsent: false,
        isPublic: true,
        allowMultipleSubmissions: false,
        notifyOnSubmission: true,
        notificationEmails: ['researcher@example.com'],
        containsPHI: false,
        dataClassification: 'Anonymous',
        retentionPeriodDays: 2555,
        allowedRoles: ['research_coordinator', 'clinical_staff'],
        enableAutoSave: true,
        showProgressBar: true
      },
      createdBy: researchUser.clerkUserId,
      publishedAt: new Date()
    }
  });

  const intakeForm = await prisma.form.create({
    data: {
      title: 'New Patient Intake Form',
      description: 'Comprehensive patient information collection',
      category: 'patient-intake',
      dataClassification: 'PHI',
      containsPHI: true,
      consentRequired: true,
      consentText: 'I consent to the collection and use of my health information for treatment purposes.',
      status: 'active',
      allowedRoles: ['physician', 'clinical_staff'],
      retentionPeriodDays: 2555,
      fields: [
        {
          id: 'full_name',
          type: 'text',
          label: 'Full Name',
          required: true,
          isPHI: true,
          phiType: 'NAME',
          order: 0
        },
        {
          id: 'dob',
          type: 'date',
          label: 'Date of Birth',
          required: true,
          isPHI: true,
          phiType: 'DATE_OF_BIRTH',
          order: 1
        },
        {
          id: 'email',
          type: 'email',
          label: 'Email Address',
          required: true,
          isPHI: true,
          phiType: 'EMAIL',
          order: 2
        },
        {
          id: 'phone',
          type: 'tel',
          label: 'Phone Number',
          required: true,
          isPHI: true,
          phiType: 'PHONE',
          order: 3
        }
      ],
      settings: {
        allowAnonymous: false,
        requireConsent: true,
        isPublic: false,
        allowMultipleSubmissions: false,
        notifyOnSubmission: true,
        notificationEmails: ['admin@example.com'],
        containsPHI: true,
        dataClassification: 'PHI',
        retentionPeriodDays: 2555,
        allowedRoles: ['physician', 'clinical_staff'],
        enableAutoSave: true,
        showProgressBar: true
      },
      createdBy: adminUser.clerkUserId,
      publishedAt: new Date()
    }
  });

  // 3. Create Distribution Links
  console.log('  🔗 Creating distribution links...');
  const publicLink = await prisma.distributionLink.create({
    data: {
      formId: satisfactionForm.id,
      type: 'public',
      url: `http://localhost:3000/forms/${satisfactionForm.id}`,
      isActive: true,
      trackingEnabled: true,
      createdBy: researchUser.clerkUserId,
      currentResponses: 0
    }
  });

  const uniqueLink = await prisma.distributionLink.create({
    data: {
      formId: intakeForm.id,
      type: 'unique',
      url: `http://localhost:3000/forms/${intakeForm.id}?token=abc123`,
      token: 'abc123',
      isActive: true,
      trackingEnabled: true,
      maxResponses: 100,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      createdBy: adminUser.clerkUserId,
      currentResponses: 0
    }
  });

  // 4. Create Sample Responses
  console.log('  💬 Creating sample responses...');
  const response1 = await prisma.response.create({
    data: {
      formId: satisfactionForm.id,
      responses: {
        rating: 5,
        recommend: 'yes',
        feedback: 'Excellent service and care!'
      },
      containsPHI: false,
      dataClassification: 'Anonymous',
      distributionLinkId: publicLink.id,
      completionTime: 120, // 2 minutes
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0'
    }
  });

  const response2 = await prisma.response.create({
    data: {
      formId: satisfactionForm.id,
      responses: {
        rating: 4,
        recommend: 'yes',
        feedback: 'Very good experience overall.'
      },
      containsPHI: false,
      dataClassification: 'Anonymous',
      distributionLinkId: publicLink.id,
      completionTime: 90,
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0'
    }
  });

  // 5. Create Participants
  console.log('  🧑‍⚕️ Creating participants...');
  const participant1 = await prisma.participant.create({
    data: {
      mrn: 'MRN001_ENCRYPTED', // In production, use actual encryption
      email: 'patient1@example.com_ENCRYPTED',
      phone: '+15551234567_ENCRYPTED',
      enrolledAt: new Date(),
      optedOut: false,
      communicationPrefs: {
        email: true,
        sms: false,
        preferredLanguage: 'en'
      }
    }
  });

  // 6. Create Cohorts
  console.log('  👥 Creating cohorts...');
  const diabetesCohort = await prisma.cohort.create({
    data: {
      name: 'Diabetes Study Cohort',
      description: 'Participants enrolled in diabetes research study',
      criteria: {
        diagnosis: 'Type 2 Diabetes',
        ageRange: { min: 40, max: 65 },
        includeOnMedication: true
      },
      createdBy: researchUser.clerkUserId
    }
  });

  await prisma.cohortParticipant.create({
    data: {
      cohortId: diabetesCohort.id,
      participantId: participant1.id,
      addedBy: researchUser.clerkUserId
    }
  });

  // 7. Create Consent Records
  console.log('  ✅ Creating consent records...');
  await prisma.consentStatus.create({
    data: {
      participantId: participant1.id,
      formId: intakeForm.id,
      consentType: 'research',
      grantedAt: new Date(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      status: 'active',
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0'
    }
  });

  // 8. Create Audit Logs
  console.log('  📋 Creating audit logs...');
  await prisma.auditLog.create({
    data: {
      userId: adminUser.clerkUserId,
      userRole: 'system_admin',
      action: 'create_form',
      resourceType: 'form',
      resourceId: intakeForm.id,
      containsPHI: false,
      phiFields: [],
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      success: true,
      details: {
        formTitle: intakeForm.title,
        containsPHI: true
      }
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: researchUser.clerkUserId,
      userRole: 'research_coordinator',
      action: 'view_responses',
      resourceType: 'form',
      resourceId: satisfactionForm.id,
      responseId: response1.id,
      containsPHI: false,
      phiFields: [],
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      success: true
    }
  });

  // 9. Create Notification Queue Items
  console.log('  📧 Creating notification queue...');
  await prisma.notificationQueue.create({
    data: {
      type: 'email',
      recipientId: researchUser.clerkUserId,
      recipientEmail: researchUser.email,
      subject: 'New Survey Response',
      body: 'A new response has been submitted to Patient Satisfaction Survey',
      priority: 5,
      status: 'pending',
      containsPHI: false,
      scheduledFor: new Date()
    }
  });

  console.log('✅ Database seeded successfully!');
  console.log('\n📊 Summary:');
  console.log(`  - ${await prisma.userProfile.count()} user profiles`);
  console.log(`  - ${await prisma.form.count()} forms`);
  console.log(`  - ${await prisma.response.count()} responses`);
  console.log(`  - ${await prisma.participant.count()} participants`);
  console.log(`  - ${await prisma.cohort.count()} cohorts`);
  console.log(`  - ${await prisma.consentStatus.count()} consent records`);
  console.log(`  - ${await prisma.distributionLink.count()} distribution links`);
  console.log(`  - ${await prisma.auditLog.count()} audit logs`);
  console.log(`  - ${await prisma.notificationQueue.count()} queued notifications`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
