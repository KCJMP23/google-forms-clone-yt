'use client';

/**
 * Visual Form Builder Canvas
 * Drag-and-drop interface for creating HIPAA-compliant forms
 */

import { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { FormBuilderState, FormField, FormSection, FieldType } from '@/lib/form-builder-types';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { SortableFormField } from './SortableFormField';
import { FieldPalette } from './FieldPalette';
import { FormSettingsPanel } from './FormSettingsPanel';
import { Save, Eye, Send } from 'lucide-react';
import { toast } from 'sonner';

interface FormBuilderCanvasProps {
  initialState?: FormBuilderState;
  onSave: (state: FormBuilderState) => Promise<void>;
  onPreview: (state: FormBuilderState) => void;
  onPublish: (state: FormBuilderState) => Promise<void>;
}

export function FormBuilderCanvas({
  initialState,
  onSave,
  onPreview,
  onPublish,
}: FormBuilderCanvasProps) {
  const [formState, setFormState] = useState<FormBuilderState>(
    initialState || {
      title: 'Untitled Form',
      description: '',
      sections: [
        {
          id: 'section-1',
          title: 'Section 1',
          description: '',
          fields: [],
          order: 0,
        },
      ],
      settings: {
        allowAnonymous: true,
        requireConsent: false,
        isPublic: true,
        containsPHI: false,
        dataClassification: 'Anonymous',
        retentionPeriodDays: 2555,
        allowedRoles: [],
        notifyOnSubmission: false,
        notificationEmails: [],
        allowMultipleSubmissions: true,
        enableAutoSave: true,
        showProgressBar: true,
      },
      isDirty: false,
    }
  );

  const [activeSection, setActiveSection] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const currentSection = formState.sections[activeSection];
      const oldIndex = currentSection.fields.findIndex((f) => f.id === active.id);
      const newIndex = currentSection.fields.findIndex((f) => f.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const newFields = arrayMove(currentSection.fields, oldIndex, newIndex);
        updateSection(activeSection, { ...currentSection, fields: newFields });
      }
    }

    setActiveId(null);
  };

  const addField = (fieldType: FieldType) => {
    const newField: FormField = {
      id: `field-${Date.now()}`,
      type: fieldType,
      label: `New ${fieldType} field`,
      required: false,
      isPHI: false,
      order: formState.sections[activeSection].fields.length,
    };

    const currentSection = formState.sections[activeSection];
    updateSection(activeSection, {
      ...currentSection,
      fields: [...currentSection.fields, newField],
    });

    markDirty();
  };

  const updateField = (fieldId: string, updates: Partial<FormField>) => {
    const currentSection = formState.sections[activeSection];
    const updatedFields = currentSection.fields.map((field) =>
      field.id === fieldId ? { ...field, ...updates } : field
    );

    updateSection(activeSection, { ...currentSection, fields: updatedFields });
    markDirty();
  };

  const deleteField = (fieldId: string) => {
    const currentSection = formState.sections[activeSection];
    const updatedFields = currentSection.fields.filter((field) => field.id !== fieldId);

    updateSection(activeSection, { ...currentSection, fields: updatedFields });
    markDirty();
  };

  const updateSection = (index: number, section: FormSection) => {
    const newSections = [...formState.sections];
    newSections[index] = section;
    setFormState({ ...formState, sections: newSections });
  };

  const markDirty = () => {
    setFormState({ ...formState, isDirty: true });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formState);
      setFormState({ ...formState, isDirty: false, lastSaved: new Date() });
      toast.success('Form saved successfully');
    } catch (error) {
      toast.error('Failed to save form');
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (formState.isDirty) {
      toast.error('Please save the form before publishing');
      return;
    }

    try {
      await onPublish(formState);
      toast.success('Form published successfully');
    } catch (error) {
      toast.error('Failed to publish form');
      console.error(error);
    }
  };

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-white p-4 flex items-center justify-between">
        <div className="flex-1">
          <Input
            value={formState.title}
            onChange={(e) => {
              setFormState({ ...formState, title: e.target.value });
              markDirty();
            }}
            className="text-2xl font-bold border-none focus:ring-0 px-0"
            placeholder="Form Title"
          />
          <Input
            value={formState.description}
            onChange={(e) => {
              setFormState({ ...formState, description: e.target.value });
              markDirty();
            }}
            className="text-sm text-gray-500 border-none focus:ring-0 px-0"
            placeholder="Form description"
          />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => onPreview(formState)}>
            <Eye className="w-4 h-4 mr-2" />
            Preview
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !formState.isDirty}>
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          <Button onClick={handlePublish} disabled={formState.isDirty}>
            <Send className="w-4 h-4 mr-2" />
            Publish
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Field Palette */}
        <div className="w-64 border-r bg-gray-50 p-4 overflow-y-auto">
          <FieldPalette onAddField={addField} />
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 overflow-y-auto p-8 bg-gray-100">
          <Card className="max-w-3xl mx-auto bg-white p-8">
            <Tabs value={activeSection.toString()} onValueChange={(v) => setActiveSection(Number(v))}>
              <TabsList>
                {formState.sections.map((section, index) => (
                  <TabsTrigger key={section.id} value={index.toString()}>
                    {section.title}
                  </TabsTrigger>
                ))}
              </TabsList>

              {formState.sections.map((section, index) => (
                <TabsContent key={section.id} value={index.toString()} className="space-y-4">
                  <div>
                    <Label>Section Title</Label>
                    <Input
                      value={section.title}
                      onChange={(e) =>
                        updateSection(index, { ...section, title: e.target.value })
                      }
                    />
                  </div>

                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={section.fields.map((f) => f.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-4">
                        {section.fields.map((field) => (
                          <SortableFormField
                            key={field.id}
                            field={field}
                            onUpdate={updateField}
                            onDelete={deleteField}
                          />
                        ))}
                      </div>
                    </SortableContext>

                    <DragOverlay>
                      {activeId ? (
                        <div className="bg-white p-4 rounded-lg shadow-lg">
                          Dragging field...
                        </div>
                      ) : null}
                    </DragOverlay>
                  </DndContext>

                  {section.fields.length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                      Drag fields from the left panel to start building your form
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </Card>
        </div>

        {/* Right Sidebar - Settings */}
        <div className="w-80 border-l bg-white p-4 overflow-y-auto">
          <FormSettingsPanel
            settings={formState.settings}
            onChange={(settings) => {
              setFormState({ ...formState, settings });
              markDirty();
            }}
          />
        </div>
      </div>
    </div>
  );
}
