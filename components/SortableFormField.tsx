'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FormField } from '@/lib/form-builder-types';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Trash2, GripVertical, Lock } from 'lucide-react';
import { PHIIndicator } from './PHIIndicator';
import { detectPHI } from '@/lib/phi-detection';

interface SortableFormFieldProps {
  field: FormField;
  onUpdate: (fieldId: string, updates: Partial<FormField>) => void;
  onDelete: (fieldId: string) => void;
}

export function SortableFormField({ field, onUpdate, onDelete }: SortableFormFieldProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleLabelChange = (newLabel: string) => {
    // Auto-detect PHI when label changes
    const phiDetection = detectPHI(newLabel);
    onUpdate(field.id, {
      label: newLabel,
      isPHI: phiDetection.isPHI,
      phiType: phiDetection.phiType,
      autoDetectedPHI: phiDetection.isPHI,
    });
  };

  return (
    <Card ref={setNodeRef} style={style} className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing mt-2"
        >
          <GripVertical className="w-5 h-5 text-gray-400" />
        </div>

        {/* Field Content */}
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <Input
              value={field.label}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="Field label"
              className="font-medium"
            />
            {field.isPHI && (
              <PHIIndicator
                isPHI={true}
                phiType={field.phiType}
                variant="compact"
                showTooltip={true}
              />
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <Switch
                checked={field.required}
                onCheckedChange={(checked) => onUpdate(field.id, { required: checked })}
              />
              <Label>Required</Label>
            </div>

            <div className="text-gray-500">
              Type: {field.type}
            </div>
          </div>

          {field.placeholder !== undefined && (
            <Input
              value={field.placeholder}
              onChange={(e) => onUpdate(field.id, { placeholder: e.target.value })}
              placeholder="Placeholder text"
              className="text-sm"
            />
          )}

          {field.autoDetectedPHI && (
            <div className="text-xs text-amber-600 bg-amber-50 p-2 rounded flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Auto-detected as PHI - this field will be encrypted
            </div>
          )}
        </div>

        {/* Delete Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(field.id)}
          className="text-red-500 hover:text-red-700"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </Card>
  );
}
