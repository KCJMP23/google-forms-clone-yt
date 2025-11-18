'use client';

import { FormBuilderCanvas } from '@/components/FormBuilderCanvas';
import { FormBuilderState } from '@/lib/form-builder-types';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function NewFormPage() {
  const router = useRouter();

  const handleSave = async (state: FormBuilderState) => {
    // Save form to database
    try {
      const response = await fetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      });

      if (!response.ok) throw new Error('Failed to save form');

      const data = await response.json();
      return data;
    } catch (error) {
      throw new Error('Failed to save form');
    }
  };

  const handlePreview = (state: FormBuilderState) => {
    // Open preview in new tab
    const previewData = encodeURIComponent(JSON.stringify(state));
    window.open(`/forms/preview?data=${previewData}`, '_blank');
  };

  const handlePublish = async (state: FormBuilderState) => {
    // Publish form
    try {
      const response = await fetch(`/api/forms/${state.formId}/publish`, {
        method: 'POST',
      });

      if (!response.ok) throw new Error('Failed to publish form');

      const data = await response.json();
      router.push(`/dashboard/forms/${data.id}`);
    } catch (error) {
      throw new Error('Failed to publish form');
    }
  };

  return (
    <FormBuilderCanvas
      onSave={handleSave}
      onPreview={handlePreview}
      onPublish={handlePublish}
    />
  );
}
