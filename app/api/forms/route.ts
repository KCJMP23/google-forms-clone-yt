import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { FormBuilderState } from '@/lib/form-builder-types';
import { auditFormCreation } from '@/lib/audit';
import { requirePermission, Permission } from '@/lib/rbac';
import prisma from '@/lib/prisma';

/**
 * POST /api/forms
 * Create a new form
 */
export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check permissions
    await requirePermission(Permission.CREATE_SURVEY);

    const formData: FormBuilderState = await request.json();

    // Validate form data
    if (!formData.title || formData.sections.length === 0) {
      return NextResponse.json(
        { error: 'Form must have a title and at least one section' },
        { status: 400 }
      );
    }

    // Extract all fields from sections
    const allFields = formData.sections.flatMap(section => section.fields);

    // Save to database using Prisma
    const savedForm = await prisma.form.create({
      data: {
        title: formData.title,
        description: formData.description || '',
        category: 'feedback', // Default category, can be derived from formData
        dataClassification: formData.settings.dataClassification,
        containsPHI: formData.settings.containsPHI,
        consentRequired: formData.settings.requireConsent,
        consentText: formData.settings.consentText,
        retentionPeriodDays: formData.settings.retentionPeriodDays,
        status: 'draft',
        allowedRoles: formData.settings.allowedRoles,
        fields: allFields as any, // Store fields as JSON
        settings: formData.settings as any, // Store complete settings as JSON
        createdBy: userId,
      }
    });

    // Audit log
    await auditFormCreation(savedForm.id, formData.title, formData.settings.containsPHI, userId);

    return NextResponse.json(savedForm);
  } catch (error) {
    console.error('Error creating form:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/forms
 * List all forms
 */
export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await requirePermission(Permission.VIEW_SURVEYS);

    // Fetch forms from database
    const forms = await prisma.form.findMany({
      where: {
        createdBy: userId
      },
      orderBy: {
        createdAt: 'desc'
      },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        containsPHI: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            responses: true
          }
        }
      }
    });

    return NextResponse.json(forms);
  } catch (error) {
    console.error('Error fetching forms:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
