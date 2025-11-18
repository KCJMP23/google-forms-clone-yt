import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { FormBuilderState } from '@/lib/form-builder-types';
import { auditFormCreation } from '@/lib/audit';
import { requirePermission, Permission } from '@/lib/rbac';

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

    // TODO: Save to database (OneEntry or Firestore)
    const savedForm = {
      id: `form-${Date.now()}`,
      ...formData,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'draft',
    };

    // Audit log
    await auditFormCreation(savedForm.id, formData.settings.containsPHI);

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

    // TODO: Fetch from database
    const forms = [];

    return NextResponse.json(forms);
  } catch (error) {
    console.error('Error fetching forms:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
